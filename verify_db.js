import { MongoClient } from 'mongodb';

async function verifyDB() {
  const client = new MongoClient('mongodb://localhost:27017', {
    useUnifiedTopology: true,
    useNewUrlParser: true
  });

  try {
    await client.connect();
    const db = client.db('files_manager');
    
    // Clear existing data
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    
    // Insert test data
    await db.collection('users').insertOne({ name: 'test user' });
    await db.collection('files').insertOne({ name: 'test file' });
    
    console.log('Database reset with test data');
    
    const usersCount = await db.collection('users').countDocuments();
    const filesCount = await db.collection('files').countDocuments();
    
    console.log(`Users count: ${usersCount}`);
    console.log(`Files count: ${filesCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

verifyDB();