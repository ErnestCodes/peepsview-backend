import { Request, Response } from 'express';
import { ApiError } from '../middleware/error';
import { AnalysisService } from '../services/analysis.service';
import { UserService } from '../services/user.service';
import { Database } from '../types/supabase';

type AnalysisInsert = Database['public']['Tables']['analyses']['Insert'];

export class AnalysisController {
  private analysisService: AnalysisService;
  private userService: UserService;

  constructor() {
    this.analysisService = new AnalysisService();
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

  async createAnalysis(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const {
        post_id,
        sentiment_positive,
        sentiment_negative,
        sentiment_neutral,
        keywords,
        key_questions,
        summary_overview,
        summary_positive,
        summary_negative,
        summary_neutral,
        suggestions,
        analysis_model,
        confidence_score,
        processing_time_ms,
      } = req.body;

      if (
        !post_id ||
        sentiment_positive === undefined ||
        sentiment_negative === undefined ||
        sentiment_neutral === undefined
      ) {
        throw new ApiError('Post ID and sentiment scores are required', 400);
      }

      // Validate sentiment scores sum to approximately 1
      const sentimentSum =
        sentiment_positive + sentiment_negative + sentiment_neutral;
      if (Math.abs(sentimentSum - 1) > 0.01) {
        throw new ApiError('Sentiment scores must sum to 1', 400);
      }

      const analysisData: AnalysisInsert = {
        post_id,
        user_id: user.id,
        sentiment_positive,
        sentiment_negative,
        sentiment_neutral,
        keywords: keywords || [],
        key_questions: key_questions || [],
        summary_overview: summary_overview || '',
        summary_positive: summary_positive || '',
        summary_negative: summary_negative || '',
        summary_neutral: summary_neutral || '',
        suggestions: suggestions || [],
        analysis_model: analysis_model || 'default',
        confidence_score,
        processing_time_ms,
      };

      const analysis = await this.analysisService.createAnalysis(analysisData);
      res.status(201).json(analysis);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create analysis', 500);
    }
  }

