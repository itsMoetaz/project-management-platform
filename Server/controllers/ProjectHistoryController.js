const ProjectHistory = require('../models/ProjectHistory');
const Project = require('../models/Project');

exports.getProjectHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check if project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get history items for this project, newest first
    const history = await ProjectHistory.find({ project_id: projectId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name profile_picture')
      .populate('task', 'title status');
    
    return res.status(200).json(history);
  } catch (error) {
    console.error('Error getting project history:', error);
    return res.status(500).json({ message: 'Failed to retrieve project history' });
  }
};

// Function to add a history entry (can be called from other controllers)
exports.addHistoryEntry = async (projectId, userId, taskId, action, description, meta = {}) => {
  try {
    const historyEntry = new ProjectHistory({
      project_id: projectId,
      user: userId,
      task: taskId,
      action,
      description,
      meta
    });
    
    await historyEntry.save();
    return historyEntry;
  } catch (error) {
    console.error('Error adding history entry:', error);
    // Don't throw, just log the error so it doesn't interrupt the main operations
    return null;
  }
};