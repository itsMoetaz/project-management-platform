const Task = require('../models/Task');
const Project = require('../models/Project');
const taskValidator = require('../validators/taskValidator');
const { addHistoryEntry } = require('./ProjectHistoryController');

const TaskController = {
    // Create a new task
    createTask: async (req, res) => {
        try {
            const { projectId } = req.params;
            const taskData = { ...req.body, project_id: projectId };
            
            const task = new Task(taskData);
            await task.save();
            await addHistoryEntry(
                task.project_id,
                req.user._id,
                task._id,
                'CREATE_TASK',
                `created task "${task.title}"`
              );
            // Add task to project's tasks array - FIXED: Convert string ID to ObjectId if needed
            await Project.findByIdAndUpdate(
                projectId,
                { $push: { id_tasks: task._id } }
            );
            
            // Log to verify the operation
            console.log(`Added task ${task._id} to project ${projectId}`);
            
            // Return the populated task
            const populatedTask = await Task.findById(task._id)
              .populate('assigned_to', 'name email profile_picture');
              
            res.status(201).json(populatedTask);
        } catch (error) {
            console.error('Error creating task:', error);
            console.error('Details:', error.stack);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    },

    // Get all tasks
    getAllTasks: async (req, res) => {
        try {
            const tasks = await Task.find()
                .populate('assigned_to', 'name email')
                .populate('project_id', 'name');

            res.status(200).json({
                success: true,
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get tasks by project ID
    getTasksByProject: async (req, res) => {
        try {
            const { projectId } = req.params;
            
            const tasks = await Task.find({ project_id: projectId })
              .populate('assigned_to', 'name email profile_picture')
              .sort({ createdAt: -1 });
            
            res.status(200).json(tasks);
          } catch (error) {
            console.error('Error fetching tasks for project:', error);
            res.status(500).json({ message: 'Server error', error: error.message });
          }
    },

    // Get tasks assigned to a specific user
    getUserTasks: async (req, res) => {
        try {
            const { userId } = req.params;
            const tasks = await Task.find({ assigned_to: userId })
                .populate('project_id', 'name')
                .populate('assigned_to', 'name email');

            res.status(200).json({
                success: true,
                data: tasks
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    // Get a single task by ID
    getTaskById: async (req, res) => {
        try {
            const { taskId } = req.params;
            const task = await Task.findById(taskId)
                .populate('assigned_to', 'name email')
                .populate('project_id', 'name');

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }

            res.status(200).json({
                success: true,
                data: task
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    updateTask: async (req, res) => {
        try {
            // Validate request body
            const { error } = taskValidator.updateTask.validate(req.body, { abortEarly: false });
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path[0],
                    message: detail.message
                }));
                return res.status(400).json({
                    success: false,
                    errors: errors
                });
            }
    
            const { id } = req.params;
            const updates = req.body;
    
            // Get the original task to detect what changed
            const originalTask = await Task.findById(id);
            if (!originalTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }
    
            const task = await Task.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            ).populate('assigned_to', 'name email profile_picture')
             .populate('project_id', 'name');
    
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }
    
            // Detect specific changes for more detailed history
            let action = 'UPDATE_TASK';
            let description = `updated task "${task.title}"`;
    
            // Important: Check in the correct order of priority
            // First check for status change to "DONE" (task completion)
            if (originalTask.status !== 'DONE' && updates.status === 'DONE') {
                action = 'COMPLETE_TASK';
                description = `marked "${task.title}" as complete`;
            }
            // Then check for any status change
            else if (updates.status && originalTask.status !== updates.status) {
                action = 'STATUS_CHANGE';
                description = `changed status of "${task.title}" from ${originalTask.status} to ${updates.status}`;
            }
            // Finally check for assignment change - only if status didn't change
            else if (updates.assigned_to && String(originalTask.assigned_to || '') !== String(updates.assigned_to)) {
                action = 'ASSIGN_TASK';
                // Try to get assignee name if possible
                const User = require('../models/User');
                let assigneeName = 'someone';
                if (updates.assigned_to) {
                    const assignee = await User.findById(updates.assigned_to);
                    if (assignee) {
                        assigneeName = assignee.name || assignee.email || 'someone';
                    }
                }
                description = `assigned task "${task.title}" to ${assigneeName}`;
            }
    
            // Add history entry
            await addHistoryEntry(
                task.project_id,
                req.user._id,
                task._id,
                action,
                description
            );
    
            res.status(200).json({
                success: true,
                data: task,
                message: 'Task updated successfully'
            });
        } catch (error) {
            console.error('Error updating task:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Update task status
    updateTaskStatus: async (req, res) => {
        try {
            // Validate request body
            const { error } = taskValidator.updateStatus.validate(req.body, { abortEarly: false });
            if (error) {
                const errors = error.details.map(detail => ({
                    field: detail.path[0],
                    message: detail.message
                }));
                return res.status(400).json({
                    success: false,
                    errors: errors
                });
            }
    
            const { id } = req.params;
            const { status } = req.body;
    
            // Get original task for history
            const originalTask = await Task.findById(id);
            if (!originalTask) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }
    
            // Only update the status and nothing else
            const task = await Task.findByIdAndUpdate(
                id,
                { status },
                { new: true, runValidators: true }
            ).populate('assigned_to', 'name email profile_picture')
             .populate('project_id', 'name');
    
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }
    
            // Determine the appropriate action type
            let action = 'STATUS_CHANGE';
            let description = `changed status of "${task.title}" from ${originalTask.status} to ${status}`;
            
            // Special case for completion
            if (status === 'DONE' || status === 'completed') {
                action = 'COMPLETE_TASK';
                description = `marked "${task.title}" as complete`;
            }
    
            // Add history entry
            await addHistoryEntry(
                task.project_id,
                req.user._id,
                task._id,
                action,
                description
            );
    
            res.status(200).json({
                success: true,
                data: task,
                message: 'Task status updated successfully'
            });
        } catch (error) {
            console.error('Error updating task status:', error);
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    },

    // Delete a task
    deleteTask: async (req, res) => {
        try {
            const { id } = req.params;
            const task = await Task.findById(id);
    
            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: 'Task not found'
                });
            }
    
            // Store task info before deletion for history
            const projectId = task.project_id;
            const taskTitle = task.title;
            const taskId = task._id;
    
            // Remove task from project's tasks array
            await Project.findByIdAndUpdate(projectId, {
                $pull: { id_tasks: id }
            });
            
            // Delete the task
            await Task.findByIdAndDelete(id);
    
            // Add history entry before sending response
            await addHistoryEntry(
                projectId,
                req.user._id,
                taskId,
                'DELETE_TASK',
                `deleted task "${taskTitle}"`
            );
    
            // Send response after all operations
            res.status(200).json({
                success: true,
                message: 'Task deleted successfully'
            });
    
        } catch (error) {
            console.error('Error deleting task:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = TaskController;