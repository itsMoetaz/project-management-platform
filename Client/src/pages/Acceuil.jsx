import { Link } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import useSession from '../hooks/useSession';
import api from '../utils/Api';
import { toast } from 'react-hot-toast';
import NotificationSystem from '../utils/NotificationSystem';
import { motion } from 'framer-motion'; // Add framer-motion for animations
import WelcomeDialog from '../components/onboarding/WelcomeDialog';

const Acceuil = () => {
  // Your existing state and refs
  const { user, loading, logout, refreshUser, isAuthenticated } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedDataRef = useRef(false);
  const [showInactivityAlert, setShowInactivityAlert] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const countdownStartTimeRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const confirmTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);
  const [favoriteWorkspaces, setFavoriteWorkspaces] = useState([]);

  // New state for animations and UI effects
  const [activeTab, setActiveTab] = useState('workspaces');
  const [scrolled, setScrolled] = useState(false);
  
  // Your existing functions and effects
  // ... (keep all your original functions like handleCreateWorkspace, resetInactivityTimer, etc.)
  const toastStyles = {
    base: {
      style: {
        fontFamily: 'Poppins, sans-serif',
        padding: '16px',
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '400px',
        marginBottom: '1rem',
        transition: 'all 0.3s ease',
        animation: 'toast-slide-in 0.5s ease forwards'
      },
      icon: {
        fontSize: '20px',
        marginRight: '8px'
      },
      duration: 3000,
    },
    success: {
      style: {
        background: 'linear-gradient(to right, #4ade80, #22c55e)',
        borderLeft: '5px solid #16a34a',
      },
      icon: '✓'
    },
    error: {
      style: {
        background: 'linear-gradient(to right, #f87171, #ef4444)',
        borderLeft: '5px solid #dc2626',
      },
      icon: '✕'
    },
    loading: {
      style: {
        background: 'linear-gradient(to right, #38bdf8, #3b82f6)',
        borderLeft: '5px solid #2563eb',
      },
      icon: '⟳'
    },
    warning: {
      style: {
        background: 'linear-gradient(to right, #fbbf24, #f59e0b)',
        borderLeft: '5px solid #d97706',
      },
      icon: '!'
    }
  };
   
   const handleCreateWorkspace = async (e) => {
     e.preventDefault();
     setIsCreatingWorkspace(true);
   
     try {
       // 1. Create the workspace
       const workspaceResponse = await api.post('/api/workspaces/addWorkspace', {
         name: newWorkspaceName,
         description: newWorkspaceDescription,
         owner: user._id
       });
       
       const newWorkspace = workspaceResponse.data;
       
       // 2. Update the user
       await api.patch(`/api/users/${user._id}/add-workspace`, {
         workspaceId: newWorkspace._id
       });
       
       // 3. Force a full refresh of user data
       await refreshUser();
       setAllWorkspaces(prevWorkspaces => [newWorkspace, ...prevWorkspaces]);

   
       // 4. Show success message
       showToast('Workspace created successfully!', 'success');
       
       // 5. Reset form and close modal instead of navigating
       setNewWorkspaceName('');
       setNewWorkspaceDescription('');
       setShowWorkspaceModal(false);
       
     } catch (err) {
       console.error("Workspace creation error:", err);
       toast.error(err.response?.data?.error || 'Failed to create workspace');
     } finally {
       setIsCreatingWorkspace(false);
     }
   };
  
   const startCountdown = () => {
    countdownStartTimeRef.current = Date.now();
    const duration = 60 * 1000;
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - countdownStartTimeRef.current;
      const remainingSeconds = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setCountdown(remainingSeconds);
      if (remainingSeconds <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        console.log("Countdown finished. Logging out...");
        logout();
      }
    }, 1000);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!showInactivityAlert && confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);

    inactivityTimerRef.current = setTimeout(() => {
      setShowInactivityAlert(true);
      setCountdown(60);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      startCountdown();
      confirmTimeoutRef.current = setTimeout(() => {
        console.log("Backup timeout triggered. Logging out.");
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        logout();
      }, 61000);
    }, 1800000);
  };

  const staySignedIn = () => {
    setShowInactivityAlert(false);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    resetInactivityTimer();
  };

  useEffect(() => {
    const loadUserData = async () => {
      if (hasLoadedDataRef.current) return;
      setIsRefreshing(true);
      try {
        await refreshUser();
        fetchAllAccessibleWorkspaces();
        hasLoadedDataRef.current = true;
      } catch (error) {
        console.error("Failed to refresh user data:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    if (isAuthenticated && !hasLoadedDataRef.current) {
      loadUserData();
    }

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => {
      if (!showInactivityAlert) resetInactivityTimer();
    };

    activityEvents.forEach(event => window.addEventListener(event, handleUserActivity));
    resetInactivityTimer();

    return () => {
      activityEvents.forEach(event => window.removeEventListener(event, handleUserActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthenticated]);

  // 1. Modify your fetchAllAccessibleWorkspaces function
const fetchAllAccessibleWorkspaces = async () => {
  setIsLoadingWorkspaces(true);
  try {
    const response = await api.get('/api/workspaces/user/workspaces');
    // Get saved favorites from localStorage
    const savedFavorites = JSON.parse(localStorage.getItem('favoriteWorkspaces') || '[]');
    
    // Add isFavorite property to each workspace based on localStorage data
    const workspacesWithFavorites = response.data.map(workspace => ({
      ...workspace,
      isFavorite: savedFavorites.includes(workspace._id)
    }));
    
    setAllWorkspaces(workspacesWithFavorites);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    toast.error('Failed to load all workspaces');
  } finally {
    setIsLoadingWorkspaces(false);
  }
};

// 2. Update your toggleFavorite function to save to localStorage
const toggleFavorite = (workspaceId) => {
  // Update state
  setAllWorkspaces(prev => 
    prev.map(workspace => 
      workspace._id === workspaceId 
        ? { ...workspace, isFavorite: !workspace.isFavorite } 
        : workspace
    )
  );
  
  // Update localStorage
  const savedFavorites = JSON.parse(localStorage.getItem('favoriteWorkspaces') || '[]');
  const workspace = allWorkspaces.find(w => w._id === workspaceId);
  
  if (workspace) {
    const isFavorite = !workspace.isFavorite;
    
    if (isFavorite) {
      // Add to favorites if not already there
      if (!savedFavorites.includes(workspaceId)) {
        savedFavorites.push(workspaceId);
      }
    } else {
      // Remove from favorites
      const index = savedFavorites.indexOf(workspaceId);
      if (index > -1) {
        savedFavorites.splice(index, 1);
      }
    }
    
    // Save updated favorites to localStorage
    localStorage.setItem('favoriteWorkspaces', JSON.stringify(savedFavorites));
  }
};

const showToast = (message, type = 'success') => {
  const style = {
    ...toastStyles.base.style,
    ...toastStyles[type].style
  };
  
  let icon = toastStyles[type].icon;
  let iconClass = '';
  
  if (type === 'loading') {
    iconClass = 'animate-spin';
  }
  
  const content = (
    <div className="flex items-center gap-3">
      <span className={`text-xl ${iconClass}`}>{icon}</span>
      <span>{message}</span>
    </div>
  );
  
  return toast(content, { 
    duration: toastStyles.base.duration, 
    style,
    id: `toast-${Date.now()}`
  });
};
  // New animation effects on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (loading || isRefreshing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-purple-100/5">
        <div className="text-center space-y-4">
          <div className="loader">
            <svg className="animate-spin h-16 w-16 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-lg text-primary/80 animate-pulse">Preparing your workspace...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 font-poppins overflow-x-hidden">
{showInactivityAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-primary/20 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Are you still there?</h3>
            </div>
            
            <p className="mb-6">You've been inactive for a while. For security purposes, you'll be logged out automatically in <span className="font-semibold text-primary">{countdown} seconds</span>.</p>
            
            {/* Progress bar */}
            <div className="w-full bg-base-300 rounded-full h-2 mb-6">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 60) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-end gap-4">
              <button onClick={logout} className="btn btn-outline">Log out</button>
              <button onClick={staySignedIn} className="btn btn-primary">I'm still here</button>
            </div>
          </div>
        </div>
      )}

{showWorkspaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-base-100 p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-primary">Create New Workspace</h3>
              <button 
                onClick={() => setShowWorkspaceModal(false)} 
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base">Workspace Name</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter workspace name"
                  className="input input-bordered"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text text-base">Description (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-32"
                  placeholder="Describe your workspace..."
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="btn btn-outline" 
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn btn-primary ${isCreatingWorkspace ? 'loading' : ''}`}
                  disabled={isCreatingWorkspace}
                >
                  {isCreatingWorkspace ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      
      {/* Enhanced Navigation Bar */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`navbar ${scrolled ? 'bg-base-100 shadow-lg' : 'bg-transparent'} fixed top-0 z-50 px-6 sm:px-8 lg:px-12 transition-all duration-300`}
      >
        <div className="flex-1">
          <Link to="/acceuil" className="group flex items-center gap-2">
            <div className="w-10 h-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary rounded-lg rotate-45 origin-center group-hover:rotate-[225deg] transition-all duration-700"></div>
              <div className="absolute inset-0 bg-info rounded-lg rotate-90 origin-center group-hover:rotate-[180deg] transition-all duration-700 opacity-60"></div>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl">P</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">PlaniFy</span>
          </Link>
        </div>
        
        <div className="relative overflow-visible">
          <NotificationSystem />
        </div>
        
        <div className="flex-none gap-4">
          <div className="dropdown dropdown-end">
            <motion.div 
              tabIndex={0} 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-ghost btn-circle avatar"
            >
              <div className="w-10 rounded-full ring ring-primary ring-offset-2 ring-offset-base-100">
                {user.profile_picture ? 
                  <img src={user.profile_picture} alt="Profile"/> : 
                  <div className="bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center h-full">
                    {user.name.charAt(0).toUpperCase() || 'U'}
                  </div>
                }
              </div>
            </motion.div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-box w-64 border border-base-300">
              <li className="px-4 py-2">
                <span className="font-bold text-primary">{user.name}</span>
                {/* <span className="text-sm opacity-75">{user.email}</span> */}
              </li>
              <div className="divider my-1"></div>
              <li><Link to="/profile" className="flex gap-3 items-center"><i className="fa-solid fa-user"></i> Profile Settings</Link></li>
              <li><button onClick={logout} className="flex gap-3 items-center"><i className="fa-solid fa-arrow-right-from-bracket"></i> Logout</button></li>
            </ul>
          </div>
        </div>
      </motion.nav>

      {/* Spectacular Hero Section */}
      <section className="relative pt-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {/* Dynamic background elements */}
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/10 blur-3xl -top-48 -right-48"></div>
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/10 blur-3xl -bottom-48 -left-48"></div>
          
          {/* Floating geometric shapes */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-20, 20, -20] }}
            transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
            className="absolute top-40 left-[10%] w-12 h-12 bg-primary/10 rounded-lg"
          ></motion.div>
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [20, -20, 20] }}
            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
            className="absolute bottom-32 right-[15%] w-16 h-16 bg-purple-500/10 rounded-full"
          ></motion.div>
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-15, 15, -15] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute top-60 right-[25%] w-10 h-10 bg-blue-400/15 rounded-lg rotate-45"
          ></motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="container mx-auto px-6 sm:px-8 lg:px-12 py-16 relative z-10"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="w-full md:w-1/2 space-y-6">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <h1 className="text-5xl md:text-6xl font-bold mb-2">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                    Welcome back,
                  </span>
                </h1>
                <h1 className="text-5xl md:text-6xl font-bold mb-6">
                  <span className="relative text-primary-content">
                    {user.name}
                    <span className="absolute bottom-0 left-0 w-full h-2 bg-primary rounded-full"></span>
                  </span>
                </h1>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-xl leading-relaxed text-white dark:text-white text-opacity-90"
                >
                Get ready to achieve more. Your projects, teams, and tasks are waiting for your magic touch today.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="flex flex-wrap gap-4"
              >
                <button 
                  onClick={() => setShowWorkspaceModal(true)}
                  className="btn btn-primary btn-lg group"
                >
                  <span className="group-hover:mr-2 transition-all">Create Workspace</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-0 w-0 group-hover:h-5 group-hover:w-5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                  </svg>
                </button>

              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="w-full md:w-1/2 h-96 relative"
            >
              
              {/* 3D isometric workspace visualization */}
              <div className="w-full h-full relative perspective-1000">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 relative transform rotate-[30deg] rotateX-[60deg] scale-125">
                    {/* Animated boards representing workspaces */}
                    <motion.div 
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.8 }}
                      className="absolute top-0 left-0 w-48 h-32 bg-gradient-to-br from-primary/80 to-blue-600/80 rounded-lg shadow-xl"
                    >
                      <div className="absolute top-3 left-3 w-32 h-3 bg-white/30 rounded"></div>
                      <div className="absolute top-9 left-3 w-20 h-3 bg-white/20 rounded"></div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 20, opacity: 1 }}
                      transition={{ delay: 1, duration: 0.8 }}
                      className="absolute top-5 left-10 w-48 h-32 bg-gradient-to-br from-purple-500/80 to-pink-500/80 rounded-lg shadow-xl"
                    >
                      <div className="absolute top-3 left-3 w-32 h-3 bg-white/30 rounded"></div>
                      <div className="absolute top-9 left-3 w-20 h-3 bg-white/20 rounded"></div>
                    </motion.div>
                    
                    <motion.div 
                      initial={{ y: 80, opacity: 0 }}
                      animate={{ y: 40, opacity: 1 }}
                      transition={{ delay: 1.2, duration: 0.8 }}
                      className="absolute top-10 left-20 w-48 h-32 bg-gradient-to-br from-teal-500/80 to-green-500/80 rounded-lg shadow-xl"
                    >
                      <div className="absolute top-3 left-3 w-32 h-3 bg-white/30 rounded"></div>
                      <div className="absolute top-9 left-3 w-20 h-3 bg-white/20 rounded"></div>
                    </motion.div>
                    
                    {/* Floating elements */}
                    <motion.div
                      animate={{
                        y: [-5, 5, -5],
                        rotate: [0, 5, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                      className="absolute -top-8 -right-4 w-12 h-12 bg-yellow-400/30 rounded-full shadow-lg"
                    ></motion.div>
                    
                    <motion.div
                      animate={{
                        y: [3, -3, 3],
                        rotate: [0, -5, 0]
                      }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                      className="absolute -bottom-4 -left-4 w-8 h-8 bg-blue-400/30 rounded-full shadow-lg"
                    ></motion.div>
                  </div>
                </div>
                
                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <motion.div
                    animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="w-64 h-64 rounded-full border-4 border-primary/20"
                  ></motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    className="w-80 h-80 absolute rounded-full border-4 border-blue-400/10"
                  ></motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>


      {/* Main content area with animated tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="container mx-auto px-6 sm:px-8 lg:px-12 py-12"
      >
        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="tabs tabs-boxed p-2 bg-base-200/50 backdrop-blur-sm">
            <button 
              className={`tab text-lg transition-all duration-300 ${activeTab === 'workspaces' ? 'tab-active' : ''}`} 
              onClick={() => setActiveTab('workspaces')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Workspaces
            </button>
            <button 
              className={`tab text-lg transition-all duration-300 ${activeTab === 'recent' ? 'tab-active' : ''}`} 
              onClick={() => setActiveTab('recent')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent
            </button>
            <button 
              className={`tab text-lg transition-all duration-300 ${activeTab === 'favorites' ? 'tab-active' : ''}`} 
              onClick={() => setActiveTab('favorites')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" />
              </svg>
              Favorites
            </button>
          </div>
        </div>
        
        {/* Workspaces Tab Content */}
        {activeTab === 'workspaces' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600"
                >
                  Your Workspaces
                </motion.h2>
                <div className="badge badge-primary ml-3">
                  {allWorkspaces.length}
                </div>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowWorkspaceModal(true)} 
                className="btn btn-primary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                </svg>
                New Workspace
              </motion.button>
            </div>
            
            {(allWorkspaces && allWorkspaces.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Map through all accessible workspaces with animations */}
                {allWorkspaces.map((workspace, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    key={workspace._id}
                    className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all group"
                  >
                    <div className="card-body">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-bold text-xl transform group-hover:rotate-12 transition-all duration-500 shadow-md">
                          {workspace.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="card-title text-primary text-xl">{workspace.name}</h3>
                          {workspace.owner !== user._id && 
                            <div className="badge badge-sm badge-outline">Member</div>
                          }
                        </div>
                      </div>
                      
                      <p className="text-base-content mb-4 line-clamp-2">
                        {workspace.description || 'No description provided'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="badge badge-outline badge-primary">
                          {workspace.projects ? `${workspace.projects.length} Projects` : '0 Projects'}
                        </span>
                        <span className="badge badge-outline">
                          {workspace.members ? `${workspace.members.length} Members` : '1 Member'}
                        </span>
                      </div>
                      
                      <div className="card-actions justify-end mt-auto">
                        <Link 
                          to={`/workspace/${workspace._id}`} 
                          className="btn btn-primary w-full group"
                        >
                          <span>Open Workspace</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                    
{/* Animated Favorite Star Button */}
<motion.div 
  className="absolute top-2 right-2 z-10 cursor-pointer"
  whileHover={{ scale: 1.2 }}
  whileTap={{ scale: 0.9 }}
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(workspace._id);
    showToast(`${workspace.name} ${workspace.isFavorite ? 'removed from' : 'added to'} favorites!`, 'success');
  }}
>
  <motion.div
    initial={{ rotate: 0 }}
    whileTap={{ 
      rotate: [0, -15, 15, -15, 15, 0],
      transition: { duration: 0.5 }
    }}
    className="relative"
  >
    {workspace.isFavorite ? (
      <motion.svg 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: 1,
          rotate: [0, 20, -20, 15, -5, 0]
        }}
        transition={{ duration: 0.5 }}
        xmlns="http://www.w3.org/2000/svg" 
        className="h-7 w-7 text-yellow-400 drop-shadow-md" 
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" />
      </motion.svg>
    ) : (
      <motion.svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-6 w-6 text-base-content/50 hover:text-yellow-400 transition-colors" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" 
        />
      </motion.svg>
    )}
    
    {/* Animated particles when favorited */}
    {workspace.isFavorite && (
      <>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 0], opacity: [1, 0.8, 0] }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0 bg-yellow-400 rounded-full opacity-30"
        />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: 0, y: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1, 0], 
              x: [0, (i % 2 === 0 ? 1 : -1) * Math.random() * 20], 
              y: [0, -Math.random() * 20],
              opacity: [0, 1, 0] 
            }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-yellow-${300 + (i * 100)}`}
          />
        ))}
      </>
    )}
  </motion.div>
