const express = require('express');
const router = express.Router();
const { getProjectHistory } = require('../controllers/ProjectHistoryController');
const { protection } =require('../controllers/AuthController');

// Get history for a specific project
router.get('/projects/:projectId/history', protection, getProjectHistory);

module.exports = router;