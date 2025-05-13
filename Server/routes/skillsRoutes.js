const express = require('express');
const router = express.Router();
const skillController = require('../controllers/SkillsController');
const authController = require('../controllers/AuthController');

router.get('/', authController.protection, skillController.getUserSkills); // Protégé
router.get('/:id', authController.protection, skillController.getSkillById); // Protégé
router.get('/mySkills', authController.protection, skillController.getUserSkills); // Protégé (redondant, peut être supprimé)
router.post('/add', authController.protection, skillController.createSkill); // Protégé
router.put('/update/:id', authController.protection, skillController.updateSkill); // Protégé
router.delete('/:id', authController.protection, skillController.deleteSkill); // Protégé
router.get('/member/:userId', authController.protection, skillController.getMemberSkills); // Protégé
router.post('/add-to-member', authController.protection, skillController.addSkillToMember); // Protégé, maintenant accessible à tous
module.exports = router;