</motion.div>
                  </motion.div>
                ))}
                
                {/* Create New Workspace Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: allWorkspaces.length * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  className="card bg-base-100 shadow-lg border-2 border-dashed border-base-300 hover:border-primary transition-all group cursor-pointer"
                  onClick={() => setShowWorkspaceModal(true)}
                >
                  <div className="card-body items-center justify-center text-center h-full">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg mt-4 mb-2 text-primary">Create New Workspace</h3>
                    <p className="text-base-content opacity-75 mb-4">Start a new project, team, or organization</p>
                    <button 
                      className="btn btn-outline btn-primary"
                    >
                      Get Started
                    </button>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Empty state for no workspaces */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="card bg-base-100 shadow-xl relative overflow-hidden group"
              >
                <div className="card-body items-center justify-center py-24">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 rounded-full w-32 h-32 animate-ping opacity-30"></div>
                    <div className="relative z-10 w-32 h-32 rounded-full bg-base-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mt-6 mb-3 text-primary">No Workspaces Yet</h3>
                  <p className="text-base-content opacity-75 mb-6 text-lg max-w-md text-center">
                    You don't have any workspaces yet. Create your first one to get started!
                  </p>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowWorkspaceModal(true)} 
                    className="btn btn-primary btn-lg gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Create Your First Workspace
                  </motion.button>
                </div>
                
                {/* Background decoration */}
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-primary/10 rounded-full blur-xl"></div>
                <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-blue-400/10 rounded-full blur-xl"></div>
                <div className="absolute right-1/3 bottom-0 w-20 h-20 bg-purple-400/10 rounded-full blur-lg"></div>
              </motion.div>
            )}
          </div>
        )}
        
        {/* Recent Tab Content - Can be implemented for other tabs as needed */}
        {activeTab === 'recent' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center py-12"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">Recent Activity</h3>
              <p className="text-base-content/70 mb-6">
                Your recent activity will appear here as you work on projects and tasks
              </p>
              <button className="btn btn-outline">
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        )}
        
