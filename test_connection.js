import dbClient from './utils/db.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testConnection() {
  // Wait for connection to be established
  await wait(2000);
  
  console.log('Connection status:', dbClient.isAlive());
  
  const usersCount = await dbClient.nbUsers();
  console.log('Users count:', usersCount);
  
  const filesCount = await dbClient.nbFiles();
  console.log('Files count:', filesCount);
  
  process.exit(0);
}

testConnection();