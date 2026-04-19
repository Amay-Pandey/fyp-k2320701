import sessionController from '../controllers/sessionController';

const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middleware/auth'); // Ensure you have this to protect routes

router.post('/session/start', authMiddleware, sessionController.startSession);
router.post('/session/end-match', authMiddleware, sessionController.endMatch);

module.exports = router;