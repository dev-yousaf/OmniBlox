import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Your OTP Code - NexHub',
      text: `Hello ${name},\n\nYour OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nNexHub Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; color: #555;">Your OTP code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Best regards,<br>NexHub Team</p>
        </div>
      `,
    });
  }

  async sendMagicLinkEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/login/magic?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: 'Your Magic Login Link - NexHub',
      text: `Hello ${name},\n\nClick the link below to log in:\n\n${loginLink}\n\nThis link will expire in 15 minutes.\n\nBest regards,\nNexHub Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; color: #555;">Click the button below to log in to your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Log In Now</a>
          </div>
          <p style="font-size: 14px; color: #666;">This link will expire in 15 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Best regards,<br>NexHub Team</p>
        </div>
      `,
    });
  }

  async sendInvitationEmail(
    to: string,
    name: string,
    token: string,
    invitedByName: string,
    companyName: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/accept-invitation?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: `You've been invited to ${companyName} - NexHub`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; color: #555;">${invitedByName} has invited you to join <strong>${companyName}</strong> on NexHub.</p>
          <p style="font-size: 16px; color: #555;">Click the button below to set up your account and get started:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Accept Invitation</a>
          </div>
          <p style="font-size: 14px; color: #666;">This invitation link will expire in 48 hours.</p>
          <p style="font-size: 14px; color: #666;">If you weren't expecting this invitation, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Best regards,<br>NexHub Team</p>
        </div>
      `,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to,
      subject: 'Reset Your Password - NexHub',
      text: `Hello ${name},\n\nClick the link below to reset your password:\n\n${resetLink}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nNexHub Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #666;">This link will expire in 15 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">Best regards,<br>NexHub Team</p>
        </div>
      `,
    });
  }
}
