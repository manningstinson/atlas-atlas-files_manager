import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import pkg from 'mongodb';
const { ObjectId } = pkg;
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    // Get user from token
    const token = req.header('X-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get request data
    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Validate inputs
    if (!name) return res.status(400).json({ error: 'Missing name' });
    
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check parentId if provided
    if (parentId !== 0) {
      const parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create file document
    const fileDoc = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 ? '0' : ObjectId(parentId)
    };

    // If it's a folder, save and return
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(fileDoc);
      fileDoc.id = result.insertedId;
      delete fileDoc._id;
      return res.status(201).json(fileDoc);
    }

    // Handle file and image types
    // Create directory if it doesn't exist
    if (!fs.existsSync(FOLDER_PATH)) {
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
    }

    // Generate unique filename and save file
    const localPath = `${FOLDER_PATH}/${uuidv4()}`;
    const fileContent = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, fileContent);

    // Add localPath to document
    fileDoc.localPath = localPath;

    // Save to database
    const result = await dbClient.db.collection('files').insertOne(fileDoc);
    fileDoc.id = result.insertedId;
    delete fileDoc._id;
    delete fileDoc.localPath;

    return res.status(201).json(fileDoc);
  }

  static async getShow(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId)
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: typeof file.parentId === 'object' ? file.parentId.toString() : file.parentId
      });
    } catch (error) {
      console.error('Error in getShow:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const parentId = req.query.parentId || '0';
      const page = parseInt(req.query.page) || 0;
      const pageSize = 20;

      const files = await dbClient.db.collection('files')
        .find({ 
          userId: ObjectId(userId),
          parentId: parentId === '0' ? '0' : ObjectId(parentId)
        })
        .skip(page * pageSize)
        .limit(pageSize)
        .toArray();

      // Transform the files array to match the expected format
      const formattedFiles = files.map(file => ({
        id: file._id.toString(),
        userId: file.userId.toString(),
        name: file.name,
        type: file.type,
        isPublic: file.isPublic,
        parentId: typeof file.parentId === 'object' ? file.parentId.toString() : file.parentId
      }));

      return res.status(200).json(formattedFiles);
    } catch (error) {
      console.error('Error in getIndex:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async putPublish(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId)
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: true } }
      );

      const updatedFile = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId)
      });

      return res.status(200).json({
        id: updatedFile._id.toString(),
        userId: updatedFile.userId.toString(),
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: typeof updatedFile.parentId === 'object' ? updatedFile.parentId.toString() : updatedFile.parentId
      });
    } catch (error) {
      console.error('Error in putPublish:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async putUnpublish(req, res) {
    try {
      const token = req.header('X-Token');
      if (!token) return res.status(401).json({ error: 'Unauthorized' });

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId),
        userId: ObjectId(userId)
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      await dbClient.db.collection('files').updateOne(
        { _id: ObjectId(fileId) },
        { $set: { isPublic: false } }
      );

      const updatedFile = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId)
      });

      return res.status(200).json({
        id: updatedFile._id.toString(),
        userId: updatedFile.userId.toString(),
        name: updatedFile.name,
        type: updatedFile.type,
        isPublic: updatedFile.isPublic,
        parentId: typeof updatedFile.parentId === 'object' ? updatedFile.parentId.toString() : updatedFile.parentId
      });
    } catch (error) {
      console.error('Error in putUnpublish:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getFile(req, res) {
    try {
      const fileId = req.params.id;
      const file = await dbClient.db.collection('files').findOne({
        _id: ObjectId(fileId)
      });

      if (!file) return res.status(404).json({ error: 'Not found' });

      if (file.type === 'folder') {
        return res.status(400).json({ error: "A folder doesn't have content" });
      }

      if (!file.isPublic) {
        const token = req.header('X-Token');
        if (!token) return res.status(404).json({ error: 'Not found' });

        const key = `auth_${token}`;
        const userId = await redisClient.get(key);
        if (!userId || userId !== file.userId.toString()) {
          return res.status(404).json({ error: 'Not found' });
        }
      }

      if (!file.localPath || !fs.existsSync(file.localPath)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const mimeType = mime.lookup(file.name) || 'application/octet-stream';
      res.setHeader('Content-Type', mimeType);
      
      const fileContent = fs.readFileSync(file.localPath);
      return res.send(fileContent);
    } catch (error) {
      console.error('Error in getFile:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

export default FilesController;