{/* Favorites Tab Content */}
{activeTab === 'favorites' && (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600"
        >
          Favorite Workspaces
        </motion.h2>
        <div className="badge badge-primary ml-3">
          {allWorkspaces.filter(workspace => workspace.isFavorite).length}
        </div>
      </div>
    </div>
    
    {allWorkspaces.filter(workspace => workspace.isFavorite).length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {allWorkspaces.filter(workspace => workspace.isFavorite).map((workspace, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            key={workspace._id}
            className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all group"
          >
            <div className="card-body">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-bold text-xl transform group-hover:rotate-12 transition-all duration-500 shadow-md">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="card-title text-primary text-xl">{workspace.name}</h3>
                  {workspace.owner !== user._id && 
                    <div className="badge badge-sm badge-outline">Member</div>
                  }
                </div>
              </div>
              
              <p className="text-base-content mb-4 line-clamp-2">
                {workspace.description || 'No description provided'}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-outline badge-primary">
                  {workspace.projects ? `${workspace.projects.length} Projects` : '0 Projects'}
                </span>
                <span className="badge badge-outline">
                  {workspace.members ? `${workspace.members.length} Members` : '1 Member'}
                </span>
              </div>
              
              <div className="card-actions justify-end mt-auto">
                <Link 
                  to={`/workspace/${workspace._id}`} 
                  className="btn btn-primary w-full group"
                >
                  <span>Open Workspace</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
            
            {/* Animated Favorite Star Button */}
            <motion.div 
              className="absolute top-2 right-2 z-10 cursor-pointer"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(workspace._id);
                toast.success(`${workspace.name} removed from favorites!`);
              }}
            >
              <motion.div
                initial={{ rotate: 0 }}
                whileTap={{ 
                  rotate: [0, -15, 15, -15, 15, 0],
                  transition: { duration: 0.5 }
                }}
                className="relative"
              >
                <motion.svg 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: 1, 
                    opacity: 1,
                    rotate: [0, 20, -20, 15, -5, 0]
                  }}
                  transition={{ duration: 0.5 }}
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-7 w-7 text-yellow-400 drop-shadow-md" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" />
                </motion.svg>
              </motion.div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    ) : (
      <div className="card bg-base-100 shadow-xl relative overflow-hidden">
        <div className="card-body items-center justify-center py-16">
          <div className="w-24 h-24 rounded-full bg-base-200 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-primary mb-3">No Favorites Yet</h3>
          <p className="text-base-content/70 mb-6 max-w-md text-center">
            Star your favorite workspaces to access them quickly from this tab
          </p>
          <button 
            onClick={() => setActiveTab('workspaces')} 
            className="btn btn-primary"
          >
            Browse Workspaces
          </button>
        </div>
      </div>
    )}
  </motion.div>
)}
      </motion.div>
 {/* Enhanced Achievements Section */}
 <motion.div
  initial={{ opacity: 0, y: 30 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.7, delay: 0.2 }}
  viewport={{ once: true }}
  className="container mx-auto px-6 sm:px-8 lg:px-12 py-16 relative"
