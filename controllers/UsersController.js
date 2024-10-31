import sha1 from 'sha1';
import dbClient from '../utils/db.js';  // Add .js extension

class UsersController {
  static async postNew(req, res) {
    // Get email and password from request body
    const { email, password } = req.body;

    // Check if email is missing
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Check if password is missing
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    // Check if user already exists
    const existingUser = await dbClient.db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Already exist' });
    }

    // Hash password with SHA1
    const hashedPassword = sha1(password);

    // Create new user
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
}

export default UsersController;