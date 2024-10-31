import { MongoClient } from 'mongodb';

async function resetDB() {
    const client = new MongoClient('mongodb://localhost:27017/files_manager', {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });

    try {
        await client.connect();
        const db = client.db();
        
        // Clear collections
        await db.collection('users').deleteMany({});
        await db.collection('files').deleteMany({});
        
        // Insert 12 users
        const users = Array.from({ length: 12 }, (_, i) => ({ name: `user${i}` }));
        await db.collection('users').insertMany(users);
        
        // Insert some files
        const files = Array.from({ length: 5 }, (_, i) => ({ name: `file${i}` }));
        await db.collection('files').insertMany(files);
        
        console.log('Database reset complete');
        console.log('Users count:', await db.collection('users').countDocuments());
        console.log('Files count:', await db.collection('files').countDocuments());
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

resetDB();