>
  {/* Abstract Background Elements - unchanged */}
  <div className="absolute -z-10 inset-0 overflow-hidden">
    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
    <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
  </div>

  <div className="flex flex-col md:flex-row justify-between items-center mb-12">
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      viewport={{ once: true }}
      className="flex items-center gap-4"
    >
      <div className="h-12 w-1 bg-gradient-to-b from-primary to-purple-600 rounded-full"></div>
      <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
        Your Achievements
      </h2>
    </motion.div>
    
    <motion.button 
      whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.3)" }}
      whileTap={{ scale: 0.95 }}
      className="btn btn-primary btn-md gap-2 rounded-xl"
    >
      <span>View All</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    </motion.button>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {[
      { 
        name: "Fast Starter", 
        icon: "🚀", 
        desc: "Created first workspace", 
        progress: 100, 
        color: "from-blue-400 to-primary",
        badge: "Completed",
        badgeColor: "badge-success"
      },
      { 
        name: "Team Player", 
        icon: "👥", 
        desc: "Added 5 team members", 
        progress: 60, 
        color: "from-purple-400 to-pink-500",
        badge: "In Progress",
        badgeColor: "badge-warning"
      },
      { 
        name: "Task Master", 
        icon: "✓", 
        desc: "Completed 50 tasks", 
        progress: 82, 
        color: "from-amber-400 to-orange-500",
        badge: "Almost There",
        badgeColor: "badge-info"
      },
    ].map((achievement, idx) => (
      <motion.div 
        key={idx}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: idx * 0.2 }}
        whileHover={{ 
          y: -10, 
          transition: { duration: 0.2 },
        }}
        className="relative group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r opacity-60 group-hover:opacity-100 rounded-2xl blur-md transition-all duration-300"></div>
        <div className="card bg-base-100 shadow-xl backdrop-blur-sm border border-white/10 relative z-10">
          <div className="absolute top-4 right-4">
            <div className={`badge ${achievement.badgeColor}`}>
              {achievement.badge}
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${achievement.color} flex items-center justify-center text-2xl shadow-lg group-hover:rotate-6 transition-transform duration-300`}>
                <span className="drop-shadow-md">{achievement.icon}</span>
              </div>
              <div>
                <h3 className="card-title text-xl">{achievement.name}</h3>
                <p className="text-gray-300 text-sm">
                  {achievement.desc}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Progress</span>
                <span className={`text-sm font-bold ${achievement.progress === 100 ? 'text-success' : 'text-primary'}`}>
                  {achievement.progress}%
                </span>
              </div>
              <div className="w-full h-3 bg-base-300/50 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: `${achievement.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.3 + idx * 0.2, ease: "easeOut" }}
                  className={`h-full rounded-full bg-gradient-to-r ${achievement.color}`}
                ></motion.div>
              </div>
            </div>
            

          </div>
          
          {/* Animated particles */}
          {achievement.progress === 100 && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    x: [0, Math.random() * 50 - 25],
                    y: [0, -60 - Math.random() * 40],
                    scale: [0, Math.random() * 0.5 + 0.5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    repeatDelay: Math.random() * 2 + 1
                  }}
                  className="absolute top-1/3 left-1/2 w-3 h-3 rounded-full bg-success z-20"
                ></motion.div>
              ))}
            </>
          )}
        </div>
      </motion.div>
    ))}
    
    {/* New Achievements Explorer Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.6 }}
        whileHover={{ y: -10, transition: { duration: 0.2 } }}
        className="card bg-base-200 shadow-xl backdrop-blur-sm border border-white/10 group"
      >
        <div className="card-body flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-base-300/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Explore More</h3>
        <p className="text-gray-300 mb-6">Discover all available achievements and unlock your potential</p>
        <button className="btn btn-primary btn-sm px-6 rounded-full group-hover:scale-105 transition-transform duration-300">
          View All Badges
        </button>
        </div>
      </motion.div>
      </div>
    </motion.div>

    {/* Enhanced Statistics Dashboard - Fixed Text Contrast */}