  async getAnalysisByPostId(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { postId } = req.params;

      if (!postId) {
        throw new ApiError('Post ID is required', 400);
      }

      const analysis = await this.analysisService.getAnalysisByPostId(
        postId,
        user.id
      );
      if (!analysis) {
        throw new ApiError('Analysis not found for this post', 404);
      }

      res.json(analysis);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analysis', 500);
    }
  }

  async getAnalysis(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { analysisId } = req.params;

      if (!analysisId) {
        throw new ApiError('Analysis ID is required', 400);
      }

      const analysis = await this.analysisService.getAnalysisById(
        analysisId,
        user.id
      );
      if (!analysis) {
        throw new ApiError('Analysis not found', 404);
      }

      res.json(analysis);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analysis', 500);
    }
  }

  async getAnalyses(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const {
        limit = 20,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'desc',
      } = req.query;

      const parsedLimit = parseInt(limit as string);
      const parsedOffset = parseInt(offset as string);

      if (parsedLimit > 100) {
        throw new ApiError('Limit cannot exceed 100', 400);
      }

      const options = {
        limit: parsedLimit,
        offset: parsedOffset,
        sortBy: sortBy as 'created_at' | 'confidence_score',
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const analyses = await this.analysisService.getUserAnalyses(
        user.id,
        options
      );
      res.json({
        analyses,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          total: analyses.length,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analyses', 500);
    }
  }

  async updateAnalysis(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { analysisId } = req.params;
      const updates = req.body;

      if (!analysisId) {
        throw new ApiError('Analysis ID is required', 400);
      }

      // Validate sentiment scores if provided
      if (
        updates.sentiment_positive !== undefined ||
        updates.sentiment_negative !== undefined ||
        updates.sentiment_neutral !== undefined
      ) {
        const pos = updates.sentiment_positive ?? 0;
        const neg = updates.sentiment_negative ?? 0;
        const neu = updates.sentiment_neutral ?? 0;
        const sentimentSum = pos + neg + neu;

        if (Math.abs(sentimentSum - 1) > 0.01) {
          throw new ApiError('Sentiment scores must sum to 1', 400);
        }
      }

      const analysis = await this.analysisService.updateAnalysis(
        analysisId,
        user.id,
        updates
      );
      res.json(analysis);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to update analysis', 500);
    }
  }

  async deleteAnalysis(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { analysisId } = req.params;

      if (!analysisId) {
        throw new ApiError('Analysis ID is required', 400);
      }

      await this.analysisService.deleteAnalysis(analysisId, user.id);
      res.json({ message: 'Analysis deleted successfully' });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to delete analysis', 500);
    }
  }

  async getAnalysisStats(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const stats = await this.analysisService.getAnalysisStats(user.id);
      res.json(stats);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analysis statistics', 500);
    }
  }

  async getAnalysesByDateRange(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw new ApiError('Start date and end date are required', 400);
      }

      const analyses = await this.analysisService.getAnalysesByDateRange(
        user.id,
        startDate as string,
        endDate as string
      );

      res.json({
        analyses,
        dateRange: { startDate, endDate },
        count: analyses.length,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analyses by date range', 500);
    }
  }

  async getAnalysesByPlatform(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { platform } = req.params;

      if (!platform) {
        throw new ApiError('Platform is required', 400);
      }

      const validPlatforms = [
        'youtube',
        'instagram',
        'twitter',
        'facebook',
        'tiktok',
        'linkedin',
        'url',
      ];
      if (!validPlatforms.includes(platform)) {
        throw new ApiError('Invalid platform', 400);
      }

      const analyses = await this.analysisService.getAnalysesByPlatform(
        user.id,
        platform
      );
      res.json({
        analyses,
        platform,
        count: analyses.length,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analyses by platform', 500);
    }
  }

  async getAnalysesBySentiment(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { sentiment } = req.params;

      if (!sentiment) {
        throw new ApiError('Sentiment is required', 400);
      }

      const validSentiments = ['positive', 'negative', 'neutral'];
      if (!validSentiments.includes(sentiment)) {
        throw new ApiError(
          'Invalid sentiment. Must be positive, negative, or neutral',
          400
        );
      }

      const analyses = await this.analysisService.getAnalysesBySentiment(
        user.id,
        sentiment as 'positive' | 'negative' | 'neutral'
      );

      res.json({
        analyses,
        sentiment,
        count: analyses.length,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to fetch analyses by sentiment', 500);
    }
  }

  async searchAnalysesByKeyword(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { keyword } = req.query;

      if (
        !keyword ||
        typeof keyword !== 'string' ||
        keyword.trim().length === 0
      ) {
        throw new ApiError('Valid keyword is required', 400);
      }

      const analyses = await this.analysisService.searchAnalysesByKeyword(
        user.id,
        keyword.trim()
      );

      res.json({
        analyses,
        keyword: keyword.trim(),
        count: analyses.length,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to search analyses by keyword', 500);
    }
  }

  async bulkDeleteAnalyses(req: Request, res: Response) {
    try {
      const user = await this.getUserFromToken(req);
      const { analysisIds } = req.body;

      if (
        !analysisIds ||
        !Array.isArray(analysisIds) ||
        analysisIds.length === 0
      ) {
        throw new ApiError('Analysis IDs array is required', 400);
      }

      if (analysisIds.length > 50) {
        throw new ApiError('Cannot delete more than 50 analyses at once', 400);
      }

      // Validate all IDs are UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = analysisIds.filter((id) => !uuidRegex.test(id));
      if (invalidIds.length > 0) {
        throw new ApiError('Invalid analysis ID format', 400);
      }

      await this.analysisService.bulkDeleteAnalyses(user.id, analysisIds);
      res.json({
        message: `${analysisIds.length} analyses deleted successfully`,
        deletedCount: analysisIds.length,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to bulk delete analyses', 500);
    }
  }
}
