import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
import { Request as ExpressRequest } from 'express';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async signup(signupDto: SignupDto) {
    const {
      email,
      password,
      name,
      companyName,
      workspaceUrl,
      industry,
      otherIndustry,
      country,
    } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if workspace URL is already taken
    const existingCompany = await this.prisma.company.findUnique({
      where: { workspaceUrl },
    });

    if (existingCompany) {
      throw new ConflictException('Workspace URL is already taken');
    }

    // Hash password using Better Auth's hashing (compatible with their login)
    const hashedPassword = await hashPassword(password);

    // Use transaction to create company and owner user
    const result = await this.prisma.$transaction(async (tx) => {
      // Create company first (without owner initially)
      const company = await tx.company.create({
        data: {
          name: companyName,
          workspaceUrl,
          industry,
          otherIndustry: industry === 'other' ? otherIndustry : null,
          country,
        },
      });

      // Create owner user with Better Auth fields
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'OWNER',
          companyId: company.id,
          emailVerified: null, // Not verified yet; will be set when user clicks verification link
        },
      });

      // Create Better Auth account entry
      // Better Auth's email/password uses 'credential' as providerId
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: email, // Use email as accountId for credential provider (Better Auth requirement)
          providerId: 'credential', // Better Auth uses 'credential' for email/password
          password: hashedPassword,
        },
      });

      // Update company with real owner ID
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: { ownerId: user.id },
      });

      return { user, company: updatedCompany };
    });

    // Prepare response
    const signupResult = {
      userId: result.user.id,
      role: result.user.role,
      companyId: result.user.companyId,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        companyId: result.user.companyId,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        workspaceUrl: result.company.workspaceUrl,
        industry: result.company.industry,
        country: result.company.country,
      },
    };

    // Send verification email asynchronously (don't block the response)
    this._sendVerificationOtp(result.user).catch((error) => {
      console.error('Failed to send verification OTP:', error);
    });

    return signupResult;
  }

  /**
   * Private method to send verification OTP
   */
  private async _sendVerificationOtp(user: {
    id: string;
    email: string;
    name: string;
  }): Promise<string> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes from now

    // Delete any existing verification tokens for this user
    await this.prisma.authToken.deleteMany({
      where: {
        userId: user.id,
        type: 'EMAIL_VERIFICATION',
      },
    });

    // Store OTP in database
    await this.prisma.authToken.create({
      data: {
        token: otp,
        type: 'EMAIL_VERIFICATION',
        expiresAt,
        userId: user.id,
      },
    });

    // Send email
    await this.emailService.sendOtpEmail(user.email, user.name, otp);

    return otp;
  }

  async validateCredentials(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Fetch user by email with company information
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let isPasswordValid = false;
    let needsPasswordMigration = false;

    // Try Better Auth's verifyPassword first
    try {
      isPasswordValid = await verifyPassword({
        password,
        hash: user.password,
      });
    } catch (error) {
      // If Better Auth verification fails, try bcrypt (legacy passwords)
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
        needsPasswordMigration = isPasswordValid; // If bcrypt works, we need to migrate
      } catch (bcryptError) {
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If password was verified with bcrypt, migrate it to Better Auth format
    if (needsPasswordMigration) {
      const newHashedPassword = await hashPassword(password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: newHashedPassword },
      });
      // Update user object for the account sync below
      user.password = newHashedPassword;
    }

    // Ensure account table is in sync with user table
    // This fixes any legacy accounts that might have different passwords
    const account = await this.prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
    });

    if (account && account.password !== user.password) {
      // Account exists but password is out of sync - update it
      await this.prisma.account.update({
        where: { id: account.id },
        data: { password: user.password },
      });
    } else if (!account) {
      // Account doesn't exist - create it
      await this.prisma.account.create({
        data: {
          userId: user.id,
          accountId: user.email, // Use email as accountId for credential provider (Better Auth requirement)
          providerId: 'credential',
          password: user.password,
        },
      });
    }

    // Return user data for Better Auth session creation
    return {
      userId: user.id,
      role: user.role,
      companyId: user.companyId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        workspaceUrl: user.company.workspaceUrl,
        industry: user.company.industry,
        country: user.company.country,
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        workspaceUrl: user.company.workspaceUrl,
        industry: user.company.industry,
        country: user.company.country,
      },
    };
  }

  async updateUserProfile(
    userId: string,
    updateData: { name?: string; email?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { company: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        workspaceUrl: user.company.workspaceUrl,
        industry: user.company.industry,
        country: user.company.country,
      },
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await verifyPassword({
      password: currentPassword,
      hash: user.password,
    });

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    // Update Better Auth account password
    await this.prisma.account.updateMany({
      where: {
        userId: userId,
        providerId: 'credential', // Better Auth uses 'credential' for email/password
      },
      data: {
        password: hashedNewPassword,
      },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find the token
    const authToken = await this.prisma.authToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!authToken || authToken.type !== 'EMAIL_VERIFICATION') {
      throw new BadRequestException('Invalid verification token');
    }

    // Check if expired
    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('Verification token has expired');
    }

    // Update user's emailVerified field
    await this.prisma.user.update({
      where: { id: authToken.userId },
      data: { emailVerified: new Date() },
    });

    // Delete the token (single-use)
    await this.prisma.authToken.delete({ where: { id: authToken.id } });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request magic link login
   */
  async requestMagicLink(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return {
        message:
          'If an account exists, a magic link has been sent to your email',
      };
    }

    // Set user's password to their email (hashed) to enable Better Auth sign-in
    // This allows magic link to use Better Auth's native session creation
    const magicPassword = await hashPassword(user.email);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: magicPassword },
    });

    // Also update the account record
    await this.prisma.account.updateMany({
      where: { userId: user.id, providerId: 'credential' },
      data: { password: magicPassword },
    });

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    // Store token in database
    await this.prisma.authToken.create({
      data: {
        token,
        type: 'MAGIC_LINK_LOGIN',
        expiresAt,
        userId: user.id,
      },
    });

    // Send email
    await this.emailService.sendMagicLinkEmail(user.email, user.name, token);

    return {
      message: 'If an account exists, a magic link has been sent to your email',
    };
  }

  /**
   * Verify magic link token and return user info for session creation
   */
  async verifyMagicLink(token: string): Promise<{
    id: string;
    email: string;
    name: string;
    role: string;
    companyId: string;
    company: {
      id: string;
      name: string;
      workspaceUrl: string;
      industry: string | null;
      country: string | null;
    };
  }> {
    // Find the token
    const authToken = await this.prisma.authToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!authToken || authToken.type !== 'MAGIC_LINK_LOGIN') {
      throw new BadRequestException('Invalid magic link token');
    }

    // Check if expired
    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('Magic link has expired');
    }

    const user = authToken.user;

    // Delete the token (single-use)
    await this.prisma.authToken.delete({ where: { id: authToken.id } });

    // Return full user info for session creation
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      company: {
        id: user.company.id,
        name: user.company.name,
        workspaceUrl: user.company.workspaceUrl,
        industry: user.company.industry,
        country: user.company.country,
      },
    };
  }

  /**
   * Create a session manually for magic link login (bypass password check)
   * CRITICAL: Better Auth looks up sessions by the token field,
   * and the cookie value MUST match the token in the database
   */
  async createMagicLinkSession(
    userId: string,
    request?: ExpressRequest,
  ): Promise<{
    sessionToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      companyId: string;
      company: any;
    };
  }> {
    const user = await this.getUserById(userId);

    // Generate a secure random token for the session
    // This will be stored in BOTH the database AND the cookie
    const sessionToken = randomBytes(32).toString('hex');

    // Get IP and user agent for session tracking
    const ipAddress = request?.ip || null;
    const userAgent = request?.get('user-agent') || null;

    // Create the session in the database
    // Generate both the raw token and the hashed version
    // Better Auth stores the hashed version in the DB but sends the raw version as cookie
    const { createHash } = await import('crypto');
    const hashedToken = createHash('sha256').update(sessionToken).digest('hex');

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: hashedToken, // Better Auth stores SHA-256 hash of the token
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        companyId: user.companyId,
        role: user.role,
        ipAddress,
        userAgent,
      },
    });

    return {
      sessionToken: session.token,
      user,
    };
  }

  /**
   * Request password reset - send reset link via email
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent user enumeration
    if (!user) {
      return {
        message:
          'If an account exists, a password reset link has been sent to your email',
      };
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    // Store token in database
    await this.prisma.authToken.create({
      data: {
        token,
        type: 'PASSWORD_RESET',
        expiresAt,
        userId: user.id,
      },
    });

    // Send email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.name,
      token,
    );

    return {
      message:
        'If an account exists, a password reset link has been sent to your email',
    };
  }

  /**
   * Verify password reset token and update password
   */
  async verifyPasswordReset(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find the token
    const authToken = await this.prisma.authToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    if (!authToken || authToken.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid password reset token');
    }

    // Check if expired
    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('Password reset link has expired');
    }

    const user = authToken.user;

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Also update the account record
    await this.prisma.account.updateMany({
      where: { userId: user.id, providerId: 'credential' },
      data: { password: hashedPassword },
    });

    // Delete the token (single-use)
    await this.prisma.authToken.delete({ where: { id: authToken.id } });

    return {
      message:
        'Password reset successful. You can now log in with your new password.',
    };
  }

  /**
   * Verify OTP for email verification
   */
  async verifyOtp(
    userId: string,
    otp: string,
  ): Promise<{ message: string; user: any }> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      return {
        message: 'Email already verified',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      };
    }

    // Find the OTP token
    const authToken = await this.prisma.authToken.findFirst({
      where: {
        userId,
        type: 'EMAIL_VERIFICATION',
        token: otp,
      },
    });

    if (!authToken) {
      throw new BadRequestException('Invalid OTP code');
    }

    // Check if expired
    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Update user's emailVerified field
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: new Date() },
    });

    // Delete the token (single-use)
    await this.prisma.authToken.delete({ where: { id: authToken.id } });

    return {
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: new Date(),
        company: {
          id: user.company.id,
          name: user.company.name,
          workspaceUrl: user.company.workspaceUrl,
        },
      },
    };
  }

  /**
   * Accept invitation - validate token and set password
   */
  async acceptInvitation(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    const authToken = await this.prisma.authToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!authToken || authToken.type !== 'INVITATION') {
      throw new BadRequestException('Invalid invitation token');
    }

    if (authToken.expiresAt < new Date()) {
      await this.prisma.authToken.delete({ where: { id: authToken.id } });
      throw new BadRequestException('Invitation link has expired');
    }

    const user = authToken.user;
    const hashedPassword = await hashPassword(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          emailVerified: user.emailVerified ?? new Date(),
          status: 'ACTIVE',
        },
      });

      await tx.account.updateMany({
        where: { userId: user.id, providerId: 'credential' },
        data: { password: hashedPassword },
      });

      await tx.authToken.delete({ where: { id: authToken.id } });
    });

    return {
      message:
        'Account activated successfully. You can now log in with your new password.',
    };
  }

  /**
   * Resend OTP to user
   */
  async resendOtp(userId: string): Promise<{ message: string }> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Send new OTP
    await this._sendVerificationOtp(user);

    return { message: 'OTP sent successfully' };
  }

  /**
   * Update email during signup process (before verification)
   */
  async updateSignupEmail(
    userId: string,
    newEmail: string,
  ): Promise<{ message: string; email: string }> {
    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new BadRequestException(
        'Cannot change email after verification. Please contact support.',
      );
    }

    // Check if new email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Email already in use');
    }

    // Update user email
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { email: newEmail },
    });

    // Update account email
    await this.prisma.account.updateMany({
      where: { userId },
      data: { accountId: newEmail },
    });

    // Delete old OTP tokens
    await this.prisma.authToken.deleteMany({
      where: {
        userId,
        type: 'EMAIL_VERIFICATION',
      },
    });

    // Send new OTP to new email
    await this._sendVerificationOtp(updatedUser);

    return {
      message: 'Email updated successfully. New OTP sent.',
      email: newEmail,
    };
  }
}
