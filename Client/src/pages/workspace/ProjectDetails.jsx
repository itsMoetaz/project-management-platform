import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { toast } from 'react-hot-toast';
import KanbanBoard from '../../components/project/KanbanBoard';
import ListView from '../../components/project/ListView';
import TaskModal from '../../components/project/TaskModal';
import ResourceModal from '../../components/project/ResourceModal';
import ResourceList from '../../components/project/ResourceList';
import api from '../../utils/Api';
import ProjectHistory from '../../components/project/ProjectHistory';

const ProjectDetails = () => {
  const { id, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [currentResource, setCurrentResource] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const modalRef = useRef(null);

  // Fetch project data
  useEffect(() => {
    const fetchProjectDetails = async () => {
      setLoading(true);
      try {
        // First get the project details
        const projectResponse = await api.get(`/api/projects/${projectId}`);
        setProject(projectResponse.data);
        
        // Then get the tasks for this project
        const tasksResponse = await api.get(`/api/projects/${projectId}/tasks`);
        setTasks(tasksResponse.data || []);
        
        // Fetch resources for this project
        const resourcesResponse = await api.get(`/api/ressources?project_id=${projectId}`);
        setResources(resourcesResponse.data || []);
        
        // Fetch workspace members
        const workspaceResponse = await api.get(`/api/workspaces/${id}/members`);
        setUsers(workspaceResponse.data || []);
      } catch (error) {
        console.error('Error fetching project details:', error);
        toast.error('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id, projectId]);
  const createHistoryEntry = async (action, taskId, description) => {
    try {
      await api.post(`/api/projects/${projectId}/history`, {
        action,
        task: taskId,
        description
      });
    } catch (error) {
      console.error('Failed to create history entry:', error);
      // Don't break the flow for history errors
    }
  };
  // Handle task creation
  const handleCreateTask = async (taskData) => {
    try {
      const response = await api.post(`/api/projects/${projectId}/tasks`, {
        ...taskData,
        project_id: projectId
      });
      
      setTasks([...tasks, response.data]);
      setShowTaskModal(false);
      toast.success('Task created successfully');
      await createHistoryEntry(
        'CREATE_TASK',
        response.data._id,
        `created task "${response.data.title}"`
      );
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  // Handle task update
// Update the handleUpdateTask function with better debugging

const handleUpdateTask = async (taskId, taskData) => {
  try {
    // Ensure taskId is a string
    const idToUse = String(taskId);
    
    // Find the original task to compare changes
    const originalTask = tasks.find(task => String(task._id) === idToUse);
    if (!originalTask) {
      console.error('Original task not found:', taskId);
      return;
    }
    
    // Debug log
    console.log('ProjectDetails - Updating task:', {
      url: `/api/tasks/${idToUse}`,
      data: taskData
    });
    
    // Only include required fields and properly format them
    const apiTaskData = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      // Convert to numbers and handle empty/undefined values
      estimated_time: taskData.estimated_time ? Number(taskData.estimated_time) : 0,
      actual_time: taskData.actual_time ? Number(taskData.actual_time) : 0,
      // Ensure assigned_to is properly extracted
      assigned_to: typeof taskData.assigned_to === 'object' && taskData.assigned_to?._id ? 
                  taskData.assigned_to._id : taskData.assigned_to,
      // Ensure deadline is an ISO string
      deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null
    };
    
    // Add request headers
    const response = await api.put(`/api/tasks/${idToUse}`, apiTaskData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Update the tasks state with the returned data
    setTasks(tasks.map(task => 
      String(task._id) === idToUse ? (response.data.data || response.data) : task
    ));
    setShowTaskModal(false);
    toast.success('Task updated successfully');
    
    // Detect specific changes for more detailed history
    let historyAction = 'UPDATE_TASK';
    let historyDescription = `updated task "${taskData.title}"`;
    
    // Check for assignment change
    if (originalTask.assigned_to !== apiTaskData.assigned_to) {
      historyAction = 'ASSIGN_TASK';
      const assigneeName = users.find(user => String(user._id) === String(apiTaskData.assigned_to))?.name || 'someone';
      historyDescription = `assigned "${taskData.title}" to ${assigneeName}`;
    }
    // Check for status change to "DONE" (task completion)
    else if (originalTask.status !== 'DONE' && apiTaskData.status === 'DONE') {
      historyAction = 'COMPLETE_TASK';
      historyDescription = `marked "${taskData.title}" as complete`;
    }
    
    // Add history entry
    await createHistoryEntry(historyAction, idToUse, historyDescription);
    
  } catch (error) {
    console.error('Error updating task:', error);
    
    // Enhanced error reporting
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      
      // More specific error message
      if (error.response.data?.errors && error.response.data.errors.length > 0) {
        // Show validation errors if available
        const validationErrors = error.response.data.errors
          .map(err => typeof err === 'string' ? err : (err.message || err.field ? `${err.field}: ${err.message}` : JSON.stringify(err)))
          .join(', ');
        toast.error(`Validation error: ${validationErrors}`);
      } else {
        const errorMsg = error.response.data?.message || 
                        error.response.data?.error || 
                        'Failed to update task';
        toast.error(errorMsg);
      }
    } else {
      toast.error('Network error while updating task');
    }
  }
};

  // Handle task deletion
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      
      setTasks(tasks.filter(task => task._id !== taskId));
      setShowTaskModal(false);
      toast.success('Task deleted successfully');
      await createHistoryEntry(
        'DELETE_TASK',
        taskId,
        `deleted task "${taskTitle}"`
      );
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  // Handle drag and drop in Kanban view
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    // Find the task being dragged - ensure consistent string conversion
    const taskId = String(draggableId);
    const newStatus = destination.droppableId;
    
    // Find the task object
    const taskToUpdate = tasks.find(task => String(task._id) === taskId);
    if (!taskToUpdate) {
      console.error('Task not found:', taskId);
      return;
    }
    
    // Store the old status before updating
    const oldStatus = taskToUpdate.status;
    
    // Update task locally for immediate UI update
    const updatedTasks = tasks.map(task => {
      if (String(task._id) === taskId) {
        return { ...task, status: newStatus };
      }
      return task;
    });
    
    setTasks(updatedTasks);
    
    // Update task on server
    try {
      // Only update the status field, nothing else
      await api.put(`/api/tasks/${taskId}`, { 
        status: newStatus 
      });
      
      // Add history entry for status change
      try {
        let historyAction = 'STATUS_CHANGE';
        let historyDescription = `changed status of "${taskToUpdate.title}" from ${oldStatus} to ${newStatus}`;
        
        // Special case for completion
        if (oldStatus !== 'DONE' && newStatus === 'DONE') {
          historyAction = 'COMPLETE_TASK';
          historyDescription = `marked "${taskToUpdate.title}" as complete`;
        }
        
        // await api.post(`/api/projects/${projectId}/history`, {
        //   action: historyAction,
        //   task: taskId,
        //   description: historyDescription
        // });
      } catch (historyError) {
        console.error('Failed to create history entry:', historyError);
        // Don't break the flow for history errors
      }
      
      toast.success('Task moved successfully');
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
      // Revert changes if server update fails
      setTasks(tasks);
    }
  };

  // Add this function to handle status changes from the SimpleKanbanBoard component
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Update task locally for immediate UI update
      const updatedTasks = tasks.map(task => {
        if (String(task._id) === String(taskId)) {
          return { ...task, status: newStatus };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      
      // Update on server
      await api.put(`/api/tasks/${taskId}`, { status: newStatus });
      toast.success('Task status updated');
      await createHistoryEntry(
        'STATUS_CHANGE',
        taskId,
        `changed status of "${taskToUpdate.title}" from ${oldStatus} to ${newStatus}`
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
      // Revert changes if server update fails
      setTasks(tasks);
    }
  };

  // Handle resource creation
  const handleCreateResource = async (resourceData) => {
    try {
      const response = await api.post('/api/ressources/addRessource', resourceData);
      setResources([...resources, response.data]);
      setShowResourceModal(false);
      toast.success('Resource created successfully');
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to create resource');
    }
  };

  // Handle resource update
  const handleUpdateResource = async (resourceId, resourceData) => {
    try {
      const response = await api.put(`/api/ressources/updateRessource/${resourceId}`, resourceData);
      setResources(resources.map(resource => 
        resource._id === resourceId ? response.data : resource
      ));
      setShowResourceModal(false);
      toast.success('Resource updated successfully');
    } catch (error) {
      console.error('Error updating resource:', error);
      toast.error('Failed to update resource');
    }
  };

  // Handle resource deletion
  const handleDeleteResource = async (resourceId) => {
    try {
      await api.delete(`/api/ressources/${resourceId}`);
      setResources(resources.filter(resource => resource._id !== resourceId));
      setShowResourceModal(false);
      toast.success('Resource deleted successfully');
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  // Open task modal for creating or editing
  const openTaskModal = (task = null) => {
    setCurrentTask(task);
    setShowTaskModal(true);
  };

  // Open resource modal for creating or editing
  const openResourceModal = (resource = null) => {
    setCurrentResource(resource);
    setShowResourceModal(true);
  };

  // Calculate project completion percentage
  const calculateProgress = () => {
    if (!tasks.length) return 0;
    const completedTasks = tasks.filter(task => task.status === 'DONE').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // Get filtered and sorted tasks
  const getFilteredTasks = () => {
    let filteredTasks = [...tasks];
    
    // Apply status filter if not "all"
    if (filterStatus !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.status === filterStatus);
    }
    
    // Apply search term
    if (searchTerm) {
      filteredTasks = filteredTasks.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'newest':
        return filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return filteredTasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'deadline':
        return filteredTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      case 'priority':
        const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      default:
        return filteredTasks;
    }
  };

  // Map status to color
  const getStatusColor = (status) => {
    switch (status) {
      case 'TODO': return 'bg-info text-info-content';
      case 'IN_PROGRESS': return 'bg-primary text-primary-content';
      case 'REVIEW': return 'bg-warning text-warning-content';
      case 'DONE': return 'bg-success text-success-content';
      default: return 'bg-base-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <div className="w-24 h-24 bg-base-300 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
        <p className="mb-6 max-w-md">This project doesn't exist or you don't have permission to view it.</p>
        <Link to={`/workspace/${id}/projects`} className="btn btn-primary">
          Back to Projects
        </Link>
      </div>
    );
  }

  const progress = calculateProgress();
  const filteredTasks = getFilteredTasks();

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="text-sm breadcrumbs">
        <ul>
          <li>
            <Link to={`/workspace/${id}/projects`} className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Projects
            </Link>
          </li>
          <li>
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {project.project_name || project.name}
            </span>
          </li>
        </ul>
      </div>

      {/* Project Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-base-100 rounded-xl shadow-lg overflow-hidden"
      >
        <div className="relative">
          {/* Decorative elements */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-base-100 to-secondary/10 z-0"></div>
          
          <div className="relative z-10 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-base-content">{project.project_name || project.name}</h1>
                <p className="text-base-content/90 mt-1 max-w-2xl">
                  {project.description || "No description provided."}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-primary gap-2"
                  onClick={() => openTaskModal()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Task
                </motion.button>
                
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a>Edit Project</a></li>
                    <li><a className="text-error">Delete Project</a></li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="stats bg-base-100 shadow-md border border-base-200">
                <div className="stat">
                  <div className="stat-figure text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="stat-title font-medium text-base-content/90">Tasks</div>
                  <div className="stat-value text-primary">{tasks.length}</div>
                </div>
              </div>
              
              <div className="stats bg-base-100 shadow-md border border-base-200">
                <div className="stat">
                  <div className="stat-figure text-success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="stat-title font-medium text-base-content/90">Progress</div>
                  <div className="stat-value text-success">{progress}%</div>
                  <div className="stat-desc">
                    <div className="w-full bg-base-200 rounded-full h-2 mt-1">
                      <div 
                        className={`${progress >= 100 ? 'bg-success' : 'bg-primary'} h-2 rounded-full`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="stats bg-base-100 shadow-md border border-base-200">
                <div className="stat">
                  <div className="stat-figure text-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="stat-title font-medium text-base-content/90">Deadline</div>
                  <div className="stat-value text-warning">
                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="stats bg-base-100 shadow-md border border-base-200">
                <div className="stat">
                  <div className="stat-figure text-info">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="stat-title font-medium text-base-content/90">Team</div>
                  <div className="stat-value text-info">
                    {project.id_teamMembre?.length || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Filters and View Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-base-100 to-secondary/10 z-0"></div>
        <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-secondary/5 blur-3xl"></div>
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"></div>
        
        <div className="relative z-10 p-5">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="w-4 h-4 text-primary" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                  </svg>
                </div>
                <input 
                  type="search" 
                  className="input input-bordered border-2 border-base-200 focus:border-primary bg-base-100/90 pl-10 w-full"
                  placeholder="Search tasks..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="join w-full sm:w-auto">
                <select 
                  className="select select-bordered join-item"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
                
                <select 
                  className="select select-bordered join-item"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="deadline">By Deadline</option>
                  <option value="priority">By Priority</option>
                </select>
              </div>
            </div>
            
            {/* View Mode Switcher */}
            <div className="rounded-lg border border-primary/20 p-1">
  <div className="flex relative">
    <div
      className="absolute bg-gradient-to-r from-primary/30 to-secondary/30 rounded-md transition-all duration-500 ease-in-out"
      style={{
        width: "33.33%",
        height: "100%",
        top: "0%",
        left: viewMode === 'kanban' ? '0%' : viewMode === 'list' ? '33.33%' : '66.66%',
        opacity: 0.8,
      }}
    />
    <button 
      className="btn btn-sm rounded-md border-0 bg-transparent hover:bg-transparent z-10 w-28 flex justify-center items-center"
      onClick={() => setViewMode('kanban')}
    >
      <div className="flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <span className={viewMode === 'kanban' ? 'font-bold text-base-content' : 'text-base-content/60'}>Kanban</span>
      </div>
    </button>
    <button 
      className="btn btn-sm rounded-md border-0 bg-transparent hover:bg-transparent z-10 w-28 flex justify-center items-center"
      onClick={() => setViewMode('list')}
    >
      <div className="flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className={viewMode === 'list' ? 'font-bold text-base-content' : 'text-base-content/60'}>List</span>
      </div>
    </button>
    <button 
      className="btn btn-sm rounded-md border-0 bg-transparent hover:bg-transparent z-10 w-28 flex justify-center items-center"
      onClick={() => setViewMode('history')}
    >
      <div className="flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={viewMode === 'history' ? 'font-bold text-base-content' : 'text-base-content/60'}>History</span>
      </div>
    </button>
  </div>
</div>
          </div>
        </div>
      </motion.div>
      
      {/* Task Display based on view mode */}
      {viewMode === 'kanban' ? (
         
          <DragDropContext onDragEnd={handleDragEnd}>
            <KanbanBoard 
              tasks={filteredTasks} 
              onEditTask={openTaskModal} 
              getStatusColor={getStatusColor}
              users={users}
            />
          </DragDropContext>
        
      ) : viewMode === 'list' ? (
        <ListView 
          tasks={filteredTasks} 
          onEditTask={openTaskModal}
          getStatusColor={getStatusColor}
          users={users} 
        />
      ) : (
        <div className="mt-4">
          <ProjectHistory projectId={project._id} />
        </div>
      )}
      
      {/* Resources Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Resources</h2>
          <button
            className="btn btn-secondary btn-sm md:btn-md gap-2"
            onClick={() => openResourceModal()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Resource
          </button>
        </div>
        
        <ResourceList
          resources={resources}
          onEditResource={openResourceModal}
        />
      </div>
      
      {/* Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <TaskModal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            task={currentTask}
            projectId={projectId}
            users={users}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            modalRef={modalRef}
          />
        )}
      </AnimatePresence>

      {/* Resource Modal */}
      <AnimatePresence>
        {showResourceModal && (
          <ResourceModal
            isOpen={showResourceModal}
            onClose={() => setShowResourceModal(false)}
            resource={currentResource}
            projectId={projectId}
            onCreateResource={handleCreateResource}
            onUpdateResource={handleUpdateResource}
            onDeleteResource={handleDeleteResource}
            modalRef={modalRef}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Add Task Button */}
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-8 right-8 btn btn-primary btn-circle btn-lg shadow-lg md:hidden"
        onClick={() => openTaskModal()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      </motion.button>
    </div>
  );
};

export default ProjectDetails;