<section className="py-16 relative">
  {/* Creative background elements - unchanged */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
    <div className="absolute w-full h-full">
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-blue-500/5 to-teal-500/5 rounded-full blur-3xl"></div>
    </div>
    
    {/* Grid pattern - unchanged */}
    <div 
      className="absolute inset-0 opacity-[0.03] pointer-events-none" 
      style={{ 
        backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      }}
    ></div>
  </div>

  <div className="container mx-auto px-6 sm:px-8 lg:px-12">
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="flex flex-col items-center justify-center mb-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, type: "spring" }}
        className="bg-base-100/50 backdrop-blur-sm p-2 px-4 rounded-full shadow-sm border border-base-300/50 mb-4"
      >
        <span className="text-sm font-medium text-primary">Your Performance</span>
      </motion.div>
      <h2 className="text-3xl md:text-4xl font-bold text-center">
        Dashboard <span className="text-primary">Insights</span>
      </h2>
    </motion.div>

    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
    >
      {/* Productivity Score Card */}
      <motion.div 
        whileHover={{ scale: 1.03, translateY: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="card bg-gradient-to-br from-base-100 to-base-100/90 backdrop-blur-md shadow-xl border border-base-200"
      >
        <div className="card-body p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8">
            <div className="w-full h-full rounded-full bg-primary/10 animate-pulse-slow"></div>
          </div>
          
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wider">Productivity</h3>
            <div className="badge badge-primary animate-pulse-subtle">+12%</div>
          </div>
          
          <div className="flex items-end gap-2 mt-2 mb-1">
            <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">87</span>
            <span className="text-gray-400 text-sm mb-1">/ 100</span>
          </div>
          
          <p className="text-xs text-gray-300 mb-3">Based on your completed tasks</p>
          
          <div className="w-full h-3 bg-base-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "87%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-blue-600 rounded-full"
            ></motion.div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-300">Trending Up</span>
            </div>
            <button className="btn btn-ghost btn-xs">Details</button>
          </div>
        </div>
      </motion.div>
      
      {/* Tasks Completed Card */}
      <motion.div 
        whileHover={{ scale: 1.03, translateY: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="card bg-gradient-to-br from-base-100 to-base-100/90 backdrop-blur-md shadow-xl border border-base-200"
      >
        <div className="card-body p-6 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-blue-500">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wider">Tasks Completed</h3>
            <div className="badge badge-info text-xs">This Week</div>
          </div>
          
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-blue-600">24</span>
            <span className="text-success text-sm mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
              </svg>
              8%
            </span>
          </div>
          
          <p className="text-xs text-gray-300 mb-3">Weekly performance summary</p>
          
          <div className="flex justify-between items-end mt-2 relative h-20">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
              const heights = [30, 45, 60, 50, 75, 35, 20];
              return (
                <div key={day} className="flex flex-col items-center gap-1 relative z-10">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${heights[i]}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className="w-2 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm"
                  ></motion.div>
                  <span className="text-xs text-gray-400">{day}</span>
                </div>
              );
            })}
            
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-5 h-1/3 bg-gradient-to-t from-transparent to-base-100/20 z-0"></div>
          </div>
          
          <div className="w-full h-px bg-base-200 my-2"></div>
          
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div>Last week: <span className="font-medium text-blue-500">18</span></div>
            <button className="btn btn-ghost btn-xs">View Details</button>
          </div>
        </div>
      </motion.div>
      
      {/* Project Status Card */}
      <motion.div 
        whileHover={{ scale: 1.03, translateY: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="card bg-gradient-to-br from-base-100 to-base-100/90 backdrop-blur-md shadow-xl border border-base-200"
      >
        <div className="card-body p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 -mr-16 -mt-16 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-purple-500">
              <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wider">Project Status</h3>
          </div>
          
          <div className="flex items-center gap-3 mt-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="45" 
                  className="stroke-base-200 fill-none" 
                  strokeWidth="10"
                />
                <motion.circle 
                  initial={{ strokeDasharray: "0 100" }}
                  whileInView={{ strokeDasharray: "65 100" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="50" cy="50" r="45" 
                  className="stroke-purple-500 fill-none" 
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="65 100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold">65%</span>
              </div>
            </div>
            
            <div className="space-y-2 flex-1">
              <h4 className="text-base font-medium">Task Breakdown</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span className="text-gray-300">Completed</span>
                  <span className="ml-auto font-medium">12</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                  <span className="text-gray-300">In Progress</span>
                  <span className="ml-auto font-medium">8</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-info"></div>
                  <span className="text-gray-300">Reviewing</span>
                  <span className="ml-auto font-medium">3</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-error"></div>
                  <span className="text-gray-300">Blocked</span>
                  <span className="ml-auto font-medium">2</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full h-px bg-base-200 my-3"></div>
          
          <div className="grid grid-cols-3 text-xs">
            <div>
              <div className="text-success font-medium">Planning</div>
              <div className="text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-warning font-medium">Development</div>
              <div className="text-gray-400">In Progress</div>
            </div>
            <div>
              <div className="text-gray-300 font-medium">Testing</div>
              <div className="text-gray-400">Pending</div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Time Tracking Card */}
      <motion.div 
        whileHover={{ scale: 1.03, translateY: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="card bg-gradient-to-br from-base-100 to-base-100/90 backdrop-blur-md shadow-xl border border-base-200"
      >
        <div className="card-body p-6 relative overflow-hidden">
          <div className="absolute -bottom-12 -right-12 w-32 h-32 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-teal-500">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
            </svg>
          </div>
          
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-gray-300 text-sm uppercase tracking-wider">Time Logged</h3>
          </div>
          
          <div className="mt-5 flex items-center justify-center">
            <div className="relative">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.1)" 
                  strokeWidth="8"
                />
                <motion.circle 
                  initial={{ strokeDasharray: "0 100", strokeDashoffset: 25 }}
                  whileInView={{ strokeDasharray: "75 100" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="url(#gradient)" 
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="75 100"
                  strokeDashoffset="25"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">22.5</span>
                <span className="text-xs text-gray-400">hours</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>Weekly Goal: 30h</span>
              <span className="font-semibold text-teal-500">75%</span>
            </div>
            
            <div className="w-full bg-base-200 rounded-full h-1.5">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: "75%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
              ></motion.div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                <span className="text-gray-300">Development</span>
                <span className="ml-auto font-medium">14.2h</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-gray-300">Meetings</span>
                <span className="ml-auto font-medium">5.8h</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-300">Planning</span>
                <span className="ml-auto font-medium">2.5h</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </div>
  
  {/* Animation styles unchanged */}
  <style>{`
    @keyframes pulse-slow {
      0%, 100% { transform: scale(1); opacity: 0.1; }
      50% { transform: scale(1.2); opacity: 0.3; }
    }
    
    @keyframes pulse-subtle {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
    
    .animate-pulse-slow {
      animation: pulse-slow 4s ease-in-out infinite;
    }
    
    .animate-pulse-subtle {
      animation: pulse-subtle 2s ease-in-out infinite;
    }
  `}</style>
</section>
      {/* Quick Access Section with Glass Effect */}
      <section className="py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-blue-500/5"></div>
        <div className="container mx-auto px-6 sm:px-8 lg:px-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl font-bold text-primary mb-8 text-center"
          >
            Quick Access
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* My Projects Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className="card backdrop-blur-md bg-white/10 shadow-xl border border-white/20"
            >
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-500 p-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <h2 className="card-title text-2xl text-primary">My Projects</h2>
                </div>
                <p className="mb-6">All your projects in one place. Track progress, manage tasks, and collaborate with your team.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-block group">
                    <span>View All Projects</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
            
            {/* Tasks Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className="card backdrop-blur-md bg-white/10 shadow-xl border border-white/20"
            >
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                    </svg>
                  </div>
                  <h2 className="card-title text-2xl text-primary">My Tasks</h2>
                </div>
                <p className="mb-6">Stay organized with all your tasks in one view. Track deadlines and manage your priorities.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-block group">
                    <span>View Tasks</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
            
            {/* Team Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -10, transition: { duration: 0.2 } }}
              className="card backdrop-blur-md bg-white/10 shadow-xl border border-white/20"
            >
              <div className="card-body">
                <div className="flex items-center gap-4 mb-4">
                  <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-green-500 p-4 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <h2 className="card-title text-2xl text-primary">Team</h2>
                </div>
                <p className="mb-6">Connect and collaborate with your team members. Manage permissions and roles efficiently.</p>
                <div className="card-actions justify-end">
                  <button className="btn btn-primary btn-block group">
                    <span>View Team</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t border-white/10 relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-black"></div>
  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
  
  <div className="container mx-auto px-8 py-16 relative z-10">
    <div className="flex flex-col md:flex-row justify-between gap-12">
      <div className="md:w-1/3">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 relative overflow-hidden">
            <motion.div 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-primary rounded-lg rotate-45"
            ></motion.div>
            <motion.div 
              animate={{ rotate: [0, -360] }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-info rounded-lg rotate-90 opacity-60"
            ></motion.div>
            <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-lg">P</span>
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">PlaniFy</span>
        </div>
        
        <p className="text-white/70 mb-6">
          Simplify project management and enhance team collaboration with our comprehensive platform designed for modern teams.
        </p>
        
        <div className="flex gap-4">
          {["linkedin", "github"].map(platform => (
            <a 
              key={platform} 
              href="#" 
              className="btn btn-circle btn-sm btn-ghost bg-white/5 hover:bg-white/10 border-none text-white/70 hover:text-white"
            >
              <i className={`fa-brands fa-${platform}`}></i>
            </a>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {[
          {
            title: "Product",
            links: ["Features", "Pricing", "Integrations"]
          },
          {
            title: "Company",
            links: ["About Us", "Contact"]
          }
        ].map((column, idx) => (
          <div key={idx}>
            <h4 className="text-lg font-medium mb-5 text-primary">{column.title}</h4>
            <ul className="space-y-3">
              {column.links.map((link, i) => (
                <li key={i}>
                  <Link 
                    to={`/${link.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-white/70 hover:text-white transition-colors relative inline-block group"
                  >
                    {link}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
    
    <div className="border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
      <p className="text-white/60">
        © {new Date().getFullYear()} PlaniFy. All rights reserved.
      </p>
      <div className="flex flex-wrap justify-center gap-6 mt-6 md:mt-0">
        <div className="flex items-center gap-2">
          <select className="select select-sm bg-white/5 border-white/10 text-white/70">
            <option>English (US)</option>
            <option>Français</option>
            <option>Español</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</footer>
{isAuthenticated && <WelcomeDialog />}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      {/* Add the animations style */}
      <style>{`
        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        
        @keyframes gridScrollSlow {
          0% { background-position: 0 0; }
          100% { background-position: 0 20px; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(10px); }
          75% { transform: translateY(5px) translateX(-5px); }
        }

          @keyframes toast-slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
        
        .animate-grid-scroll {
          animation: gridScroll 20s linear infinite;
        }
        
        .animate-grid-scroll-slow {
          animation: gridScrollSlow 15s linear infinite;
        }
        
        .animate-float {
          animation: float 10s ease-in-out infinite;
        }
        
        .animate-float-delay-1 {
          animation: float 12s ease-in-out 1s infinite;
        }
        
        .animate-float-delay-2 {
          animation: float 14s ease-in-out 2s infinite;
        }
        
        .animate-float-delay-3 {
          animation: float 16s ease-in-out 3s infinite;
        }
        
        .animate-float-delay-4 {
          animation: float 18s ease-in-out 4s infinite;
        }

        .perspective-1000 {
          perspective: 1000px;
        }
        
        .rotateX-\\[60deg\\] {
          transform: rotateX(60deg);
        }
      `}</style>
    </div>
  );
};

export default Acceuil;