const express = require('express');
const router = express.Router();
const BugController = require('../controllers/BugsController');
const authController = require('../controllers/AuthController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configurer Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configurer MulterStorage avec Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'bugs',
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
});

const upload = multer({ storage: storage });

// Toutes les routes nécessitent une authentification
router.use(authController.protection);

// Routes pour les bugs
router.get('/bugs', BugController.getAllBugs);
router.get('/bugs/users/:userId', BugController.getUserBugs);
router.get('/projects/:projectId/bugs', BugController.getBugsByProject);
router.get('/bugs/:id', BugController.getBugById);
router.post('/projects/:projectId/bugs', upload.single('image'), BugController.createBug);
router.put('/update/:id', upload.single('image'), BugController.updateBug);
router.put('/bugs/:id/status', BugController.updateBugStatus);
router.delete('/bugs/:id', BugController.deleteBug);
router.post('/bugs/:id/assign', BugController.assignBug);
router.post('/bugs/:id/solve', BugController.solveBug);

module.exports = router;