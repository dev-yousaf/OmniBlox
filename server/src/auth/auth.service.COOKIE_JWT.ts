import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto, res: Response) {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

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

      // Create owner user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'OWNER',
          companyId: company.id,
        },
      });

      // Update company with real owner ID
      const updatedCompany = await tx.company.update({
        where: { id: company.id },
        data: { ownerId: user.id },
      });

      return { user, company: updatedCompany };
    });

    // Set JWT tokens as HTTP-only cookies
    return this.buildAuthResponse(result.user, result.company, res);
  }

  async login(loginDto: LoginDto, res: Response) {
    const { email, password } = loginDto;

    // Fetch user by email with company information
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password as string,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Set JWT tokens as HTTP-only cookies
    return this.buildAuthResponse(user, user.company, res);
  }

  async logout(req: Request, res: Response) {
    // Clear the HTTP-only cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string) {
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

  async refreshToken(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ||
          process.env.JWT_SECRET ||
          'your-secret-key-change-in-production',
      });

      const user = await this.validateUser(payload.sub);
      return this.buildAuthResponse(user, user.company, res);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(userId: string) {
    return this.validateUser(userId);
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

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password updated successfully' };
  }

  private buildAuthResponse(user: any, company: any, res: Response) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      workspaceUrl: company.workspaceUrl,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      expiresIn: (process.env.JWT_EXPIRES_IN as any) || '15m',
    } as JwtSignOptions);

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        process.env.JWT_REFRESH_SECRET ||
        process.env.JWT_SECRET ||
        'your-secret-key-change-in-production',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as any) || '7d',
    } as JwtSignOptions);

    // Set tokens as HTTP-only cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return user and company data (no tokens in response!)
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: company.id,
        name: company.name,
        workspaceUrl: company.workspaceUrl,
        industry: company.industry,
        country: company.country,
      },
    };
  }
}
