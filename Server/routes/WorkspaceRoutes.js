const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/WorkspaceController');
const { protection } =require('../controllers/AuthController');

router.post('/addWorkspace', workspaceController.addWorkspace);
router.get('/', workspaceController.getAllWorkspaces);
router.get('/count', workspaceController.getWorkspaceCount);
router.get('/:id', workspaceController.getWorkspaceById);
router.put('/updateWorkspace/:id', protection,  workspaceController.updateWorkspace);
router.delete('/:id', protection, workspaceController.deleteWorkspace);
router.get('/user/workspaces', protection, workspaceController.getUserWorkspaces);


router.get('/check-owner', protection, workspaceController.checkOwner);

router.post('/:workspaceId/projects', protection, workspaceController.createProject);
router.get('/:workspaceId/projects', protection, workspaceController.getProjects);

// Invitation routes
router.post('/:id/invite',protection, workspaceController.inviteToWorkspace);
router.get('/:id/invitations',protection,  workspaceController.getWorkspaceInvitations);
router.post('/invitations/:token/respond',  workspaceController.respondToInvitation);
router.get('/invitations/:token/verify', workspaceController.verifyInvitation);
router.get('/invitations/user', protection, workspaceController.getUserInvitations);
router.post('/invitations/respond/:invitationId', protection, workspaceController.respondToInvitationById);
// Add this route to your existing routes
//router.get('/admin/cleanup-projects', protection, workspaceController.cleanupWorkspaceProjects);
// Member management routes
router.get('/:id/members', protection, workspaceController.getWorkspaceMembers);
router.put('/:id/members/:memberId', protection,workspaceController.updateMemberRole);
router.delete('/:id/members/:memberId', protection,workspaceController.removeMember);
router.get('/:workspaceId/members/:userId/stats', protection, workspaceController.getUserWorkspaceStats);
module.exports = router;
