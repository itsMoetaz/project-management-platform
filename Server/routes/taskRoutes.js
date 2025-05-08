const express = require('express');
const router = express.Router();
const taskController = require('../controllers/TaskController');
const { protection } =require('../controllers/AuthController');
// Add these imports at the top of your file
const Project = require('../models/Project');
const notificationController = require('../controllers/notificationController');""
// Get tasks by project
router.get('/projects/:projectId/tasks', protection, taskController.getTasksByProject);

// Create new task
router.post('/projects/:projectId/tasks', protection, taskController.createTask);

// Update task
router.put('/tasks/:id', protection, taskController.updateTask);

// Delete task
router.delete('/tasks/:id', protection, taskController.deleteTask);
// Add this to your Server routes file
router.get('/test-deadline-check', async (req, res) => {
    try {
      // Look for projects ending soon (within next few days)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2); // Look 2 days ahead
      
      console.log("Checking for projects with deadlines before:", twoDaysFromNow);
      
      const projects = await Project.find({
        end_date: {
          $gte: new Date(),
          $lte: twoDaysFromNow
        }
      }).populate('id_teamMembre', '_id');
      
      console.log(`Found ${projects.length} projects approaching deadline`);
      console.log("Projects:", projects.map(p => ({
        name: p.project_name || p.name,
        deadline: p.end_date,
        teamSize: p.id_teamMembre?.length || 0
      })));
      
      // Create notifications for all found projects
      let notificationsCreated = 0;
      
      for (const project of projects) {
        const daysRemaining = Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24));
        
        if (project.id_teamMembre && project.id_teamMembre.length > 0) {
          for (const member of project.id_teamMembre) {
            await notificationController.createNotification({
              recipient: member._id,
              type: 'deadline',
              message: `Project "${project.project_name || project.name}" deadline approaching in ${daysRemaining} days!`,
              relatedProject: project._id,
              actionLink: `/workspace/${project.id_workspace}/projects/${project._id}`,
              priority: 'high'
            });
            notificationsCreated++;
          }
        }
      }
      
      res.json({ 
        success: true, 
        projectsFound: projects.length,
        notificationsCreated
      });
    } catch (error) {
      console.error('Error in test deadline check:', error);
      res.status(500).json({ error: 'Failed to check deadlines', details: error.message });
    }
  });

module.exports = router;