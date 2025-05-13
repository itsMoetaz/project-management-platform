const Workspace = require('../models/Workspace');
const User = require('../models/User');
const Invitation = require('../models/Invitation');
const { validateWorkspace } = require('../validators/WorkspaceValidator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const notificationController = require('./notificationController');
const { validateProject } = require('../validators/validatorProject');
const Project = require('../models/Project');
const Task = require('../models/Task');
const mongoose = require('mongoose'); // Add this line to import mongoose
exports.addWorkspace = async (req, res) => {
  const { error } = validateWorkspace(req.body);
  if (error) return res.status(400).json({ errors: error.details.map(err => err.message) });

  try {
    const newWorkspace = new Workspace(req.body);
    const savedWorkspace = await newWorkspace.save();
    res.status(201).json(savedWorkspace);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getAllWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find().populate('owner members.user projects');
    res.status(200).json(workspaces);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getWorkspaceById = async (req, res) => {
  try {
    const query = Workspace.findById(req.params.id);
    query.populate('owner', 'name email profile_picture');

    if (req.query.populate === 'projects') {
      query.populate('projects.createdBy', 'name email');
    }

    const workspace = await query.exec();

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json(workspace);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateWorkspace = async (req, res) => {
  const { error } = validateWorkspace(req.body);
  if (error) return res.status(400).json({ errors: error.details.map(err => err.message) });

  try {
    const updatedWorkspace = await Workspace.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('owner members.user projects');
    if (!updatedWorkspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json(updatedWorkspace);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.deleteWorkspace = async (req, res) => {
  try {
    const deletedWorkspace = await Workspace.findByIdAndDelete(req.params.id);
    if (!deletedWorkspace) return res.status(404).json({ message: 'Workspace not found' });
    res.status(200).json({ message: 'Workspace deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.inviteToWorkspace = async (req, res) => {
  const { email } = req.body;
  const workspaceId = req.params.id;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Verify the workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isOwner = workspace.owner.toString() === req.user.id;

    // Check if user is an editor
    const userMember = workspace.members.find(member =>
        member.user.toString() === req.user.id &&
        (member.role === 'editor' || member.role === 'admin')
    );

    if (!isOwner && !userMember) {
      return res.status(403).json({ message: 'You do not have permission to send invitations' });
    }
    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });

    // Check if there's already a pending invitation for this email
    const existingInvitation = await Invitation.findOne({
      workspace: workspaceId,
      recipient_email: email,
      status: 'pending'
    });

    if (existingInvitation) {
      return res.status(400).json({ message: 'An invitation has already been sent to this email' });
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member => {
      if (existingUser && member.user.toString() === existingUser._id.toString()) {
        return true;
      }
      return false;
    });

    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');

    // Set expiration date (48 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Create invitation
    const invitation = new Invitation({
      workspace: workspaceId,
      sender: req.user.id,
      recipient_email: email,
      token,
      expires_at: expiresAt
    });

    await invitation.save();

    // Add notification if the user already exists in the system
    if (existingUser) {
      console.log(`User with email ${email} found. Creating notification.`);

      const notificationData = {
        recipient: existingUser._id,
        type: 'invitation',
        message: `You've been invited to join the workspace "${workspace.name}"`,
        workspaceId: workspace._id,
        invitationId: invitation._id,
        actionLink: '/invitations',
        workspaceName: workspace.name
      };

      const notification = await notificationController.createNotification(notificationData);
      console.log('Notification created:', notification ? 'SUCCESS' : 'FAILED');
    } else {
      console.log(`No existing user found for email ${email}. Skipping notification.`);
    }

    // Create a Nodemailer transporter
    let transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Get sender information
    const sender = await User.findById(req.user.id);

    // Invitation URL (adjust based on your frontend setup)
// Use the CLIENT_URL from environment for your frontend
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const invitationUrl = `${clientUrl}/invitations/${token}/accept`;
    // Email options
    let mailOptions = {
      from: `Planify <${process.env.SMTP_EMAIL}>`,
      to: email,
      subject: `Invitation to join "${workspace.name}" workspace`,
      html: `
        <h2>Workspace Invitation</h2>
        <p>Hello,</p>
        <p>${sender.name || 'Someone'} has invited you to join the "${workspace.name}" workspace on Project Management Platform.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${invitationUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
        <p>Or copy and paste this URL into your browser:</p>
        <p>${invitationUrl}</p>
        <p>This invitation will expire in 48 hours.</p>
        <p>If you don't want to join, simply ignore this email.</p>
      `
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation._id,
        email,
        workspace: workspaceId,
        token,
        expires_at: expiresAt
      },
      userId: existingUser ? existingUser._id : null
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.respondToInvitation = async (req, res) => {
  const { token } = req.params;
  const { action, userData } = req.body; // Add userData for registration if needed

  if (!action || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be "accept" or "decline"' });
  }

  try {
    // Find the invitation by token - REMOVED populate('workspace') here
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if invitation has expired
    if (invitation.expires_at < new Date()) {
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has already been ${invitation.status}` });
    }

    if (action === 'decline') {
      // Update invitation status to declined
      invitation.status = 'declined';
      await invitation.save();
      return res.status(200).json({ message: 'Invitation declined successfully' });
    }

    // Handle acceptance
    invitation.status = 'accepted';
    await invitation.save();

    // Find user by email
    let user = await User.findOne({ email: invitation.recipient_email });

    // If user doesn't exist, check if registration data was provided
    if (!user && userData) {
      // Create a new user with the provided data
      user = new User({
        email: invitation.recipient_email,
        name: userData.name,
        password: userData.password, // Make sure to hash this!
        // Other required fields
      });

      await user.save();
    } else if (!user) {
      return res.status(400).json({
        message: 'You need to register an account with this email first',
        email: invitation.recipient_email
      });
    }

    // THIS IS THE FIX: We directly use invitation.workspace as the ID
    const workspace = await Workspace.findById(invitation.workspace);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace no longer exists' });
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member =>
        member.user && member.user.toString() === user._id.toString()
    );

    console.log('User:', user._id, 'Is already member:', isAlreadyMember);

    if (!isAlreadyMember) {
      // Add user as member with viewer role
      workspace.members.push({
        user: user._id,
        role: 'viewer'
      });

      // Save changes to workspace
      await workspace.save();
      console.log('User added to workspace members');
    }

    res.status(200).json({
      message: 'Invitation accepted successfully',
      workspace: workspace._id // Send just the ID, not the whole object
    });
  } catch (err) {
    console.error('Error responding to invitation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getWorkspaceInvitations = async (req, res) => {
  const workspaceId = req.params.id;

  try {
    // Verify the workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is the owner
    const isOwner = workspace.owner.toString() === req.user.id;

    // Check if user is an editor
    const userMember = workspace.members.find(member =>
        member.user.toString() === req.user.id &&
        (member.role === 'editor' || member.role === 'admin')
    );

    // Allow access if user is owner OR editor
    if (!isOwner && !userMember) {
      return res.status(403).json({ message: 'You do not have permission to view invitations' });
    }

    // Get all invitations for this workspace
    const invitations = await Invitation.find({ workspace: workspaceId })
        .populate('sender', 'name email')
        .select('-token');

    res.status(200).json(invitations);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    console.log("Creating project for workspace ID:", workspaceId);
    console.log("Request user:", req.user ? req.user.id : "Not authenticated");

    // First verify the workspace exists before doing anything else
    const workspace = await Workspace.findById(workspaceId);
    console.log("Workspace found:", workspace ? "Yes" : "No");

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Prepare project data for validation
    const projectData = {
      project_name: req.body.project_name,
      description: req.body.description,
      status: req.body.status || 'not started',
      start_date: new Date(req.body.start_date),
      end_date: new Date(req.body.end_date),
      id_teamMembre: [req.user._id.toString()]
    };

    // Validate with your schema
    const { error } = validateProject(projectData);
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({ errors: error.details.map((err) => err.message) });
    }

    // Create the project in the Project collection - use the SAME ID for both collections
    const projectId = new mongoose.Types.ObjectId(); // Generate a single ID to use in both places

    // Create project with predefined ID
    const newProject = new Project({
      _id: projectId, // Use the pre-generated ID
      ...projectData,
      workspace: workspaceId
    });

    const savedProject = await newProject.save();
    console.log(`Created project with ID: ${savedProject._id}`);

    // Update workspace with ONLY the project ID as a reference
    const updatedWorkspace = await Workspace.findByIdAndUpdate(
        workspaceId,
        {
          $push: {
            projects: savedProject._id // Store only the ID, not the entire object
          }
        },
        { new: true }
    );

    if (!updatedWorkspace) {
      console.log(`Warning: Workspace ${workspaceId} not found when updating projects array`);
    } else {
      console.log(`Project ${savedProject._id} added to workspace projects array`);
    }

    // Return the newly created project
    res.status(201).json(savedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // First get the workspace to get the project IDs
    const workspace = await Workspace.findById(workspaceId).lean();

    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    if (!workspace.projects || !workspace.projects.length) {
      console.log("No projects found in workspace");
      return res.json([]);
    }

    // Log the raw projects array for debugging
    console.log("Raw projects in workspace:", JSON.stringify(workspace.projects));

    // Extract project IDs properly, handling any format
    const projectIds = [];

    for (const project of workspace.projects) {
      if (typeof project === 'string') {
        // If it's already a string ID, add it directly
        projectIds.push(project);
      } else if (project && mongoose.Types.ObjectId.isValid(project)) {
        // If it's a valid ObjectId, add it
        projectIds.push(project);
      } else if (typeof project === 'object' && project !== null) {
        // If it's an object with _id, extract the _id
        if (project._id && mongoose.Types.ObjectId.isValid(project._id)) {
          projectIds.push(project._id);
        }
      }
    }

    console.log("Extracted valid project IDs:", projectIds);

    // Now fetch the full project objects from the Projects collection
    // Only if we have valid project IDs
    if (projectIds.length === 0) {
      console.log("No valid project IDs found");
      return res.json([]);
    }

    const projects = await Project.find({
      _id: { $in: projectIds }
    }).populate('id_tasks');

    // Debug information
    console.log(`Found ${projects.length} projects for workspace ${workspaceId}`);

    // Map to the format expected by frontend
    res.json(projects);
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({
      error: 'Failed to fetch projects',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

exports.verifyInvitation = async (req, res) => {
  const { token } = req.params;

  try {
    // Find the invitation
    const invitation = await Invitation.findOne({ token })
        .populate('workspace', 'name description')
        .populate('sender', 'name email');

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if expired
    if (invitation.expires_at < new Date()) {
      return res.status(400).json({ message: 'This invitation has expired' });
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `This invitation has already been ${invitation.status}` });
    }

    // Return invitation details
    res.json({
      workspace: {
        id: invitation.workspace._id,
        name: invitation.workspace.name,
        description: invitation.workspace.description
      },
      sender: invitation.sender,
      email: invitation.recipient_email,
      expiresAt: invitation.expires_at
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get all workspaces for which the user has access
exports.getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find workspaces where user is either the owner OR a member
    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    }).populate('owner', 'name email');


    res.status(200).json(workspaces);
  } catch (err) {
    console.error('Error fetching user workspaces:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;

    // Find workspace and populate member details
    const workspace = await Workspace.findById(workspaceId)
        .populate('members.user', 'name email profile_picture');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Also get the owner's details
    const owner = await User.findById(workspace.owner).select('name email profile_picture');

    // Format the response to include the owner and all members with their roles
    const allMembers = [
      {
        ...owner.toObject(),
        _id: owner._id.toString(),
        role: 'owner',
        isOwner: true
      },
      ...workspace.members.map(member => ({
        ...member.user.toObject(),
        _id: member.user._id.toString(),
        role: member.role
      }))
    ];

    res.status(200).json(allMembers);

  } catch (err) {
    console.error('Error fetching workspace members:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.updateMemberRole = async (req, res) => {
  try {
    const { id: workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, editor, or viewer' });
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if the current user is the owner or an admin
    const isOwner = workspace.owner.toString() === req.user.id;
    const currentUserMember = workspace.members.find(m => m.user.toString() === req.user.id);
    const isAdmin = currentUserMember && currentUserMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to update member roles' });
    }

    // Find the member and update their role
    const memberIndex = workspace.members.findIndex(m => m.user.toString() === memberId);

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this workspace' });
    }

    workspace.members[memberIndex].role = role;
    await workspace.save();

    res.status(200).json({ message: 'Member role updated successfully' });

  } catch (err) {
    console.error('Error updating member role:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.removeMember = async (req, res) => {
  try {
    const { id: workspaceId, memberId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if the current user is the owner or an admin
    const isOwner = workspace.owner.toString() === req.user.id;
    const currentUserMember = workspace.members.find(m => m.user.toString() === req.user.id);
    const isAdmin = currentUserMember && currentUserMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You do not have permission to remove members' });
    }

    // Cannot remove the workspace owner
    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({ message: 'Cannot remove the workspace owner' });
    }

    // Filter out the member
    workspace.members = workspace.members.filter(m => m.user.toString() !== memberId);
    await workspace.save();

    res.status(200).json({ message: 'Member removed successfully' });

  } catch (err) {
    console.error('Error removing workspace member:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getUserInvitations = async (req, res) => {
  try {
    // Find pending invitations for the current user's email
    const invitations = await Invitation.find({
      recipient_email: req.user.email,
      status: 'pending'
    })
        .populate('workspace', 'name description')
        .populate('sender', 'name email');

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.respondToInvitationById = async (req, res) => {
  const { invitationId } = req.params;
  const { action } = req.body;

  if (!action || !['accept', 'decline'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be "accept" or "decline"' });
  }

  try {
    // Find the invitation by ID
    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Verify the invitation is for the authenticated user
    if (invitation.recipient_email !== req.user.email) {
      return res.status(403).json({ message: 'This invitation is not for you' });
    }

    // Check if invitation has expired
    if (invitation.expires_at < new Date()) {
      return res.status(400).json({ message: 'Invitation has expired' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation has already been ${invitation.status}` });
    }

    if (action === 'decline') {
      // Update invitation status to declined
      invitation.status = 'declined';
      await invitation.save();
      return res.status(200).json({ message: 'Invitation declined successfully' });
    }

    // Handle acceptance
    invitation.status = 'accepted';
    await invitation.save();

    // Add user to workspace
    const workspace = await Workspace.findById(invitation.workspace);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace no longer exists' });
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member =>
        member.user && member.user.toString() === req.user.id
    );

    if (!isAlreadyMember) {
      // Add user as member with viewer role
      workspace.members.push({
        user: req.user.id,
        role: 'viewer'
      });

      // Save changes to workspace
      await workspace.save();
    }

    res.status(200).json({
      message: 'Invitation accepted successfully',
      workspace: workspace._id
    });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserWorkspaceStats = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;

    // Default stats to return
    const defaultStats = {
      workspacesCount: 1,
      projectsCount: 0,
      tasksCount: 0,
      completedTasksCount: 0,
      contributionPercentage: 0
    };

    // Check if workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(200).json(defaultStats);
    }

    // Properly check if user is a member - fix for the Mongoose error
    let isMember = false;

    // Check if user is the owner
    if (workspace.owner && workspace.owner.toString() === userId) {
      isMember = true;
    }

    // Check if user is in members array
    if (!isMember && workspace.members && Array.isArray(workspace.members)) {
      // Handle both cases: members as strings or as objects
      for (const member of workspace.members) {
        const memberId = typeof member === 'object' ? member._id.toString() : member.toString();
        if (memberId === userId) {
          isMember = true;
          break;
        }
      }
    }

    if (!isMember) {
      // Just return default stats instead of error
      return res.status(200).json(defaultStats);
    }

    // Calculate stats
    try {
      // 1. Count total workspaces user belongs to
      let workspacesCount = 1; // Default to at least this workspace

      try {
        // This query was causing the error - fix it
        workspacesCount = await Workspace.countDocuments({
          $or: [
            { owner: userId },
            { members: { $elemMatch: { $eq: userId } } }
          ]
        });

        if (workspacesCount === 0) {
          // Fallback if the query doesn't work
          workspacesCount = 1;
        }
      } catch (workspaceError) {
        console.error('Error counting workspaces:', workspaceError);
        // Keep default value
      }

      // 2. Count projects user is a member of in this workspace
      let projectsCount = 0;
      let userProjects = [];

      try {
        // Get projects user is a member of
        userProjects = await Project.find({
          workspace: workspaceId,
          $or: [
            { owner: userId },
            { members: { $elemMatch: { $eq: userId } } }
          ]
        });

        projectsCount = userProjects.length;
      } catch (projectError) {
        console.error('Error counting projects:', projectError);
      }

      // 3. Count tasks assigned to user
      let tasksCount = 0;
      let completedTasksCount = 0;

      try {
        // If you have a Task model
        if (typeof Task !== 'undefined') {
          const projectIds = userProjects.map(p => p._id);

          if (projectIds.length > 0) {
            const userTasks = await Task.find({
              project: { $in: projectIds },
              assignee: userId
            });

            tasksCount = userTasks.length;
            completedTasksCount = userTasks.filter(task =>
                task.status === 'completed' || task.completed
            ).length;
          }
        } else {
          // If tasks are embedded in projects
          for (const project of userProjects) {
            if (project.tasks && Array.isArray(project.tasks)) {
              for (const task of project.tasks) {
                // Check if task is assigned to this user
                const assigneeId = typeof task.assignee === 'object'
                    ? task.assignee.toString()
                    : task.assignee;

                if (assigneeId === userId) {
                  tasksCount++;
                  if (task.status === 'completed' || task.completed) {
                    completedTasksCount++;
                  }
                }
              }
            }
          }
        }
      } catch (taskError) {
        console.error('Error counting tasks:', taskError);
      }

      // Calculate contribution percentage
      const contributionPercentage = tasksCount > 0
          ? Math.round((completedTasksCount / tasksCount) * 100)
          : 0;

      // Return stats
      return res.status(200).json({
        workspacesCount,
        projectsCount,
        tasksCount,
        completedTasksCount,
        contributionPercentage
      });

    } catch (statsError) {
      console.error('Error calculating stats:', statsError);
      return res.status(200).json(defaultStats);
    }

  } catch (error) {
    console.error('Error fetching user workspace stats:', error);
    // Return default stats instead of error
    return res.status(200).json({
      workspacesCount: 1,
      projectsCount: 0,
      tasksCount: 0,
      completedTasksCount: 0,
      contributionPercentage: 0
    });
  }
};

exports.getWorkspaceProjects = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Fetching projects for workspace ${id}`);

    // First get the workspace with project IDs
    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    if (!workspace.projects || workspace.projects.length === 0) {
      console.log(`Workspace ${id} has no projects array or empty array`);
      return res.status(200).json([]);
    }

    // Log the raw projects array for debugging
    console.log(`Raw projects in workspace ${id}:`, JSON.stringify(workspace.projects));

    // Clean and normalize the project IDs
    const projectIds = [];
    for (const projectRef of workspace.projects) {
      try {
        if (typeof projectRef === 'string') {
          // String ID - convert to ObjectId
          if (mongoose.Types.ObjectId.isValid(projectRef)) {
            projectIds.push(new mongoose.Types.ObjectId(projectRef));
          }
        } else if (projectRef instanceof mongoose.Types.ObjectId) {
          // Already an ObjectId
          projectIds.push(projectRef);
        } else if (typeof projectRef === 'object' && projectRef !== null) {
          // Object with _id property
          if (projectRef._id && mongoose.Types.ObjectId.isValid(projectRef._id)) {
            projectIds.push(new mongoose.Types.ObjectId(projectRef._id));
          }
        }
      } catch (err) {
        console.log(`Error processing project reference: ${projectRef}`, err);
      }
    }

    console.log(`Normalized ${projectIds.length} valid project IDs`);
    
    // Primary query: Find projects using the cleaned IDs
    let projects = [];
    if (projectIds.length > 0) {
      projects = await Project.find({
        _id: { $in: projectIds }
      }).populate('id_tasks');
      
      console.log(`Found ${projects.length} projects by ID`);
    }
    
    // Fallback: If no projects found by IDs, try searching by workspace field
    if (projects.length === 0) {
      console.log(`No projects found by ID, trying fallback query by workspace field`);
      
      const fallbackProjects = await Project.find({
        workspace: id
      }).populate('id_tasks');
      
      console.log(`Fallback found ${fallbackProjects.length} projects`);
      
      // If fallback found projects, update the workspace with correct references
      if (fallbackProjects.length > 0) {
        workspace.projects = fallbackProjects.map(p => p._id);
        await workspace.save();
        console.log(`Updated workspace with ${fallbackProjects.length} project references`);
        projects = fallbackProjects;
      }
    }
    
    // Debug task counts
    console.log('Project task counts:', projects.map(p => ({
      project: p.project_name || p.name,
      taskCount: p.id_tasks ? p.id_tasks.length : 0
    })));

    res.status(200).json(projects);
  } catch (error) {
    console.error('Error fetching workspace projects:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Add this to your WorkspaceController.js file
exports.cleanupWorkspaceProjects = async (req, res) => {
  try {
    console.log("Starting workspace projects cleanup...");

    // Get all workspaces
    const workspaces = await Workspace.find();
    console.log(`Found ${workspaces.length} workspaces to check`);

    let updatedCount = 0;
    let errorCount = 0;
    let totalProjectsFixed = 0;

    for (const workspace of workspaces) {
      try {
        let needsUpdate = false;
        let fixedProjectsCount = 0;

        console.log(`Checking workspace: ${workspace._id} (${workspace.name || 'unnamed'})`);
        console.log(`Original projects: ${JSON.stringify(workspace.projects)}`);

        // Skip if no projects
        if (!workspace.projects || workspace.projects.length === 0) {
          console.log("No projects to fix in this workspace");
          continue;
        }

        // Create a new projects array that contains only valid ObjectIds
        const cleanProjects = [];

        for (const project of workspace.projects) {
          if (typeof project === 'object' && project !== null) {
            // If it's a full project object with _id
            if (project._id) {
              const projectId = typeof project._id === 'string' ?
                  project._id : project._id.toString();

              console.log(`Converting project object to ID reference: ${projectId}`);
              cleanProjects.push(mongoose.Types.ObjectId(projectId));
              needsUpdate = true;
              fixedProjectsCount++;
            }
            // If it has a name property but no _id, it's malformed
            else if (project.name) {
              console.log(`Found malformed project without _id: ${project.name}`);
              // Skip this project as we can't reference it properly
            }
            // If it's an ObjectId object
            else if (project instanceof mongoose.Types.ObjectId) {
              cleanProjects.push(project);
            }
          }
          // If it's already a string ID or ObjectId, keep it
          else if (typeof project === 'string' || mongoose.Types.ObjectId.isValid(project)) {
            cleanProjects.push(mongoose.Types.ObjectId(project));
          }
        }

        // Only update if needed
        if (needsUpdate) {
          console.log(`Updating workspace ${workspace._id} projects array:`);
          console.log(`Before: ${workspace.projects.length} projects`);
          console.log(`After: ${cleanProjects.length} projects`);

          workspace.projects = cleanProjects;
          await workspace.save();

          updatedCount++;
          totalProjectsFixed += fixedProjectsCount;

          console.log(`✅ Fixed ${fixedProjectsCount} projects in workspace ${workspace._id}`);
        } else {
          console.log(`✓ No fixes needed for workspace ${workspace._id}`);
        }
      } catch (workspaceError) {
        console.error(`Error processing workspace ${workspace._id}:`, workspaceError);
        errorCount++;
      }
    }

    res.status(200).json({
      message: `Cleanup complete. Updated ${updatedCount} workspaces with ${totalProjectsFixed} fixed projects. Errors: ${errorCount}`
    });
  } catch (error) {
    console.error('Error during workspace cleanup:', error);
    res.status(500).json({ message: 'Error during cleanup', error: error.message });
  }
};
exports.getWorkspaceCount = async (req, res) => {
  try {

    const count = await Workspace.countDocuments();
    res.status(200).json({ count });

  } catch (err) {

    console.error('Error fetching workspace count:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.checkOwner = async (req, res) => {
  try {
    const { workspaceId, userId } = req.query;
    if (!workspaceId || !userId) {
      return res.status(400).json({ message: 'workspaceId et userId sont requis' });
    }

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      owner: userId,
    });
    res.status(200).json({ isOwner: !!workspace });
  } catch (err) {
    console.error('Erreur lors de la vérification du rôle owner :', err.message);
    res.status(500).json({ message: 'Erreur serveur', error: err.message });
  }
};

