import pkg from 'mongodb';
const { ObjectId } = pkg;
import sha1 from 'sha1';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class UsersController {
  static async postNew(req, res) {
    // Extract email and password from request body
    const { email, password } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Check if password is provided
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if user already exists
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash password and create new user
    const hashedPassword = sha1(password);
    
    try {
      const result = await dbClient.db.collection('users').insertOne({
        email,
        password: hashedPassword,
      });

      // Return new user with email and id
      return res.status(201).json({
        id: result.insertedId.toString(),
        email,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error creating user' });
    }
  }

  static async getMe(req, res) {
    // Get token from header
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user ID from Redis using token
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user from database
    const user = await dbClient.db.collection('users').findOne({
      _id: ObjectId(userId),
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Return user info
    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default UsersController;