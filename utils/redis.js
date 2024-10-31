import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient({
      url: 'redis://localhost:6379',
      legacyMode: true
    });

    this.client.connect().catch(console.error);
    
    this.client.on('error', (error) => {
      console.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });
  }

  isAlive() {
    return this.client.isOpen;  // Changed from connected to isOpen
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    return getAsync(key);
  }

  async set(key, value, duration) {
    const setAsync = promisify(this.client.setex).bind(this.client);
    return setAsync(key, duration, value);
  }

  async del(key) {
    const delAsync = promisify(this.client.del).bind(this.client);
    return delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;