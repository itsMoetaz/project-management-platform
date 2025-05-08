import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/Api';
import { format, isToday, isYesterday, isSameWeek, parseISO } from 'date-fns';

const ProjectHistory = ({ projectId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterAction, setFilterAction] = useState('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const fetchProjectHistory = async () => {
      if (!projectId) return;
      
      setLoading(true);
      try {
        const response = await api.get(`/api/projects/${projectId}/history`);
        setHistory(response.data || []);
      } catch (err) {
        console.error('Error fetching project history:', err);
        setError('Failed to load project history');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectHistory();
  }, [projectId]);

  // Get date group heading
  const getDateGroup = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    if (isSameWeek(date, new Date())) return 'This Week';
    return format(date, 'MMMM d, yyyy');
  };

  // Get icon based on action type
  const getActionIcon = (action) => {
    switch (action) {
      case 'CREATE_TASK':
        return (
          <div className="bg-primary/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'COMPLETE_TASK':
        return (
          <div className="bg-success/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'ASSIGN_TASK':
        return (
          <div className="bg-info/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        );
      case 'UPDATE_TASK':
        return (
          <div className="bg-warning/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'DELETE_TASK':
        return (
          <div className="bg-error/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        );
      case 'STATUS_CHANGE':
        return (
          <div className="bg-secondary/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        );
      case 'CREATE_RESOURCE':
        return (
          <div className="bg-accent/20 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="bg-base-300 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  // Filter history based on action type and search text
  const filteredHistory = history.filter(item => {
    const matchesAction = filterAction === 'all' || item.action === filterAction;
    const matchesSearch = !searchText || 
      item.description.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.user?.name && item.user.name.toLowerCase().includes(searchText.toLowerCase()));
    
    return matchesAction && matchesSearch;
  });

  // Group history items by date
  const dateGroups = {};
  filteredHistory.forEach(item => {
    const group = getDateGroup(item.createdAt);
    if (!dateGroups[group]) {
      dateGroups[group] = [];
    }
    dateGroups[group].push(item);
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="loading loading-spinner loading-md"></div>
        <span className="ml-2">Loading history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 text-error p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 bg-base-200/50 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="mt-2 text-base-content/60">No history available for this project yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-xl shadow-lg">
      <div className="p-5 border-b border-base-200">
        <h3 className="text-xl font-bold">Project History</h3>
        <p className="text-sm text-gray-400">Recent activities in this project</p>
      </div>
      
      {/* Filter section */}
      <div className="p-4 border-b border-base-200 bg-base-200/30">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="search" 
              className="input input-bordered w-full pl-10"
              placeholder="Search history..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          
          <select 
            className="select select-bordered"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="CREATE_TASK">Task Creation</option>
            <option value="UPDATE_TASK">Task Updates</option>
            <option value="COMPLETE_TASK">Task Completion</option>
            <option value="DELETE_TASK">Task Deletion</option>
            <option value="ASSIGN_TASK">Task Assignment</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="CREATE_RESOURCE">Resource Creation</option>
          </select>
        </div>
      </div>
      
      {/* History content */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-8 bg-base-200/50 rounded-lg m-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-text-gray-400">
            {searchText || filterAction !== 'all' 
              ? 'No history entries match your filters' 
              : 'No history available for this project yet.'}
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(dateGroups).map(([dateGroup, items]) => (
            <div key={dateGroup} className="py-2">
              <div className="px-4 pt-3 pb-1">
                <h4 className="text-sm font-medium text-text-gray-400">{dateGroup}</h4>
              </div>
              <div className="divide-y divide-base-200/50">
                {items.map((item, index) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-base-200/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {getActionIcon(item.action)}
                      
                      <div className="flex-1">
                        <p className="font-medium">
                          <span className="text-primary">{item.user?.name || 'A user'}</span> {item.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400">
                            {format(new Date(item.createdAt), "h:mm a")}
                          </p>
                          {item.task && (
                            <div className="badge badge-sm badge-outline">
                              {item.task.title || 'Task'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filteredHistory.length > 20 && (
        <div className="p-3 text-center border-t border-base-200">
          <button className="btn btn-ghost btn-sm">
            View more
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectHistory;