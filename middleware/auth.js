import { errorHandler } from '../utils/helpers.js';
import redisClient from '../utils/redis.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.header('X-Token');
  if (!token) return errorHandler(res, 401, 'Unauthorized');

  const key = `auth_${token}`;
  const userId = await redisClient.get(key);
  if (!userId) return errorHandler(res, 401, 'Unauthorized');

  req.userId = userId;
  next();
};