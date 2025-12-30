import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';
export class NodemailerEmailService {
    transporter;
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: {
                user: config.email.user,
                pass: config.email.pass,
            },
        });
        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                logger.error('Email service configuration error', { error });
            }
            else {
                logger.info('Email service is ready');
            }
        });
    }
    async sendVerificationEmail(email, token) {
        const verificationUrl = `${config.frontendUrl}/auth/verify-email?token=${token}`;
        const mailOptions = {
            from: `"${config.email.fromName}" <${config.email.from}>`,
            to: email,
            subject: 'Verify Your Email Address - AI Interview Platform',
            html: this.generateVerificationEmailTemplate(verificationUrl),
            text: `Please verify your email address by clicking the following link: ${verificationUrl}`,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            logger.info('Verification email sent', { email });
        }
        catch (error) {
            logger.error('Failed to send verification email', { email, error });
            throw new Error('Failed to send verification email');
        }
    }
    async sendPasswordResetEmail(email, token) {
        const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${token}`;
        const mailOptions = {
            from: `"${config.email.fromName}" <${config.email.from}>`,
            to: email,
            subject: 'Reset Your Password - AI Interview Platform',
            html: this.generatePasswordResetEmailTemplate(resetUrl),
            text: `Reset your password by clicking the following link: ${resetUrl}`,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            logger.info('Password reset email sent', { email });
        }
        catch (error) {
            logger.error('Failed to send password reset email', { email, error });
            throw new Error('Failed to send password reset email');
        }
    }
    async sendMagicLinkEmail(email, token) {
        const magicLinkUrl = `${config.frontendUrl}/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}`;
        const mailOptions = {
            from: `"${config.email.fromName}" <${config.email.from}>`,
            to: email,
            subject: 'Your Magic Link - AI Interview Platform',
            html: this.generateMagicLinkEmailTemplate(magicLinkUrl),
            text: `Sign in to your account by clicking the following link: ${magicLinkUrl}`,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            logger.info('Magic link email sent', { email });
        }
        catch (error) {
            logger.error('Failed to send magic link email', { email, error });
            throw new Error('Failed to send magic link email');
        }
    }
    generateVerificationEmailTemplate(verificationUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #4f46e5; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Interview Platform</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Thank you for signing up for AI Interview Platform! To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Interview Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    generatePasswordResetEmailTemplate(resetUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #dc2626; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Interview Platform</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
            <p>This password reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Interview Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
    generateMagicLinkEmailTemplate(magicLinkUrl) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Magic Link</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #059669; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AI Interview Platform</h1>
          </div>
          <div class="content">
            <h2>Your Magic Link</h2>
            <p>Click the button below to sign in to your AI Interview Platform account:</p>
            <div style="text-align: center;">
              <a href="${magicLinkUrl}" class="button">Sign In</a>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #059669;">${magicLinkUrl}</p>
            <p>This magic link will expire in 15 minutes for security reasons.</p>
            <p>If you didn't request this magic link, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Interview Platform. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
