import { supabase, supabaseAdmin } from '../lib/supabase';
import { Database } from '../types/supabase';

type Analysis = Database['public']['Tables']['analyses']['Row'];
type AnalysisInsert = Database['public']['Tables']['analyses']['Insert'];
type AnalysisUpdate = Database['public']['Tables']['analyses']['Update'];

export class AnalysisService {
  async createAnalysis(analysisData: AnalysisInsert): Promise<Analysis> {
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        ...analysisData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAnalysisByPostId(
    postId: string,
    userId: string
  ): Promise<Analysis | null> {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getAnalysisById(
    analysisId: string,
    userId: string
  ): Promise<Analysis | null> {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getUserAnalyses(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'confidence_score';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<Analysis[]> {
    let query = supabase
      .from('analyses')
      .select(
        `
        *,
        posts!inner (
          id,
          platform,
          post_url,
          title,
          author,
          created_at
        )
      `
      )
      .eq('user_id', userId);

    const sortBy = options?.sortBy || 'created_at';
    const sortOrder = options?.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async updateAnalysis(
    analysisId: string,
    userId: string,
    updates: AnalysisUpdate
  ): Promise<Analysis> {
    const { data, error } = await supabase
      .from('analyses')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', analysisId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAnalysis(analysisId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', analysisId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getAnalysisStats(userId: string): Promise<{
    totalAnalyses: number;
    averageConfidence: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
    topKeywords: { keyword: string; count: number }[];
    analysisModels: { model: string; count: number }[];
  }> {
    const { data: analyses, error } = await supabase
      .from('analyses')
      .select(
        'sentiment_positive, sentiment_negative, sentiment_neutral, confidence_score, keywords, analysis_model'
      )
      .eq('user_id', userId);

    if (error) throw error;

    const totalAnalyses = analyses?.length || 0;

    if (totalAnalyses === 0) {
      return {
        totalAnalyses: 0,
        averageConfidence: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        topKeywords: [],
        analysisModels: [],
      };
    }

    // Calculate average confidence
    const validConfidences =
      analyses
        ?.filter((a) => a.confidence_score !== null)
        .map((a) => a.confidence_score!) || [];
    const averageConfidence =
      validConfidences.length > 0
        ? validConfidences.reduce((sum, score) => sum + score, 0) /
          validConfidences.length
        : 0;

    // Calculate sentiment distribution
    const sentimentTotals = analyses?.reduce(
      (acc, analysis) => ({
        positive: acc.positive + analysis.sentiment_positive,
        negative: acc.negative + analysis.sentiment_negative,
        neutral: acc.neutral + analysis.sentiment_neutral,
      }),
      { positive: 0, negative: 0, neutral: 0 }
    ) || { positive: 0, negative: 0, neutral: 0 };

    const sentimentSum =
      sentimentTotals.positive +
      sentimentTotals.negative +
      sentimentTotals.neutral;
    const sentimentDistribution = {
      positive:
        sentimentSum > 0 ? (sentimentTotals.positive / sentimentSum) * 100 : 0,
      negative:
        sentimentSum > 0 ? (sentimentTotals.negative / sentimentSum) * 100 : 0,
      neutral:
        sentimentSum > 0 ? (sentimentTotals.neutral / sentimentSum) * 100 : 0,
    };

    // Calculate top keywords
    const keywordCounts = new Map<string, number>();
    analyses?.forEach((analysis) => {
      analysis.keywords?.forEach((keyword: any) => {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      });
    });

    const topKeywords = Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 keywords

    // Calculate analysis models distribution
    const modelCounts = new Map<string, number>();
    analyses?.forEach((analysis) => {
      if (analysis.analysis_model) {
        modelCounts.set(
          analysis.analysis_model,
          (modelCounts.get(analysis.analysis_model) || 0) + 1
        );
      }
    });

    const analysisModels = Array.from(modelCounts.entries())
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAnalyses,
      averageConfidence: Math.round(averageConfidence * 100) / 100, // Round to 2 decimal places
      sentimentDistribution: {
        positive: Math.round(sentimentDistribution.positive * 100) / 100,
        negative: Math.round(sentimentDistribution.negative * 100) / 100,
        neutral: Math.round(sentimentDistribution.neutral * 100) / 100,
      },
      topKeywords,
      analysisModels,
    };
  }

  // Additional utility methods for your sentiment analysis platform

  async getAnalysesByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Analysis[]> {
    const { data, error } = await supabase
      .from('analyses')
      .select(
        `
        *,
        posts!inner (
          id,
          platform,
          post_url,
          title,
          author,
          created_at
        )
      `
      )
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAnalysesByPlatform(
    userId: string,
    platform: string
  ): Promise<Analysis[]> {
    const { data, error } = await supabase
      .from('analyses')
      .select(
        `
        *,
        posts!inner (
          id,
          platform,
          post_url,
          title,
          author,
          created_at
        )
      `
      )
      .eq('user_id', userId)
      .eq('posts.platform', platform)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getAnalysesBySentiment(
    userId: string,
    dominantSentiment: 'positive' | 'negative' | 'neutral'
  ): Promise<Analysis[]> {
    const { data, error } = await supabase
      .from('analyses')
      .select(
        `
        *,
        posts!inner (
          id,
          platform,
          post_url,
          title,
          author,
          created_at
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by dominant sentiment on the client side
    const filteredData =
      data?.filter((analysis) => {
        const { sentiment_positive, sentiment_negative, sentiment_neutral } =
          analysis;
        const max = Math.max(
          sentiment_positive,
          sentiment_negative,
          sentiment_neutral
        );

        switch (dominantSentiment) {
          case 'positive':
            return sentiment_positive === max;
          case 'negative':
            return sentiment_negative === max;
          case 'neutral':
            return sentiment_neutral === max;
          default:
            return false;
        }
      }) || [];

    return filteredData;
  }

  async bulkDeleteAnalyses(
    userId: string,
    analysisIds: string[]
  ): Promise<void> {
    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('user_id', userId)
      .in('id', analysisIds);

    if (error) throw error;
  }

  async searchAnalysesByKeyword(
    userId: string,
    keyword: string
  ): Promise<Analysis[]> {
    const { data, error } = await supabase
      .from('analyses')
      .select(
        `
        *,
        posts!inner (
          id,
          platform,
          post_url,
          title,
          author,
          created_at
        )
      `
      )
      .eq('user_id', userId)
      .contains('keywords', [keyword])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
