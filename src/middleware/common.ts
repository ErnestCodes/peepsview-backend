import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: REDIS_URL });

// Redis connection
(async () => {
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
})();

// Request logging middleware
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Log request details
  console.log('\n-------------------');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Log response details
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Duration: ${duration}ms`);
    console.log('-------------------\n');
  });

  next();
};

// Cache middleware
export const checkCache = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.path + JSON.stringify(req.query);
    const data = await redisClient.get(key);
    if (data) {
      res.json(JSON.parse(data));
      return;
    }
    next();
  } catch (err) {
    console.error('Cache error:', err);
    next();
  }
};

export const redisSetCache = async (
  key: string,
  data: any,
  expirationInSeconds: number = 3600
) => {
  await redisClient.setEx(key, expirationInSeconds, JSON.stringify(data));
};
