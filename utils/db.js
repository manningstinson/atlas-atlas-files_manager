import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    
    const url = `mongodb://${host}:${port}`;
    
    this.client = new MongoClient(url, { 
      useUnifiedTopology: true,
      useNewUrlParser: true 
    });
    
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
      })
      .catch((error) => {
        console.error('MongoDB connection error:', error);
        this.db = null;
      });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    try {
      const users = await this.db.collection('users').countDocuments();
      return users;
    } catch (error) {
      return 0;
    }
  }

  async nbFiles() {
    try {
      const files = await this.db.collection('files').countDocuments();
      return files;
    } catch (error) {
      return 0;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;