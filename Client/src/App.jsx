import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import { Toaster } from 'react-hot-toast';
import Register from './pages/Register';
import ProtectedRoute from './pages/ProtectedRoute';
import Acceuil from './pages/Acceuil';
import UserDetails from "./dashboard/UserDetails.jsx";
import Listusers from "./dashboard/Listusers.jsx";
import Dashboard from "./dashboard/Dashboard.jsx";
import ForgotPassword from './pages/forgotPassword';
import VerifyEmail from './pages/VerifyEmail';
import WorkspaceLayout from './pages/Workspace';
import Projects from './pages/workspace/Projects';
import WorkspaceOverview from './pages/workspace/WorkspaceOverview.jsx';
import InvitationResponse from './pages/workspace/InvitationResponse.jsx';
import WorkspaceMembers from './pages/workspace/WorkspaceMembers.jsx';
import WorkspaceSettings from './pages/workspace/WorkspaceSettings.jsx';
import Invitations from './pages/Invitations';
import { SocketProvider } from './contexts/SocketContext';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound.jsx';
import socketService from './utils/SocketService';
import useSession from './hooks/useSession';
import ProjectDetails from './pages/workspace/ProjectDetails.jsx';
import AdminProfile from "./dashboard/AdminProfile.jsx";
import ResourceDetails from './pages/workspace/ResourceDetails.jsx';
import MemberProfile from './pages/workspace/MemberProfile.jsx'; // Import the new component

import WorkspaceTasks from './pages/workspace/WorkspaceTasks.jsx';
import AboutUs from './shared/AboutUs.jsx';
import Contact from './shared/Contact.jsx';
import Home from './pages/Home.jsx';
import Pricing from './shared/Pricing.jsx';
import Features from './shared/Features.jsx';

function App() {
  const { user } = useSession();
  
  // Initialize socket service when user is available
  useEffect(() => {
    if (user && user._id) {
      socketService.initialize(user._id);
    }
    
    // No need to disconnect on unmount
    // The socket will persist throughout the application lifecycle
  }, [user]);

  return (
    <>
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 5000,
      }}
    />
      <SocketProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/Register" element={<Register />} />
          <Route path="/forgotPassword" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/home" element={<Home />} />


          {/* Public Routes */}
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />


          <Route path="/invitations/:token/accept" element={<InvitationResponse />} />
          <Route path="/invitations" element={<Invitations />} />

          {/* Workspace Routes */}
          <Route 
            path="/workspace/:id" 
            element={
              <ProtectedRoute allowedRoles={['user', 'admin']}>
                <WorkspaceLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<WorkspaceOverview />}  />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<WorkspaceTasks />} />
            <Route path="projects/:projectId" element={<ProjectDetails />} />
            <Route path="projects/:projectId/resources/:resourceId" element={<ResourceDetails />} />
            <Route path="members" element={<WorkspaceMembers />} />
            <Route path="members/:userId" element={<MemberProfile />} /> {/* New route for MemberProfile */}
            <Route path="settings" element={<WorkspaceSettings />} />
          </Route>
        
          <Route path="/acceuil" element={
            <ProtectedRoute allowedRoles={['user']}>
              <Acceuil />
            </ProtectedRoute>} 
          /> 
          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['user', 'admin']}>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/listusers" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Listusers />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/user/:id" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UserDetails />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/AdminProfile" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProfile />
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </SocketProvider>
    </>
  );
}

export default App;