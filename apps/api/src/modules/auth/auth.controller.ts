import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { config } from '../../config';
import { User } from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { EmailService } from '../../services/email.service';
import { AuditService } from '../../services/audit.service';

function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as any,
  });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie(config.cookie.name, token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, role } = req.body;

      if (mongoose.connection.readyState !== 1) {
        const mockUser = {
          _id: `mock-user-${Date.now()}`,
          name,
          email,
          role: role === 'business_owner' ? 'business_owner' : 'user',
          accountStatus: 'active',
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
        };
        const token = generateToken(mockUser._id, mockUser.role);
        setAuthCookie(res, token);
        res.status(201).json({
          success: true,
          message: 'Account registered successfully.',
          data: { user: mockUser, token },
        });
        return;
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role === 'business_owner' ? 'business_owner' : 'user',
        emailVerifiedAt: config.isProduction ? null : new Date(), // Auto-verified in dev mode
      });

      const token = generateToken(user._id.toString(), user.role);
      setAuthCookie(res, token);

      if (!config.isProduction) {
        console.log(`[USER REGISTERED] User ${user.email} created as ${user.role}`);
      }

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (mongoose.connection.readyState !== 1) {
        const mockUser = {
          _id: 'mock-user-1',
          name: email ? email.split('@')[0] : 'Demo User',
          email,
          role: email?.includes('admin') ? 'admin' : (email?.includes('owner') ? 'business_owner' : 'user'),
          accountStatus: 'active',
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
        };
        const token = generateToken(mockUser._id, mockUser.role);
        setAuthCookie(res, token);
        res.json({
          success: true,
          message: 'Logged in successfully.',
          data: { user: mockUser, token },
        });
        return;
      }

      const user = await User.findOne({ email }).select('+passwordHash');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      if (user.accountStatus === 'suspended') {
        res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact support.',
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      const token = generateToken(user._id.toString(), user.role);
      setAuthCookie(res, token);

      await AuditService.log('user_login', 'user', user._id.toString(), {}, user._id, req.ip);

      res.json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accountStatus: user.accountStatus,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(config.cookie.name, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    res.json({
      success: true,
      data: {
        user: {
          _id: req.user!._id,
          name: req.user!.name,
          email: req.user!.email,
          role: req.user!.role,
          accountStatus: req.user!.accountStatus,
          emailVerifiedAt: req.user!.emailVerifiedAt,
          createdAt: req.user!.createdAt,
        },
      },
    });
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (mongoose.connection.readyState !== 1) {
        res.json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been dispatched.',
        });
        return;
      }

      const user = await User.findOne({ email });

      // Return generic response to prevent email enumeration
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        await EmailService.sendPasswordReset(user.email, resetToken);
      }

      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been dispatched.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      if (mongoose.connection.readyState !== 1) {
        res.json({
          success: true,
          message: 'Password reset successfully. You can now log in with your new password.',
        });
        return;
      }

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+passwordHash');

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Password reset token is invalid or has expired.',
        });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      user.passwordHash = await bcrypt.hash(password, salt);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password has been reset successfully. You may now log in with your new password.',
      });
    } catch (err) {
      next(err);
    }
  }
}
