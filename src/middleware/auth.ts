import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { ApiError } from './error';

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('No token provided', 401);
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      throw new ApiError('Invalid token', 401);
    }

    // Get user profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new ApiError('User profile not found', 404);
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile.role || 'user',
    };

    next();
  } catch (error) {
    next(error);
  }
};
