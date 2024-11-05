import pkg from 'mongodb';
const { ObjectId } = pkg;

export const CONFIG = {
  FOLDER_PATH: process.env.FOLDER_PATH || '/tmp/files_manager',
  THUMBNAIL_SIZES: ['500', '250', '100'],
  PAGE_SIZE: 20,
  ALLOWED_FILE_TYPES: ['folder', 'file', 'image']
};

export const errorHandler = (res, status, message) => {
  return res.status(status).json({ error: message });
};

export const isValidObjectId = (id) => {
  return id && ObjectId.isValid(id);
};

export const formatFileResponse = (file) => ({
  id: file._id.toString(),
  userId: file.userId.toString(),
  name: file.name,
  type: file.type,
  isPublic: file.isPublic,
  parentId: typeof file.parentId === 'object' ? file.parentId.toString() : file.parentId
});