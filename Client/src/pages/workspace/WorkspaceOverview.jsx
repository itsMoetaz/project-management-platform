import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import api from '../../utils/Api';
import { toast, ToastContainer } from 'react-toastify';
import useSession from '../../hooks/useSession';
import { hasPermission, getUserRole } from '../../utils/permissionUtils';
import ChatBubble from '../../components/chat/ChatBubble';

// Main component for displaying the workspace overview
const WorkspaceOverview = () => {
  const navigate = useNavigate(); // For navigating to other pages
  const { workspace, refreshWorkspace } = useOutletContext() || {}; // Get workspace data from parent
  const { user } = useSession(); // Get current user data
  const { id: workspaceId } = useParams(); // Get workspace ID from URL

  // State variables for managing UI and data
  const [isLoading, setIsLoading] = useState(true); // Tracks if page is loading
  const [owner, setOwner] = useState(null); // Stores workspace owner details
  const [ownerLoading, setOwnerLoading] = useState(false); // Tracks owner data loading
  const [isEditing, setIsEditing] = useState(false); // Tracks if editing workspace
  const [editData, setEditData] = useState({ name: '', description: '' }); // Stores edit form data
  const [isSaving, setIsSaving] = useState(false); // Tracks if saving changes
  const [isDeleting, setIsDeleting] = useState(false); // Tracks if deleting workspace
  const [showDeleteModal, setShowDeleteModal] = useState(false); // Shows delete confirmation modal
  const modalRef = useRef(null); // Reference for delete modal
  const [isInviting, setIsInviting] = useState(false); // Tracks if inviting members
  const [showInviteModal, setShowInviteModal] = useState(false); // Shows invite modal
  const [pendingInvitations, setPendingInvitations] = useState([]); // Stores pending invitations
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false); // Tracks invitation loading
  const [showInvitations, setShowInvitations] = useState(false); // Shows pending invitations list
  const inviteModalRef = useRef(null); // Reference for invite modal
  const emailInputRef = useRef(null); // Reference for email input
  const [verifiedUsers, setVerifiedUsers] = useState([]); // Stores verified users for invite
  const [isLoadingUsers, setIsLoadingUsers] = useState(false); // Tracks user loading
  const [showUserDropdown, setShowUserDropdown] = useState(false); // Shows user dropdown
  const userDropdownRef = useRef(null); // Reference for user dropdown
  const [selectedUser, setSelectedUser] = useState(null); // Stores selected user for invite
  const tomorrow = new Date(); // Date for resignation form
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [showResignationModal, setShowResignationModal] = useState(false); // Shows resignation modal
  const [resignationForm, setResignationForm] = useState({
    userId: user?._id || '',
    workspaceId: workspaceId || '',
    reason: 'Personal Reasons',
    effectiveDate: tomorrow.toISOString().split('T')[0],
    comment: '',
  }); // Stores resignation form data
  const [resignationLoading, setResignationLoading] = useState(false); // Tracks resignation submission
  const [userResignation, setUserResignation] = useState(null); // Stores current user's resignation
  const [resignationCount, setResignationCount] = useState(0); // Stores number of resignations
const [commentText, setCommentText] = useState('');

  // Effect to initialize data when workspace or user changes
  useEffect(() => {
    if (workspace) {
      setIsLoading(false);
      setEditData({
        name: workspace.name || '',
        description: workspace.description || '',
      });

      if (workspace.owner && (workspace.owner.name || workspace.owner.email)) {
        setOwner(workspace.owner);
      } else if (workspace.owner && workspace.owner._id) {
        fetchOwnerDetails(workspace.owner._id);
      }

      setResignationForm((prev) => ({
        ...prev,
        workspaceId: workspaceId || '',
        userId: user?._id || '',
      }));

      fetchResignationCount(); // Fetch resignation count
    }

    if (user?._id) {
      fetchUserResignation(); // Fetch user's resignation
    }
  }, [workspace, workspaceId, user]);

  // Effect to handle clicks outside modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteModal && modalRef.current && !modalRef.current.contains(event.target)) {
        setShowDeleteModal(false);
      }
      if (showInviteModal && inviteModalRef.current && !inviteModalRef.current.contains(event.target)) {
        setShowInviteModal(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target) &&
        emailInputRef.current &&
        !emailInputRef.current.contains(event.target)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteModal, showInviteModal]);
