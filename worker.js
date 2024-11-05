import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import pkg from 'mongodb';
const { ObjectId } = pkg;
import dbClient from './utils/db.js';

const fileQueue = new Queue('fileQueue');

const generateThumbnail = async (path, width) => {
  try {
    const thumbnail = await imageThumbnail(path, { width });
    const thumbnailPath = `${path}_${width}`;
    await fs.promises.writeFile(thumbnailPath, thumbnail);
  } catch (error) {
    console.error(`Error generating thumbnail: ${error}`);
  }
};

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;
  
  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const file = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId)
  });

  if (!file) {
    throw new Error('File not found');
  }

  const sizes = [500, 250, 100];
  await Promise.all(
    sizes.map(size => generateThumbnail(file.localPath, size))
  );
});

export default fileQueue;