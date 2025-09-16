const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

// Health check endpoint
router.get('/health', dataController.healthCheck);

// Data receive endpoint (for HTTP POST if needed)
router.post('/data/receive', dataController.receiveData);

module.exports = router;