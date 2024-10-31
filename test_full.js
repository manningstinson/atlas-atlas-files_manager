import dbClient from './utils/db';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testDB() {
    // Initial state
    console.log("Initial state:", dbClient.isAlive());
    
    // Wait for connection
    await wait(2000);
    
    // Check connection after waiting
    console.log("After waiting:", dbClient.isAlive());
    
    // Get counts
    const users = await dbClient.nbUsers();
    console.log("Users count:", users);
    
    const files = await dbClient.nbFiles();
    console.log("Files count:", files);
}

testDB();