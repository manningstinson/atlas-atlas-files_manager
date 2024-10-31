import express from 'express';
import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';

const router = express.Router();

// Remove the test route
// router.get('/', (req, res) => {
//     res.send('Server is working!');
// });

router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew);

export default router;