// Add this useEffect after your other useEffect hooks
useEffect(() => {
  console.log("Resignation data changed:", userResignation);
  
  // If the resignation data changes and we have valid data, force a re-render
  if (userResignation && userResignation._id) {
    // You could trigger any state change here to force re-render
    // For example:
    setResignationCount(prev => {
      // Force a re-render by fetching the current count
      fetchResignationCount();
      return prev;
    });
  }
}, [userResignation]);
  // Fetch owner details
  const fetchOwnerDetails = async (ownerId) => {
    setOwnerLoading(true);
    try {
      const response = await api.get(`/api/users/basic/${ownerId}`);
      if (response.data) {
        setOwner(response.data);
      }
    } catch (error) {
      console.error('Error fetching owner details:', error);
    } finally {
      setOwnerLoading(false);
    }
  };

  // Fetch verified users for invite dropdown
  const fetchVerifiedUsers = async (search = '') => {
    setIsLoadingUsers(true);
    try {
      const ownerId = workspace?.owner?._id;
      const response = await api.get(
        `/api/users/verified${search ? `?search=${search}` : '?search='}${
          ownerId ? `&excludeUser=${ownerId}` : ''
        }`
      );
      setVerifiedUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching verified users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch current user's resignation
  const fetchUserResignation = async () => {
    console.log('Fetching resignation for userId:', user._id, 'workspaceId:', workspaceId);
    try {
      const response = await api.get(`/api/resignations?userId=${user._id}&workspaceId=${workspaceId}`);
      if (response.data && response.data.length > 0) {
        setUserResignation(response.data[0]);
      } else {
        setUserResignation(null);
      }
    } catch (error) {
      console.error('Error fetching resignation:', error);
      console.log('Server response:', error.response?.data);
      setUserResignation(null);
    }
  };

  // Fetch resignation count for the workspace
  const fetchResignationCount = async () => {
    try {
      const response = await api.get(`/api/resignations?workspaceId=${workspaceId}`);
      setResignationCount(response.data.length || 0);
    } catch (error) {
      console.error('Error fetching resignation count:', error);
      setResignationCount(0);
      toast.error('Failed to load resignation count');
    }
  };

  // Toggle edit mode
  const handleEditWorkspace = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditData({
        name: workspace?.name || '',
        description: workspace?.description || '',
      });
    }
  };

  // Update edit form data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  // Save workspace changes
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      if (!editData.name.trim()) {
        toast.error('Workspace name is required');
        setIsSaving(false);
        return;
      }
      const workspaceData = {
        name: editData.name.trim(),
        description: editData.description.trim(),
        owner: workspace.owner._id,
      };
      const response = await api.put(`/api/workspaces/updateWorkspace/${workspace._id}`, workspaceData);
      if (response.data) {
        toast.success('Workspace updated successfully');
        await refreshWorkspace();
        setIsEditing(false);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((msg) => toast.error(msg));
      } else {
        toast.error(error.response?.data?.message || 'Failed to update workspace');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      name: workspace?.name || '',
      description: workspace?.description || '',
    });
  };

  // Open delete modal
  const openDeleteModal = () => setShowDeleteModal(true);
  const cancelDelete = () => setShowDeleteModal(false);

  // Delete workspace
  const confirmDeleteWorkspace = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/api/workspaces/${workspace._id}`);
      toast.success('Workspace deleted successfully');
      navigate('/acceuil');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Validate email format
  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  // Open invite modal
  const openInviteModal = () => {
    setShowInviteModal(true);
    fetchPendingInvitations();
  };

  // Close invite modal
  const closeInviteModal = () => {
    setShowInviteModal(false);
  };

  // Fetch pending invitations
  const fetchPendingInvitations = async () => {
    if (!workspace?._id) return;
    try {
      setIsLoadingInvitations(true);
      const response = await api.get(`/api/workspaces/${workspace._id}/invitations`);
      setPendingInvitations(response.data.filter((inv) => inv.status === 'pending'));
      setShowInvitations(true);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view invitations');
      } else {
        toast.error('Could not load pending invitations');
      }
      setShowInvitations(false);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Select user for invitation
  const selectUser = (user) => {
    if (emailInputRef.current) {
      emailInputRef.current.value = user.email;
    }
    setSelectedUser(user);
    setShowUserDropdown(false);
  };

  // Submit resignation
  const handleSubmitResignation = async (e) => {
    e.preventDefault();
    setResignationLoading(true);
    try {
      if (!resignationForm.userId || !/^[0-9a-fA-F]{24}$/.test(resignationForm.userId)) {
        toast.error('User not authenticated or invalid user ID');
        setResignationLoading(false);
        return;
      }
      if (!resignationForm.workspaceId || !/^[0-9a-fA-F]{24}$/.test(resignationForm.workspaceId)) {
        toast.error('Invalid workspace ID');
        setResignationLoading(false);
        return;
      }
      const selectedDate = new Date(resignationForm.effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        toast.error('Effective date must be a future date');
        setResignationLoading(false);
        return;
      }
      const payload = {
        ...resignationForm,
              comment: commentText, // Use the separate comment state

        effectiveDate: new Date(resignationForm.effectiveDate).toISOString(),
      };
      console.log('Submitting resignation payload:', payload);
      const response = await api.post('/api/resignations/submit', payload);
    // Update both resignation record and count
    // IMPORTANT: Extract the resignation object from the response
    // This is the key fix - check if response.data has resignation property
    if (response.data.resignation) {
      // Set the actual resignation object, not the wrapper
      setUserResignation(response.data.resignation);
    } else {
      // Fallback in case the API changes
      setUserResignation(response.data);
    }
    
    // Update resignation count
    setResignationCount(prevCount => prevCount + 1);
      toast.success('Resignation submitted successfully');
      setShowResignationModal(false);
      setResignationForm({
        userId: user?._id || '',
        workspaceId: workspaceId || '',
        reason: 'Personal Reasons',
        effectiveDate: tomorrow.toISOString().split('T')[0],
        comment: '',
      });
      fetchResignationCount(); // Update resignation count after submission
    } catch (err) {
      console.error('Error submitting resignation:', err);
      console.log('Server response:', err.response?.data);
      toast.error(err.response?.data?.message || 'Failed to submit resignation');
    } finally {
      setResignationLoading(false);
    }
  };

  // Show loading spinner if page is loading
  if (isLoading && !workspace) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  // Delete modal component
  const DeleteModal = () => {
    if (!showDeleteModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div
          className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-bold text-lg text-error mb-2">Delete Workspace</h3>
          <p className="py-4">
            Are you sure you want to delete "{workspace?.name}"? This action cannot be undone and all associated
            projects and tasks will be permanently deleted.
          </p>
          <div className="modal-action flex justify-end gap-2 mt-6">
            <button onClick={cancelDelete} className="btn btn-outline" disabled={isDeleting}>
              Cancel
            </button>
            <button onClick={confirmDeleteWorkspace} className="btn btn-error" disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Deleting...
                </>
              ) : (
                'Delete Workspace'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Invite modal component
  const InviteModal = () => {
    if (!showInviteModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div
          className="bg-base-100 rounded-lg shadow-xl p-6 max-w-2xl w-full"
          ref={inviteModalRef}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Invite Team Members</h3>
            <button onClick={closeInviteModal} className="btn btn-sm btn-circle">
              ✕
            </button>
          </div>
          <p className="text-sm opacity-70 mb-4">
            Send invitations to team members by email. They'll receive instructions to join this workspace.
          </p>
          <div className="mb-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                let emailValue;
                if (selectedUser) {
                  emailValue = selectedUser.email;
                } else if (emailInputRef.current) {
                  emailValue = emailInputRef.current.value;
                } else {
                  toast.error('Please enter a valid email address');
                  return;
                }
                if (!emailValue || !validateEmail(emailValue)) {
                  toast.error('Please enter a valid email address');
                  return;
                }
                setIsInviting(true);
                try {
                  const response = await api.post(`/api/workspaces/${workspace._id}/invite`, {
                    email: emailValue,
                  });
                  toast.success(`Invitation sent to ${emailValue}`);
                  if (emailInputRef.current) {
                    emailInputRef.current.value = '';
                  }
                  setSelectedUser(null);
                  fetchPendingInvitations();
                  if (response.data && response.data.userId) {
                    console.log('Invitation sent to user:', response.data.userId);
                  }
                } catch (error) {
                  if (error.response?.status === 400) {
                    toast.error(error.response.data.message || 'This user has already been invited');
                  } else {
                    toast.error(error.response?.data?.message || 'Failed to send invitation');
                  }
                } finally {
                  setIsInviting(false);
                }
              }}
            >
              <div className="form-control w-full">
                <label htmlFor="invite-email" className="label">
                  <span className="label-text font-semibold">Email Address</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative w-full">
                    {selectedUser ? (
                      <div className="flex items-center border rounded-lg p-2 bg-base-100">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="avatar">
                            <div className="w-10 rounded-full">
                              {selectedUser.profile_picture ? (
                                <img src={selectedUser.profile_picture} alt={selectedUser.name || selectedUser.email} />
                              ) : (
                                <div className="bg-primary text-white flex items-center justify-center h-full">
                                  {(selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || 'U').toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{selectedUser.name || 'Unnamed User'}</p>
                            <p className="text-sm opacity-70">{selectedUser.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(null);
                            emailInputRef.current.value = '';
                            emailInputRef.current.focus();
                          }}
                          className="btn btn-ghost btn-sm btn-circle"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <input
                        id="invite-email"
                        type="email"
                        ref={emailInputRef}
                        placeholder="colleague@example.com"
                        className="input input-bordered w-full"
                        disabled={isInviting}
                        required
                        onFocus={() => {
                          fetchVerifiedUsers();
                          setShowUserDropdown(true);
                        }}
                        onChange={(e) => {
                          fetchVerifiedUsers(e.target.value);
                        }}
                      />
                    )}
                    {!selectedUser && showUserDropdown && (
                      <div
                        className="absolute mt-1 w-full bg-base-100 shadow-lg rounded-lg border border-base-300 z-50 max-h-60 overflow-y-auto"
                        ref={userDropdownRef}
                      >
                        {isLoadingUsers ? (
                          <div className="flex justify-center items-center p-4">
                            <span className="loading loading-spinner loading-sm"></span>
                          </div>
                        ) : verifiedUsers.length === 0 ? (
                          <div className="p-4 text-center text-sm opacity-70">
                            No verified users found. You can type an email address directly.
                          </div>
                        ) : (
                          <ul>
                            {verifiedUsers.map((user) => (
                              <li
                                key={user._id}
                                className="hover:bg-base-200 cursor-pointer p-2"
                                onClick={() => selectUser(user)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="avatar">
                                    <div className="w-10 rounded-full">
                                      {user.profile_picture ? (
                                        <img src={user.profile_picture} alt={user.name || user.email} />
                                      ) : (
                                        <div className="bg-primary text-white flex items-center justify-center h-full">
                                          {(user.name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.name || 'Unnamed User'}</p>
                                    <p className="text-sm opacity-70">{user.email}</p>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={isInviting}>
                    {isInviting ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
          {showInvitations && (
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Pending Invitations</h4>
              {isLoadingInvitations ? (
                <div className="flex justify-center py-4">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-4 opacity-60">
                  <p>No pending invitations</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Sent</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingInvitations.map((invitation) => (
                        <tr key={invitation._id}>
                          <td>{invitation.recipient_email}</td>
                          <td>{formatDate(invitation.createdAt)}</td>
                          <td>{formatDate(invitation.expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <div className="mt-6 bg-base-200 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How it works</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm opacity-70">
              <li>An invitation email will be sent to the address you provide</li>
              <li>The recipient has 48 hours to accept the invitation</li>
              <li>They'll create an account or sign in with that email</li>
              <li>Once accepted, they'll be added as a viewer to this workspace</li>
            </ol>
          </div>
        </div>
      </div>
    );
  };

  // Resignation modal component
  const ResignationModal = () => {
    if (!showResignationModal) return null;
    const tomorrowMin = new Date();
    tomorrowMin.setDate(tomorrowMin.getDate() + 1);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-primary">Submit Resignation</h3>
            <button
              onClick={() => setShowResignationModal(false)}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmitResignation} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Reason</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={resignationForm.reason}
                onChange={(e) => setResignationForm({ ...resignationForm, reason: e.target.value })}
                required
              >
                <option value="Personal Reasons">Personal Reasons</option>
                <option value="Career Change">Career Change</option>
                <option value="Relocation">Relocation</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Effective Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={resignationForm.effectiveDate}
                min={tomorrowMin.toISOString().split('T')[0]}
                onChange={(e) => setResignationForm({ ...resignationForm, effectiveDate: e.target.value })}
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Comment</span>
              </label>
<textarea
  key="resignation-comment-textarea"

  className="textarea textarea-bordered w-full"
  placeholder="Optional comment..."
  value={commentText}
  onChange={(e) => {
    const newText = e.target.value;
    setCommentText(newText);
  }}></textarea>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowResignationModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary ${resignationLoading ? 'loading' : ''}`}
                disabled={resignationLoading}
              >
                {resignationLoading ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Display current user's resignation
// Updated ResignationDisplay component with key
const ResignationDisplay = () => {
  console.log("Rendering ResignationDisplay with data:", userResignation);
  
  if (!userResignation) return null;
  
  const handleCancelResignation = async () => {
    try {
      await api.delete(`/api/resignations/${userResignation._id}`);
      setUserResignation(null);
      setResignationCount(prevCount => Math.max(0, prevCount - 1));
      toast.success('Resignation canceled successfully');
    } catch (error) {
      console.error('Error canceling resignation:', error);
      toast.error('Failed to cancel resignation');
    }
  };

  return (
    <div className="card bg-base-200 shadow-lg mt-6">
      <div className="card-body">
        <h2 className="card-title text-xl mb-4">Your Resignation</h2>
        <div className="space-y-2">
          <p><strong>Reason:</strong> {userResignation.reason}</p>
          <p><strong>Effective Date:</strong> {formatDate(userResignation.effectiveDate)}</p>
          <p><strong>Comment:</strong> {userResignation.comment || 'N/A'}</p>
          <button
            onClick={handleCancelResignation}
            className="btn btn-error btn-sm mt-4"
          >
            Cancel Resignation
          </button>
        </div>
      </div>
    </div>
  );
};

  // Main UI
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-8">
        <DeleteModal />
        <InviteModal />
        <ResignationModal />
        <ToastContainer />
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Workspace Overview</h1>
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <button onClick={handleSaveChanges} className="btn btn-success gap-2" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
                <button onClick={handleCancelEdit} className="btn btn-outline gap-2" disabled={isSaving}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {hasPermission('edit', workspace, user?._id) && (
                  <button onClick={handleEditWorkspace} className="btn btn-outline btn-success gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Workspace
                  </button>
                )}
                {hasPermission('delete', workspace, user?._id) && (
                  <button onClick={openDeleteModal} className="btn btn-outline btn-error gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete Workspace
                  </button>
                )}
                {hasPermission('invite', workspace, user?._id) && (
                  <button onClick={openInviteModal} className="btn btn-primary gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Invite Members
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!user?._id) {
                      toast.error('User not authenticated');
                      return;
                    }
                    setResignationForm({
                      ...resignationForm,
                      userId: user._id,
                      workspaceId: workspaceId,
                    });
                    setShowResignationModal(true);
                  }}
                  className="btn btn-error gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 11V7a2 2 0 114 0v4m-2 6h.01M19 11a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Exit
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text font-semibold">Workspace Name</span>
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={editData.name}
                      onChange={handleInputChange}
                      className="input input-bordered w-full"
                      placeholder="Enter workspace name"
                    />
                  </label>
                </div>
                <div>
                  <label className="form-control w-full">
                    <div className="label">
                      <span className="label-text font-semibold">Description</span>
                    </div>
                    <textarea
                      name="description"
                      value={editData.description}
                      onChange={handleInputChange}
                      className="textarea textarea-bordered w-full h-32"
                      placeholder="Enter workspace description"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <h2 className="card-title text-2xl mb-4">{workspace?.name || 'Workspace'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Description</h3>
                      <p className="text-base-content opacity-80">
                        {workspace?.description || 'No description provided'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Created On</h3>
                      <p className="text-base-content opacity-80">
                        {workspace?.createdAt ? format(new Date(workspace.createdAt), 'PPP') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Owner</h3>
                      <div className="flex items-center gap-2">
                        {owner ? (
                          <>
                            <div className="avatar">
                              <div className="w-10 rounded-full">
                                {owner.profile_picture ? (
                                  <img src={owner.profile_picture} alt="Owner" />
                                ) : (
                                  <span className="bg-primary text-white flex items-center justify-center h-full">
                                    {owner.name?.charAt(0).toUpperCase() || owner.email?.charAt(0) || 'O'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-base-content">{owner.name || owner.email}</span>
                          </>
                        ) : ownerLoading ? (
                          <>
                            <div className="avatar">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                <span className="loading loading-spinner loading-xs"></span>
                              </div>
                            </div>
                            <span className="text-base-content">Loading owner details...</span>
                          </>
                        ) : workspace?.owner ? (
                          <>
                            <div className="avatar">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {workspace.owner._id?.toString().charAt(0) || 'O'}
                                </span>
                              </div>
                            </div>
                            <span className="text-base-content">
                              Owner ID: {workspace.owner._id?.toString().substring(0, 8)}...
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="avatar">
                              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                                <span className="text-sm font-medium">O</span>
                              </div>
                            </div>
                            <span className="text-base-content">Owner information not available</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Projects</h3>
                      <p className="text-base-content opacity-80">{workspace?.projects?.length || 0} project(s)</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Members</h3>
                      <p className="text-base-content opacity-80">{workspace?.members?.length || 0} member(s)</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Your Role</h3>
                      <p className="text-base-content opacity-80">
                        {getUserRole(workspace, user?._id)?.charAt(0).toUpperCase() +
                          getUserRole(workspace, user?._id)?.slice(1) || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="stat bg-base-200 shadow rounded-lg">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div className="stat-title">Total Projects</div>
            <div className="stat-value text-primary">{workspace?.projects?.length || 0}</div>
          </div>
          <div className="stat bg-base-200 shadow rounded-lg">
            <div className="stat-figure text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Active Tasks</div>
            <div className="stat-value text-secondary">
              {workspace?.projects?.reduce(
                (total, project) =>
                  total + (project?.tasks?.filter((task) => task?.status !== 'completed')?.length || 0),
                0
              ) || 0}
            </div>
          </div>
          <div className="stat bg-base-200 shadow rounded-lg">
            <div className="stat-figure text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Team Members</div>
            <div className="stat-value text-accent">{workspace?.members?.length || 0}</div>
          </div>
          <div
            className="stat bg-base-200 shadow rounded-lg cursor-pointer hover:bg-base-300"
            onClick={() => navigate(`/workspace/${workspaceId}/resignations`)}
          >
            <div className="stat-figure text-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 11V7a2 2 0 114 0v4m-2 6h.01M19 11a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div className="stat-title">Resignations</div>
            <div className="stat-value text-error">{resignationCount}</div>
          </div>
        </div>
        <div className="card bg-base-200 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Recent Activity</h2>
            <p className="text-base-content opacity-80 text-center py-6">
              Activity tracking will be available in the next update
            </p>
          </div>
        </div>
{userResignation && (
  <ResignationDisplay key={userResignation._id || 'resignation-' + Date.now()} />
)}        {workspace && (
          <ChatBubble
            workspaceId={workspace._id}
            workspaceName={workspace.name}
          />
        )}
      </div>
    </div>
  );
};

export default WorkspaceOverview;