// src/routes/index.js
import express from 'express'; 
import AppController from '../controllers/AppController.js'; 

const router = express.Router(); 

// Log the current directory
console.log("Current Directory in routes/index.js:", __dirname);

// Define your routes
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

export default router;
