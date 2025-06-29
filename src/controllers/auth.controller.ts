import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { supabase } from '../lib/supabase';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: 'Email and password are required' });
      }

      const userService = new UserService();
      const data = await userService.login(email, password);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Input validation
      if (!email || !password) {
        res.status(400).json({
          error: 'Email, password, and name are required',
          details: {
            email: !email ? 'Email is required' : null,
            password: !password ? 'Password is required' : null,
          },
        });
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // Password strength validation
      if (password.length < 8) {
        res
          .status(400)
          .json({ error: 'Password must be at least 8 characters long' });
        return;
      }

      try {
        const userService = new UserService();
        const data = await userService.register(email, password);
        res.status(201).json(data);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.toLowerCase().includes('already exists')) {
            res.status(409).json({ error: 'Email already registered' });
            return;
          }
          if (error.message.toLowerCase().includes('invalid')) {
            res.status(400).json({ error: error.message });
            return;
          }
        }

        res.status(500).json({
          error: 'Registration failed',
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred during registration',
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  static async getSession(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userService = new UserService();
      const user = await userService.getSession(token);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Session validation failed' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const userService = new UserService();
      await userService.resetPassword(email);
      res.json({ message: 'Password reset email sent' });
    } catch (error) {
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
}
