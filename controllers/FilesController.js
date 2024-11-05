import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import Queue from 'bull';
import pkg from 'mongodb';
const { ObjectId } = pkg;
import redisClient from '../utils/redis.js';
import dbClient from '../utils/db.js';
import { CONFIG, errorHandler, isValidObjectId, formatFileResponse } from '../utils/helpers.js';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async validateParent(parentId, res) {
    if (parentId === 0 || parentId === '0') return true;

    if (!isValidObjectId(parentId)) {
      return errorHandler(res, 400, 'Parent not found');
    }

    const parentFile = await dbClient.db.collection('files')
      .findOne({ _id: ObjectId(parentId) });

    if (!parentFile) {
      return errorHandler(res, 400, 'Parent not found');
    }

    if (parentFile.type !== 'folder') {
      return errorHandler(res, 400, 'Parent is not a folder');
    }

    return true;
  }

  static async handleFileUpload(type, data, localPath) {
    if (type === 'folder') return true;

    if (!fs.existsSync(CONFIG.FOLDER_PATH)) {
      fs.mkdirSync(CONFIG.FOLDER_PATH, { recursive: true });
    }

    const fileContent = Buffer.from(data, 'base64');
    await fs.promises.writeFile(localPath, fileContent);
    return true;
  }

  static async postUpload(req, res) {
    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    // Validate inputs
    if (!name) return errorHandler(res, 400, 'Missing name');
    if (!type || !CONFIG.ALLOWED_FILE_TYPES.includes(type)) {
      return errorHandler(res, 400, 'Missing type');
    }
    if (!data && type !== 'folder') {
      return errorHandler(res, 400, 'Missing data');
    }

    // Validate parent
    const parentValidation = await FilesController.validateParent(parentId, res);
    if (parentValidation !== true) return parentValidation;

    // Create file document
    const fileDoc = {
      userId: ObjectId(req.userId),
      name,
      type,
      isPublic,
      parentId: parentId === 0 || parentId === '0' ? '0' : ObjectId(parentId)
    };

    // Handle file upload
    const localPath = `${CONFIG.FOLDER_PATH}/${uuidv4()}`;
    await FilesController.handleFileUpload(type, data, localPath);
    if (type !== 'folder') fileDoc.localPath = localPath;

    // Save to database
    const result = await dbClient.db.collection('files').insertOne(fileDoc);
    fileDoc.id = result.insertedId;
    delete fileDoc._id;
    delete fileDoc.localPath;

    // Queue thumbnail generation for images
    if (type === 'image') {
      await fileQueue.add({
        userId: req.userId,
        fileId: result.insertedId.toString()
      });
    }

    return res.status(201).json(fileDoc);
  }

  static async getShow(req, res) {
    const fileId = req.params.id;
    if (!isValidObjectId(fileId)) {
      return errorHandler(res, 404, 'Not found');
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(req.userId)
    });

    if (!file) return errorHandler(res, 404, 'Not found');
    return res.status(200).json(formatFileResponse(file));
  }

  static async getIndex(req, res) {
    const { parentId = '0', page = 0 } = req.query;
    const pageNum = parseInt(page);

    const query = {
      userId: ObjectId(req.userId),
      parentId: parentId === '0' ? '0' : ObjectId(parentId)
    };

    const files = await dbClient.db.collection('files')
      .find(query)
      .skip(pageNum * CONFIG.PAGE_SIZE)
      .limit(CONFIG.PAGE_SIZE)
      .toArray();

    return res.status(200).json(files.map(formatFileResponse));
  }

  static async updatePublishStatus(req, res, isPublic) {
    const fileId = req.params.id;
    if (!isValidObjectId(fileId)) {
      return errorHandler(res, 404, 'Not found');
    }

    const file = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(fileId), userId: ObjectId(req.userId) },
      { $set: { isPublic } },
      { returnDocument: 'after' }
    );

    if (!file.value) return errorHandler(res, 404, 'Not found');
    return res.status(200).json(formatFileResponse(file.value));
  }

  static async putPublish(req, res) {
    return FilesController.updatePublishStatus(req, res, true);
  }

  static async putUnpublish(req, res) {
    return FilesController.updatePublishStatus(req, res, false);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { size } = req.query;

    if (!isValidObjectId(id)) {
      return errorHandler(res, 404, 'Not found');
    }

    const file = await dbClient.db.collection('files').findOne({
      _id: ObjectId(id)
    });

    if (!file) return errorHandler(res, 404, 'Not found');
    if (file.type === 'folder') {
      return errorHandler(res, 400, "A folder doesn't have content");
    }

    if (!file.isPublic) {
      const token = req.header('X-Token');
      if (!token) return errorHandler(res, 404, 'Not found');

      const key = `auth_${token}`;
      const userId = await redisClient.get(key);
      if (!userId || userId !== file.userId.toString()) {
        return errorHandler(res, 404, 'Not found');
      }
    }

    let filePath = file.localPath;
    if (size) {
      if (!CONFIG.THUMBNAIL_SIZES.includes(size)) {
        return errorHandler(res, 400, 'Invalid size');
      }
      filePath = `${file.localPath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return errorHandler(res, 404, 'Not found');
    }

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    
    return res.sendFile(filePath);
  }
}

export default FilesController;