import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../utils/Api';
import useSession from '../../hooks/useSession';
import { hasPermission, getUserRole } from '../../utils/permissionUtils';

const WorkspaceMembers = () => {
  const { workspace, refreshWorkspace, projects } = useOutletContext() || {};
  const { user } = useSession();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [memberStats, setMemberStats] = useState({});
  const [activePopover, setActivePopover] = useState(null);
  const [memberProfiles, setMemberProfiles] = useState({});
  const popoverRef = useRef(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  
  useEffect(() => {
    if (workspace) {
      fetchMembers();
    }
  }, [workspace]);
  
  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setActivePopover(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      // Get detailed member information including workspace roles
      const response = await api.get(`/api/workspaces/${workspace._id}/members`);
      setMembers(response.data);
      
      // Fetch stats for each member
      fetchMemberStats(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load workspace members', {
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
  
// Update the fetchMemberStats function to get accurate counts
const fetchMemberStats = async (membersList) => {
  try {
    const statsObj = {};
    const profilesObj = {};
    
    for (const member of membersList) {
      try {
        // Default stats
        const memberStats = { 
          workspacesCount: 1, 
          projectsCount: 0,
          tasksCount: 0,
          completedTasksCount: 0,
          contributionPercentage: 0 
        };
        
        // Get workspace count from the server
        try {
          const countResponse = await api.get(`/api/users/${member._id}/workspaces/count`);
          if (countResponse.data && typeof countResponse.data.count === 'number') {
            memberStats.workspacesCount = countResponse.data.count;
          }
        } catch (countError) {
          console.warn(`Error getting workspace count for ${member._id}:`, countError);
          // Keep default count (1)
        }
        
        // ... rest of your stats calculation
        
        // Get profile info
        let memberProfile = {
          _id: member._id,
          name: member.name || "User",
          email: member.email || "",
          bio: 'No bio available',
          createdAt: member.createdAt || new Date().toISOString()
        };
        
        try {
          const profileResponse = await api.get(`/api/users/${member._id}/profile`);
          if (profileResponse.data && profileResponse.data.profile) {
            memberProfile = profileResponse.data.profile;
          }
        } catch (profileError) {
          console.warn(`Error fetching profile for ${member._id}:`, profileError);
          // Keep default profile
        }
        
        // Update state
        statsObj[member._id] = memberStats;
        profilesObj[member._id] = memberProfile;
        
        setMemberStats(prev => ({ ...prev, [member._id]: memberStats }));
        setMemberProfiles(prev => ({ ...prev, [member._id]: memberProfile }));
      } catch (memberError) {
        console.error(`Error processing member ${member._id}:`, memberError);
      }
      
      // Add slight delay between members
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setMemberStats(statsObj);
    setMemberProfiles(profilesObj);
    
  } catch (error) {
    console.error('Error fetching member data:', error);
  }
};
  
  const handleRoleChange = async (memberId, newRole) => {
    if (!hasPermission('edit', workspace, user._id)) {
      toast.error('You do not have permission to change member roles', {
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
      return;
    }
    
    try {
      setUpdating(memberId);
      await api.put(`/api/workspaces/${workspace._id}/members/${memberId}`, {
        role: newRole
      });
      
      toast.success('Member role updated successfully', {
        style: {
          background: '#4CAF50',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
      // Refresh the member list
      fetchMembers();
      // Also refresh the workspace to update all UI components
      refreshWorkspace();
      
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role', {
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
    } finally {
      setUpdating(null);
    }
  };
  
  const handleRemoveMember = async (memberId) => {
    if (!hasPermission('edit', workspace, user._id)) {
      toast.error('You do not have permission to remove members', {
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
      return;
    }
    
    if (!window.confirm('Are you sure you want to remove this member from the workspace?')) {
      return;
    }
    
    try {
      setUpdating(memberId);
      await api.delete(`/api/workspaces/${workspace._id}/members/${memberId}`);
      
      toast.success('Member removed successfully', {
        style: {
          background: '#4CAF50',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
      // Refresh the member list
      fetchMembers();
      // Also refresh the workspace
      refreshWorkspace();
      
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member', {
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
          borderRadius: '0px'
        }
      });
    } finally {
      setUpdating(null);
    }
  };
  
  const togglePopover = (memberId, event) => {
    if (activePopover === memberId) {
      setActivePopover(null);
    } else {
      // Calculate position based on the clicked element
      if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        
        // Position it centered above the avatar
        setPopoverPosition({
          top: rect.top - 10, // Position it slightly above the avatar
          left: Math.max(10, rect.left - 150 + rect.width / 2) // Center it, but keep it on screen
        });
      }
      setActivePopover(memberId);
    }
  };
  
  // Get current user's role in this workspace
  const currentUserRole = getUserRole(workspace, user?._id);
  const canManageRoles = currentUserRole === 'owner' || currentUserRole === 'admin';
  
  // Format date to display in a user-friendly way
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="space-y-6">
      <ToastContainer />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Workspace Members</h1>
      </div>
      
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg opacity-70">No members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    {canManageRoles && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id}>
                      <td>
                        <div className="flex items-center gap-3 relative">
                          {/* Profile Avatar with Popover */}
                          <div 
                            className="avatar cursor-pointer"
                            onClick={(e) => togglePopover(member._id, e)}
                            onMouseEnter={(e) => togglePopover(member._id, e)}
                          >
                            <div className="w-10 rounded-full">
                              {member.profile_picture ? 
                                <img src={member.profile_picture} alt="Profile"/>
                                :
                                <span className="bg-primary text-white flex items-center justify-center h-full">
                                  {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase() || '?'}
                                </span>
                              }
                            </div>
                          </div>
                          
                          {/* User Profile Popover */}
                          {activePopover === member._id && (
                            <div 
                              ref={popoverRef}
                              className="fixed z-50 text-sm transition-opacity bg-base-100 border border-base-300 rounded-lg shadow-xl"
                              style={{
                                top: `${popoverPosition.top}px`,
                                left: `${popoverPosition.left}px`,
                                width: '300px',
                                maxHeight: '80vh',
                                overflowY: 'auto'
                              }}
                              onMouseLeave={() => setActivePopover(null)}
                            >
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="avatar">
                                    <div className="w-12 h-12 rounded-full">
                                      {member.profile_picture ? 
                                        <img src={member.profile_picture} alt={member.name} className="rounded-full"/>
                                        :
                                        <span className="bg-primary text-white flex items-center justify-center h-full text-lg">
                                          {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase() || '?'}
                                        </span>
                                      }
                                    </div>
                                  </div>
                                  <div>
                                    <span className="badge badge-primary">{member.role || 'viewer'}</span>
                                  </div>
                                </div>
                                <p className="text-base font-semibold leading-none text-base-content">
                                  {member.name}
                                </p>
                                <p className="mb-3 text-sm font-normal opacity-70">
                                  {member.email}
                                </p>
                                <p className="mb-4 text-sm">
                                  {memberProfiles[member._id]?.bio || 'No bio available'}
                                </p>
                                
                                {/* Stats Row */}
                                <ul className="grid grid-cols-3 text-sm mb-2 gap-1">
                                  <li>
                                    <div className="text-center">
                                      <span className="font-semibold block text-base-content text-lg">
                                        {memberStats[member._id]?.workspacesCount || '1'}
                                      </span>
                                      <span className="opacity-70 text-xs">Workspaces</span>
                                    </div>
                                  </li>
                                  <li>
                                    <div className="text-center">
                                      <span className="font-semibold block text-base-content text-lg">
                                        {memberStats[member._id]?.projectsCount || '0'}
                                      </span>
                                      <span className="opacity-70 text-xs">Projects</span>
                                    </div>
                                  </li>
                                  <li>
                                    <div className="text-center">
                                      <span className="font-semibold block text-base-content text-lg">
                                        {memberStats[member._id]?.tasksCount || '0'}
                                      </span>
                                      <span className="opacity-70 text-xs">Tasks</span>
                                    </div>
                                  </li>
                                </ul>
                                
                                {/* Progress bar for task completion */}
                                {memberStats[member._id]?.tasksCount > 0 && (
                                  <div className="mt-3">
                                    <div className="flex justify-between mb-1 text-xs">
                                      <span>Tasks completed</span>
                                      <span>
                                        {memberStats[member._id]?.completedTasksCount || '0'} / {memberStats[member._id]?.tasksCount || '0'}
                                      </span>
                                    </div>
                                    <div className="w-full bg-base-300 rounded-full h-2.5">
                                      <div 
                                        className="bg-primary h-2.5 rounded-full" 
                                        style={{ 
                                          width: `${memberStats[member._id]?.contributionPercentage || 0}%` 
                                        }}
                                      ></div>
                                    </div>
                                    <div className="text-right text-xs mt-1">
                                      <span className="font-medium">
                                        {memberStats[member._id]?.contributionPercentage || 0}% complete
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Member since date */}
                                <div className="mt-3 text-xs opacity-70 text-center pt-2 border-t border-base-300">
                                  Member since: {formatDate(memberProfiles[member._id]?.createdAt || member.createdAt || member.joinedAt)}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <div className="font-bold">{member.name}</div>
                            {workspace.owner === member._id && (
                              <div className="text-xs opacity-50">Workspace Owner</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{member.email}</td>
                      <td>
                        {workspace.owner === member._id ? (
                          <span className="badge badge-primary">Owner</span>
                        ) : canManageRoles ? (
                          <select 
                            className="select select-bordered select-sm w-full max-w-xs"
                            value={member.role || 'viewer'}
                            onChange={(e) => handleRoleChange(member._id, e.target.value)}
                            disabled={updating === member._id || member._id === user?._id}
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        ) : (
                          <span className="badge">{member.role || 'viewer'}</span>
                        )}
                      </td>
                      {canManageRoles && (
                        <td>
                          {workspace.owner !== member._id && member._id !== user?._id && (
                            <button 
                              className="btn btn-sm btn-error"
                              onClick={() => handleRemoveMember(member._id)}
                              disabled={updating === member._id}
                            >
                              {updating === member._id ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : 'Remove'}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="card bg-base-200 shadow-lg">
        <div className="card-body">
          <h2 className="card-title mb-4">Member Roles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-base-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Viewer</h3>
              <p className="opacity-70">Can view projects and tasks, but cannot make changes.</p>
            </div>
            <div className="border border-base-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Editor</h3>
              <p className="opacity-70">Can create and edit projects, tasks, and invite new members.</p>
            </div>
            <div className="border border-base-300 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-2">Admin</h3>
              <p className="opacity-70">Full access to manage the workspace, except deletion.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceMembers;