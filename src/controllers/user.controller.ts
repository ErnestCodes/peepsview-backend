import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  private async getUserFromToken(req: Request): Promise<any> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError('Unauthorized', 401);
    }

    try {
      const user = await this.userService.getSession(token);
      if (!user) {
        throw new ApiError('Invalid session', 401);
      }
      return user;
    } catch (error) {
      throw new ApiError('Invalid session', 401);
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { name, email } = req.body;

      const result = await this.userService.updateProfile(user.id, {
        name,
        email,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update profile', 500);
    }
  }

  async updatePassword(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new ApiError('Current and new passwords are required', 400);
      }

      await this.userService.updatePassword(
        user.id,
        currentPassword,
        newPassword
      );
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update password', 500);
    }
  }

  async getApiKeys(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const apiKeys = await this.userService.getApiKeys(user.id);
      res.json({ apiKeys });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch API keys', 500);
    }
  }

  async createApiKey(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { name } = req.body;
      if (!name) {
        throw new ApiError('API key name is required', 400);
      }

      const apiKey = await this.userService.generateApiKey(user.id, name);
      res.status(201).json(apiKey);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create API key', 500);
    }
  }

  async deleteApiKey(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { keyId } = req.params;
      if (!keyId) {
        throw new ApiError('API key ID is required', 400);
      }

      await this.userService.deleteApiKey(user.id, keyId);
      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete API key', 500);
    }
  }
}
