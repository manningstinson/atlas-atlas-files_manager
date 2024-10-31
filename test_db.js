import { MongoClient } from 'mongodb';

async function testConnection() {
  try {
    const client = await MongoClient.connect('mongodb://localhost:27017/files_manager', {
      useUnifiedTopology: true,
      useNewUrlParser: true
    });
    console.log('Connected successfully to MongoDB');
    
    const db = client.db('files_manager');
    
    // Create test documents
    await db.collection('users').insertOne({ name: 'test user' });
    await db.collection('files').insertOne({ name: 'test file' });
    
    const usersCount = await db.collection('users').countDocuments();
    const filesCount = await db.collection('files').countDocuments();
    
    console.log(`Users count: ${usersCount}`);
    console.log(`Files count: ${filesCount}`);
    
    await client.close();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();