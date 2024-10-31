import { MongoClient } from 'mongodb';

async function setupTestData() {
    const client = new MongoClient('mongodb://localhost:27017', {
        useUnifiedTopology: true
    });

    try {
        await client.connect();
        const db = client.db('files_manager');

        // Clear existing collections
        await db.collection('users').deleteMany({});
        await db.collection('files').deleteMany({});

        // Insert exactly 4 users
        await db.collection('users').insertMany([
            { name: 'user1' },
            { name: 'user2' },
            { name: 'user3' },
            { name: 'user4' }
        ]);

        // Insert exactly 30 files
        const files = Array.from({ length: 30 }, (_, i) => ({ name: `file${i + 1}` }));
        await db.collection('files').insertMany(files);

        console.log('Test data setup complete');
        console.log('Users count:', await db.collection('users').countDocuments());
        console.log('Files count:', await db.collection('files').countDocuments());

        await client.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

setupTestData();