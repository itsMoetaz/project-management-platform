import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../../utils/Api';
import TaskCard from '../../components/project/TaskCard';
import useSession from '../../hooks/useSession';

const WorkspaceTasks = () => {
  const { id: workspaceId } = useParams();
  const { workspace, refreshWorkspace } = useOutletContext();
  const { user } = useSession();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('due_date-asc');
  const [viewMode, setViewMode] = useState('grouped'); // grouped, kanban, list

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0,
    unassigned: 0,
  });

  // Fetch tasks, members, and projects
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // First fetch all workspace members
        const membersResponse = await api.get(`/api/workspaces/${workspaceId}/members`);
        setMembers(membersResponse.data || []);
        
        // Then fetch all projects in the workspace
        const projectsResponse = await api.get(`/api/workspaces/${workspaceId}/projects`);
        const projects = projectsResponse.data || [];
        setProjects(projects);
        
        // Fetch tasks for each project
        let allTasks = [];
        
        // Use Promise.all to fetch all tasks concurrently
        await Promise.all(projects.map(async (project) => {
          try {
            const projectTasksResponse = await api.get(`/api/projects/${project._id}/tasks`);
            const projectTasks = projectTasksResponse.data || [];
            
            // Add project info to each task
            const tasksWithProject = projectTasks.map(task => ({
              ...task,
              project: {
                _id: project._id,
                name: project.project_name || project.name
              }
            }));
            
            allTasks = [...allTasks, ...tasksWithProject];
          } catch (err) {
            console.warn(`Failed to fetch tasks for project ${project._id}`, err);
          }
        }));
        
        setTasks(allTasks);
        
        // Calculate statistics
        calculateStatistics(allTasks);
      } catch (error) {
        console.error('Error fetching workspace tasks:', error);
        toast.error('Failed to fetch workspace tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  // Calculate task statistics
  const calculateStatistics = (tasksList) => {
    const today = new Date();
    
    const stats = {
      total: tasksList.length,
      completed: tasksList.filter(task => task.status === 'COMPLETED' || task.status === 'DONE').length,
      overdue: tasksList.filter(task => {
        if (!task.deadline && !task.due_date) return false;
        const dueDate = task.deadline || task.due_date;
        return new Date(dueDate) < today && task.status !== 'COMPLETED' && task.status !== 'DONE';
      }).length,
      highPriority: tasksList.filter(task => task.priority === 'HIGH').length,
      unassigned: tasksList.filter(task => !task.assigned_to).length,
    };
    
    setStats(stats);
  };

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filter by search query
      if (searchQuery && !task.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filter by status
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false;
      }
      
      // Filter by priority
      if (filterPriority !== 'all' && task.priority !== filterPriority) {
        return false;
      }
      
      // Filter by project
      if (filterProject !== 'all') {
        const projectId = task.project?._id || task.project_id;
        if (projectId !== filterProject) return false;
      }
      
      // Filter by assignee
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' && task.assigned_to) return false;
        if (filterAssignee !== 'unassigned' && task.assigned_to !== filterAssignee) return false;
      }
      
      return true;
    }).sort((a, b) => {
      const [field, order] = sortOption.split('-');
      
      if (field === 'due_date') {
        const aDate = a.deadline || a.due_date;
        const bDate = b.deadline || b.due_date;
        
        if (!aDate) return order === 'asc' ? 1 : -1;
        if (!bDate) return order === 'asc' ? -1 : 1;
        
        return order === 'asc' 
          ? new Date(aDate) - new Date(bDate)
          : new Date(bDate) - new Date(aDate);
      }
      
      if (field === 'priority') {
        const priorityValue = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return order === 'asc'
          ? priorityValue[b.priority || 'LOW'] - priorityValue[a.priority || 'LOW']
          : priorityValue[a.priority || 'LOW'] - priorityValue[b.priority || 'LOW'];
      }
      
      if (field === 'status') {
        const statusValue = { TODO: 1, IN_PROGRESS: 2, REVIEW: 3, COMPLETED: 4, DONE: 4 };
        return order === 'asc'
          ? (statusValue[a.status] || 1) - (statusValue[b.status] || 1)
          : (statusValue[b.status] || 1) - (statusValue[a.status] || 1);
      }
      
      return 0;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority, filterProject, filterAssignee, sortOption]);

  // Complete the list view
  const renderListView = () => {
    if (filteredTasks.length === 0) {
      return (
        <tr>
          <td colSpan="7" className="text-center py-8">
            <div className="flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mt-2 text-base-content/60">No tasks found</p>
            </div>
          </td>
        </tr>
      );
    }
    
    return filteredTasks.map(task => {
      // Find the assignee from members array
      const assignee = task.assigned_to
        ? typeof task.assigned_to === 'object'
          ? task.assigned_to
          : members.find(member => String(member._id) === String(task.assigned_to))
        : null;
      
      // Find project
      const projectName = task.project?.name || 
                         projects.find(p => String(p._id) === String(task.project_id))?.project_name || 
                         'Unknown';
      
      // Format date
      const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString();
      };
      
      // Get status badge color
      const getStatusBadge = (status) => {
        switch(status) {
          case 'COMPLETED':
          case 'DONE':
            return 'badge-success';
          case 'IN_PROGRESS':
            return 'badge-warning';
          case 'REVIEW':
            return 'badge-secondary';
          default:
            return 'badge-info';
        }
      };
      
      // Get priority badge color
      const getPriorityBadge = (priority) => {
        switch(priority) {
          case 'HIGH':
            return 'badge-error';
          case 'MEDIUM':
            return 'badge-warning';
          default:
            return 'badge-success';
        }
      };
      
      return (
        <tr key={task._id} className="hover:bg-base-200 cursor-pointer" onClick={() => setSelectedTask(task)}>
          <td className="max-w-xs truncate font-medium">{task.title}</td>
          <td>{projectName}</td>
          <td>
            {assignee ? (
              <div className="flex items-center gap-2">
                <div className="avatar">
                  <div className="w-8 rounded-full">
                    {assignee.profile_picture ? (
                      <img src={assignee.profile_picture} alt={assignee.name} />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center h-full">
                        {assignee.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                </div>
                <span>{assignee.name}</span>
              </div>
            ) : (
              <span className="text-base-content/50">Unassigned</span>
            )}
          </td>
          <td>
            <div className={`badge ${getStatusBadge(task.status)}`}>
              {task.status === 'COMPLETED' ? 'Completed' :
               task.status === 'DONE' ? 'Done' :
               task.status === 'IN_PROGRESS' ? 'In Progress' :
               task.status === 'REVIEW' ? 'In Review' :
               'To Do'}
            </div>
          </td>
          <td>
            <div className={`badge ${getPriorityBadge(task.priority)}`}>
              {task.priority || 'Low'}
            </div>
          </td>
          <td>{formatDate(task.deadline || task.due_date)}</td>
          <td>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-xs" onClick={(e) => {
                e.stopPropagation();
                handleEditTask(task);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  // Add this function to handle task creation
  const handleCreateTask = () => {
    // Navigate to create task page or open a modal
    // This is a placeholder - you'll need to implement the actual functionality
    toast.info("Create task functionality will be implemented soon");
  };

  // Existing functions (keep them)
  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  const handleEditTask = (task) => {
    // Implement task editing functionality
    setSelectedTask(task); // For now, just open the task details modal
  };

  const toggleMemberExpand = (memberId) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
    } else {
      setExpandedMember(memberId);
    }
  };

  const getMemberCompletionRate = (memberTasks) => {
    if (!memberTasks || memberTasks.length === 0) return 0;
    const completed = memberTasks.filter(task => task.status === 'COMPLETED' || task.status === 'DONE').length;
    return Math.round((completed / memberTasks.length) * 100);
  };

  const statusLabels = {
    TODO: { name: 'To Do', color: 'bg-info' },
    IN_PROGRESS: { name: 'In Progress', color: 'bg-warning' },
    REVIEW: { name: 'In Review', color: 'bg-secondary' },
    COMPLETED: { name: 'Completed', color: 'bg-success' },
    DONE: { name: 'Done', color: 'bg-success' }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative flex">
            <div className="h-24 w-24 rounded-full border-t-8 border-b-8 border-primary animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-base-100"></div>
            </div>
          </div>
          <p className="mt-4 text-lg font-medium text-base-content">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Task Analytics Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {/* <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Workspace Tasks</h1>
          <button className="btn btn-primary" onClick={handleCreateTask}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Task
          </button>
        </div> */}

        {/* Task Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Tasks Card */}
          <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat bg-base-100 shadow rounded-box p-4 border-l-4 border-primary"
          >
            <div className="stat-figure text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div className="stat-title text-base-content/70">Total Tasks</div>
            <div className="stat-value text-primary">{stats.total}</div>
            <div className="stat-desc">Across all projects</div>
          </motion.div>

          {/* Completed Tasks Card */}
          <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat bg-base-100 shadow rounded-box p-4 border-l-4 border-success"
          >
            <div className="stat-figure text-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title text-base-content/70">Completed</div>
            <div className="stat-value text-success">{stats.completed}</div>
            <div className="stat-desc">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate</div>
          </motion.div>

          {/* Overdue Tasks Card */}
          <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat bg-base-100 shadow rounded-box p-4 border-l-4 border-error"
          >
            <div className="stat-figure text-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title text-base-content/70">Overdue</div>
            <div className="stat-value text-error">{stats.overdue}</div>
            <div className="stat-desc">Need attention</div>
          </motion.div>

          {/* High Priority Tasks Card */}
          <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat bg-base-100 shadow rounded-box p-4 border-l-4 border-warning"
          >
            <div className="stat-figure text-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="stat-title text-base-content/70">High Priority</div>
            <div className="stat-value text-warning">{stats.highPriority}</div>
            <div className="stat-desc">Critical tasks</div>
          </motion.div>

          {/* Unassigned Tasks Card */}
          <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="stat bg-base-100 shadow rounded-box p-4 border-l-4 border-info"
          >
            <div className="stat-figure text-info">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="stat-title text-base-content/70">Unassigned</div>
            <div className="stat-value text-info">{stats.unassigned}</div>
            <div className="stat-desc">Awaiting assignment</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6 bg-base-100 p-4 rounded-box shadow-lg"
      >
        <div className="flex flex-col md:flex-row gap-4">
        <div className="form-control flex-1">
  <div className="input-group flex">
    <input 
      type="text" 
      placeholder="Search tasks..." 
      className="input input-bordered w-full"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
    {/* <button className="btn btn-square flex-shrink-0">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </button> */}
  </div>
</div>

          <div className="flex flex-wrap gap-2">
            {/* View Mode Buttons */}
            <div className="btn-group">
              <button 
                className={`btn btn-sm ${viewMode === 'grouped' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('grouped')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('kanban')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
              <button 
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <select 
              className="select select-bordered select-sm" 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">In Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="DONE">Done</option>
            </select>

            <select 
              className="select select-bordered select-sm" 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select 
              className="select select-bordered select-sm" 
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project._id} value={project._id}>
                  {project.project_name || project.name}
                </option>
              ))}
            </select>

            <select 
              className="select select-bordered select-sm" 
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="all">All Members</option>
              <option value="unassigned">Unassigned</option>
              {members.map(member => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>

            <select 
              className="select select-bordered select-sm" 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="due_date-asc">Due Date (Earliest)</option>
              <option value="due_date-desc">Due Date (Latest)</option>
              <option value="priority-desc">Priority (Highest)</option>
              <option value="priority-asc">Priority (Lowest)</option>
              <option value="status-asc">Status (To Do First)</option>
              <option value="status-desc">Status (Completed First)</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Views based on the selected mode */}
      {/* Grouped view, Kanban view, and List view implementations */}
      
      {/* Grouped View */}
      {viewMode === 'grouped' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-8"
        >
          {/* Group tasks by member implementation */}
          {Object.values((() => {
            const memberTasks = {};
            
            // Initialize with all members (even those with no tasks)
            members.forEach(member => {
              memberTasks[member._id] = {
                member,
                tasks: []
              };
            });
            
            // Add an "unassigned" category
            memberTasks['unassigned'] = {
              member: { 
                _id: 'unassigned',
                name: 'Unassigned Tasks',
                profile_picture: null,
                email: '' 
              },
              tasks: []
            };
            
            // Group filtered tasks by member
            filteredTasks.forEach(task => {
              const assigneeId = task.assigned_to 
                ? (typeof task.assigned_to === 'object' ? task.assigned_to._id : task.assigned_to) 
                : 'unassigned';
              
              if (memberTasks[assigneeId]) {
                memberTasks[assigneeId].tasks.push(task);
              } else {
                memberTasks['unassigned'].tasks.push(task);
              }
            });
            
            // Return only members with tasks
            return Object.values(memberTasks).filter(group => group.tasks.length > 0);
          })()).length === 0 ? (
            <div className="text-center py-16 bg-base-100 rounded-box shadow">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-base-content opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-4 text-xl font-medium">No tasks found</h3>
              <p className="mt-2 text-base-content opacity-60">Try adjusting your filters or create a new task</p>
            </div>
          ) : (
            Object.values((() => {
              const memberTasks = {};
              
              // Initialize with all members
              members.forEach(member => {
                memberTasks[member._id] = {
                  member,
                  tasks: []
                };
              });
              
              // Add unassigned category
              memberTasks['unassigned'] = {
                member: { 
                  _id: 'unassigned',
                  name: 'Unassigned Tasks',
                  profile_picture: null,
                  email: '' 
                },
                tasks: []
              };
              
              // Group filtered tasks by member
              filteredTasks.forEach(task => {
                const assigneeId = task.assigned_to 
                  ? (typeof task.assigned_to === 'object' ? task.assigned_to._id : task.assigned_to) 
                  : 'unassigned';
                
                if (memberTasks[assigneeId]) {
                  memberTasks[assigneeId].tasks.push(task);
                } else {
                  memberTasks['unassigned'].tasks.push(task);
                }
              });
              
              return Object.values(memberTasks).filter(group => group.tasks.length > 0);
            })()).map(({ member, tasks }) => (
              <motion.div 
                key={member._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-base-100 rounded-box shadow-lg overflow-hidden"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleMemberExpand(member._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="avatar">
                        <div className="w-14 h-14 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-base-100">
                          {member.profile_picture ? (
                            <img src={member.profile_picture} alt={member.name} />
                          ) : (
                            <div className="bg-primary text-primary-content flex items-center justify-center h-full text-xl font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{member.name}</h3>
                        {member._id !== 'unassigned' && (
                          <p className="text-sm text-base-content/70">{member.email}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="stat-value text-lg">{tasks.length}</div>
                        <div className="stat-desc">Tasks</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="radial-progress text-primary" style={{"--value": getMemberCompletionRate(tasks), "--size": "3rem"}}>
                          {getMemberCompletionRate(tasks)}%
                        </div>
                        <div className="stat-desc mt-1">Completed</div>
                      </div>
                      
                      <button className="btn btn-circle btn-ghost btn-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-6 w-6 transform transition-transform ${expandedMember === member._id ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tasks for this member */}
                <AnimatePresence>
                  {expandedMember === member._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="border-t border-base-300">
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {tasks.map(task => (
                            <TaskCard 
                              key={task._id} 
                              task={task} 
                              users={members}
                              onEdit={() => handleEditTask(task)} 
                            />
                          ))}
                        </div>
                        
                        {tasks.length > 3 && (
                          <div className="flex justify-center pb-4">
                            <button className="btn btn-ghost btn-sm">
                              View All {tasks.length} Tasks
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {Object.entries({
            TODO: filteredTasks.filter(task => task.status === 'TODO' || !task.status),
            IN_PROGRESS: filteredTasks.filter(task => task.status === 'IN_PROGRESS'),
            REVIEW: filteredTasks.filter(task => task.status === 'REVIEW'),
            DONE: filteredTasks.filter(task => task.status === 'COMPLETED' || task.status === 'DONE')
          }).map(([status, statusTasks]) => (
            <motion.div 
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-base-100 rounded-box shadow-lg h-[calc(100vh-18rem)] flex flex-col"
            >
              <div className="p-4 border-b border-base-300 flex justify-between items-center sticky top-0 bg-base-100 z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusLabels[status]?.color || 'bg-info'}`}></div>
                  <h3 className="font-semibold">{statusLabels[status]?.name || status}</h3>
                </div>
                <div className="badge badge-md">{statusTasks.length}</div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {statusTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-base-300 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="mt-2 text-sm text-base-content/60">No tasks in this status</p>
                  </div>
                ) : (
                  statusTasks.map(task => (
                    <TaskCard 
                      key={task._id} 
                      task={task} 
                      users={members}
                      onEdit={() => handleEditTask(task)} 
                    />
                  ))
                )}
              </div>
              
              <div className="p-3 border-t border-base-300">
                <button className="btn btn-ghost btn-block btn-sm" onClick={handleCreateTask}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Task
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-base-100 rounded-box shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr className="bg-base-200">
                  <th>Title</th>
                  <th>Project</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {renderListView()}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-lg mb-4">{selectedTask.title}</h3>
            <p className="py-4">{selectedTask.description || 'No description provided'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Status</h4>
                <div className={`badge ${
                  selectedTask.status === 'COMPLETED' || selectedTask.status === 'DONE' ? 'badge-success' :
                  selectedTask.status === 'REVIEW' ? 'badge-secondary' :
                  selectedTask.status === 'IN_PROGRESS' ? 'badge-warning' :
                  'badge-info'
                }`}>
                  {selectedTask.status === 'COMPLETED' ? 'Completed' :
                   selectedTask.status === 'DONE' ? 'Done' :
                   selectedTask.status === 'IN_PROGRESS' ? 'In Progress' :
                   selectedTask.status === 'REVIEW' ? 'In Review' :
                   'To Do'}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Priority</h4>
                <div className={`badge ${
                  selectedTask.priority === 'HIGH' ? 'badge-error' :
                  selectedTask.priority === 'MEDIUM' ? 'badge-warning' :
                  'badge-success'
                }`}>
                  {selectedTask.priority || 'Low'}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Due Date</h4>
                <p>{selectedTask.deadline || selectedTask.due_date ? 
                  new Date(selectedTask.deadline || selectedTask.due_date).toLocaleDateString() : 
                  'No due date'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Assigned To</h4>
                {(() => {
                  let assignee = null;
                  
                  if (selectedTask.assigned_to) {
                    // If assigned_to is an object with name property
                    if (typeof selectedTask.assigned_to === 'object' && selectedTask.assigned_to.name) {
                      assignee = selectedTask.assigned_to;
                    } 
                    // If it's an ID, find the member
                    else {
                      assignee = members.find(m => String(m._id) === String(selectedTask.assigned_to));
                    }
                  }
                  
                  return assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="avatar">
                        <div className="w-8 rounded-full">
                          {assignee.profile_picture ? (
                            <img src={assignee.profile_picture} alt={assignee.name} />
                          ) : (
                            <div className="bg-primary text-primary-content flex items-center justify-center h-full">
                              {assignee.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <span>{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-base-content/50">Unassigned</span>
                  );
                })()}
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Created At</h4>
                <p>{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : 'Unknown'}</p>
              </div>

              <div>
                <h4 className="font-semibold text-xs uppercase text-base-content/60 mb-1">Last Updated</h4>
                <p>{selectedTask.updatedAt ? new Date(selectedTask.updatedAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setSelectedTask(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => handleEditTask(selectedTask)}>Edit Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceTasks;
//47ffYtsEXjONoywR
//mongodb+srv://moetazbenkhedher:47ffYtsEXjONoywR@planify.ry411py.mongodb.net/