// routes/resignationRoutes.js
const express = require('express');
const router = express.Router();
const resignationController = require('../controllers/ResignationController');
const authController = require('../controllers/AuthController');
const { validateResignationSubmit, validateResignationStatus } = require('../validators/resignationValidator');

router.post('/submit', authController.protection, validateResignationSubmit, resignationController.submitResignation);
router.get('/', authController.protection, resignationController.getResignations);
router.put('/:id/status', authController.protection, validateResignationStatus, resignationController.updateResignationStatus);

module.exports = router;