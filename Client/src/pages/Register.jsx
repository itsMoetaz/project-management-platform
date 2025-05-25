import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/Api';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';

// Toast style configuration
const toastStyle = {
  success: {
    style: {
      background: '#4CAF50',
      fontFamily: 'Poppins',
      color: '#fff',
      padding: '16px',
      borderRadius: '0px'
    }
  },
  error: {
    style: {
      background: '#f44336',
      fontFamily: 'Poppins',
      color: '#fff',
      padding: '16px',
      borderRadius: '0px'
    }
  },
  loading: {
    style: {
      background: '#3498db',
      fontFamily: 'Poppins',
      color: '#fff',
      padding: '16px',
      borderRadius: '0px'
    }
  }
};

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessTransition, setShowSuccessTransition] = useState(false);
  const navigate = useNavigate();
  
  // Client-side validation that matches server-side Joi validation
  const validateForm = () => {
    // Check empty fields
    if (!name) {
      toast.error('Name is required', toastStyle.error);
      return false;
    }
    if (!email) {
      toast.error('Email is required', toastStyle.error);
      return false;
    }
    if (!password) {
      toast.error('Password is required', toastStyle.error);
      return false;
    }
    if (!confirmPassword) {
      toast.error('Please confirm your password', toastStyle.error);
      return false;
    }

    // Validate name length (2-50 characters)
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long', toastStyle.error);
      return false;
    }
    if (name.trim().length > 50) {
      toast.error('Name cannot exceed 50 characters', toastStyle.error);
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid email format', toastStyle.error);
      return false;
    }

    // Validate password strength (matching server pattern)
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long', toastStyle.error);
      return false;
    }
    
    // Check for at least one number and one special character
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error('Password must contain at least one number and one special character', toastStyle.error);
      return false;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match', toastStyle.error);
      return false;
    }

    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Run the validation
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading('Creating account...', toastStyle.loading);
    
    try {
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password
      });
      
      // Extract userId from the response
      const { userId } = response.data;
      
      if (!userId) {
        throw new Error('Registration failed: No user ID returned');
      }
      
      // Set the cookie with the userId
      Cookies.set('userId', userId, { expires: 1 });
      
      toast.dismiss(loadingToast);
      
      // Show success transition instead of toast
      setShowSuccessTransition(true);
      
      // Navigate to verification page after showing transition
      setTimeout(() => {
        navigate('/verify-email');
      }, 2200);
      
    } catch (error) {
      toast.dismiss(loadingToast);
      
      if (error.response?.data?.error) {
        // Use the server's error message directly
        toast.error(error.response.data.error, toastStyle.error);
      } else if (error.response?.data?.details) {
        // Handle Joi validation errors from the server
        const joiErrors = error.response.data.details;
        if (Array.isArray(joiErrors) && joiErrors.length > 0) {
          // Display the first validation error
          toast.error(joiErrors[0].message, toastStyle.error);
        } else {
          toast.error('Invalid input. Please check your information.', toastStyle.error);
        }
      } else if (error.response?.status === 409) {
        toast.error('This email is already registered. Please use a different email.', toastStyle.error);
      } else {
        toast.error('Registration failed. Please try again later.', toastStyle.error);
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200 font-poppins overflow-x-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/10 blur-3xl -top-48 -right-48"></div>
        <div className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/10 blur-3xl -bottom-48 -left-48"></div>
        
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

      {/* Success transition overlay */}
      {showSuccessTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-100">
          <div className="success-transition-container">
            <div className="success-logo-container">
              <div className="logo-wrapper">
                <div className="logo-shape primary"></div>
                <div className="logo-shape secondary"></div>
                <span className="logo-letter">P</span>
              </div>
              
              <h2 className="success-message">
                <span className="welcome-text">Welcome to PlaniFy!</span>
                <span className="gradient-text text-3xl mt-2">Account Created Successfully</span>
              </h2>
            </div>
            
            <div className="success-spinner">
              <div className="spinner-circles">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`spinner-circle circle-${i+1}`}
                    style={{ 
                      animationDelay: `${i * 0.1}s`,
                      background: `var(--circle-color-${i+1})` 
                    }}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="success-particles">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i}
                  className="particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDuration: `${1 + Math.random() * 2}s`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    width: `${4 + Math.random() * 6}px`,
                    height: `${4 + Math.random() * 6}px`,
                    opacity: 0.1 + Math.random() * 0.4,
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 relative z-10">
        <div className="flex justify-center mb-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="w-12 h-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-primary rounded-lg rotate-45 origin-center hover:rotate-[225deg] transition-all duration-700"></div>
              <div className="absolute inset-0 bg-info rounded-lg rotate-90 origin-center hover:rotate-[180deg] transition-all duration-700 opacity-60"></div>
              <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-xl">P</span>
            </div>
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">PlaniFy</span>
          </motion.div>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 mt-8">
          {/* Left Side - Branding */}
          <motion.div 
  initial={{ opacity: 0, x: -50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.6 }}
  className="text-center lg:text-left lg:w-1/2 flex flex-col justify-center"
>
  <div className="space-y-6 mb-10">
    <h1 className="text-5xl font-bold leading-tight">
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
        Join PlaniFy Today
      </span>
    </h1>
    <p className="text-xl text-white/80 leading-relaxed max-w-lg">
      Create your account and start organizing your projects with our powerful collaboration tools.
    </p>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-white">Easy Task Management</h3>
        <p className="text-sm text-white/70">Organize your tasks with intuitive drag-and-drop interfaces</p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-lg bg-blue-500/10 text-blue-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-white">Team Collaboration</h3>
        <p className="text-sm text-white/70">Work together with your team in real-time</p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-lg bg-purple-500/10 text-purple-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-white">Progress Tracking</h3>
        <p className="text-sm text-white/70">Monitor project progress with visual analytics</p>
      </div>
    </div>
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-lg bg-green-500/10 text-green-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-white">Smart Deadlines</h3>
        <p className="text-sm text-white/70">Never miss a deadline with intelligent reminders</p>
      </div>
    </div>
  </div>
  
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, delay: 0.3 }}
    className="relative hidden lg:block mt-auto"
  >
    <div className="mockup-window border border-base-300 bg-base-300 shadow-xl">
      <div className="flex justify-center px-6 py-12 bg-base-200 relative overflow-hidden">
        <div className="w-full h-full absolute inset-0">
          <div className="absolute w-full h-full opacity-20 animate-grid-scroll" 
                style={{background: 'linear-gradient(90deg, var(--p) 1px, transparent 1px), linear-gradient(180deg, var(--p) 1px, transparent 1px)', 
                        backgroundSize: '20px 20px'}}>
          </div>
        </div>
        
        <div className="relative z-10 w-full">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-bold text-xl transform hover:rotate-12 transition-all duration-500 shadow-md">
              P
            </div>
            <div className="h-4 bg-primary/20 rounded-full w-32"></div>
            <div className="ml-auto flex space-x-2">
              <div className="h-4 w-4 rounded-full bg-primary/20"></div>
              <div className="h-4 w-4 rounded-full bg-primary/30"></div>
              <div className="h-4 w-4 rounded-full bg-primary/40"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="h-16 bg-primary/10 rounded-lg animate-pulse"></div>
            <div className="h-16 bg-blue-500/10 rounded-lg animate-pulse animation-delay-300"></div>
            <div className="h-16 bg-purple-500/10 rounded-lg animate-pulse animation-delay-600"></div>
          </div>
          
          <div className="h-5 bg-primary/20 rounded-full w-3/4 mb-3"></div>
          <div className="h-3 bg-primary/15 rounded-full w-5/6 mb-2"></div>
          <div className="h-3 bg-primary/10 rounded-full w-4/6 mb-6"></div>
          
          <div className="flex justify-end">
            <div className="h-6 w-20 bg-primary/30 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
    
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
  </motion.div>
</motion.div>
          
          {/* Right Side - Register Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card flex-shrink-0 w-full lg:w-5/12 shadow-2xl overflow-hidden relative"
          >
            {/* Enhanced gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/10 backdrop-blur-xl z-0"></div>
            
            {/* Decorative accent elements to add depth and color */}
            <div className="absolute top-0 right-0 w-full h-24 bg-gradient-to-r from-primary/10 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-r from-transparent to-blue-500/10"></div>
            
            {/* Subtle border glow */}
            <div className="absolute inset-0 border border-white/10 rounded-2xl z-0"></div>
            
            <div className="card-body p-8 lg:p-12 relative z-10">
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-3xl font-bold text-center mb-8"
              >
                Create Account
              </motion.h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Input */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text text-lg">Full Name</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="John Doe"
                      className="input input-bordered input-lg w-full pl-12 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </motion.div>

                {/* Email Input */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text text-lg">Email</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="input input-bordered input-lg w-full pl-12 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </motion.div>

                {/* Password Input */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text text-lg">Password</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered input-lg w-full pl-12 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </motion.div>

                {/* Confirm Password Input */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="form-control"
                >
                  <label className="label">
                    <span className="label-text text-lg">Confirm Password</span>
                  </label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="input input-bordered input-lg w-full pl-12 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 transition-all"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </motion.div>

                {/* Submit Button */}
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  type="submit"
                  className={`btn btn-primary btn-lg w-full mt-8 group relative overflow-hidden ${
                    isLoading ? 'loading' : ''
                  }`}
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? 'Creating Account...' : 'Register'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </motion.button>
              </form>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="divider my-8"
              >
                OR
              </motion.div>

              {/* Social Login */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="flex flex-col space-y-3"
              >
                <a href="https://project-management-platform-fgcp.onrender.com/api/auth/google">
                  <motion.button 
                    className="btn glass btn-md gap-2 w-full group border border-white/20 hover:border-white/40" 
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-10.06l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    <span className="group-hover:translate-x-1 transition-transform">Continue with Google</span>
                  </motion.button>
                </a>
              </motion.div>

              {/* Additional Links */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-8 text-center space-y-2"
              >
                <div className="text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="link link-primary hover:link-hover transition-all">
                    Login
                  </Link>
                </div>
              </motion.div>
              
              {/* Password Requirements */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10"
              >
                <h3 className="text-sm font-medium mb-2">Password Requirements:</h3>
                <ul className="list-disc pl-5 text-xs space-y-1">
                  <li>At least 8 characters long</li>
                  <li>Must contain at least one number (0-9)</li>
                  <li>Must contain at least one special character (!@#$%^&*)</li>
                </ul>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <style>{`
        @keyframes gridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 40px; }
        }
        
        .animate-grid-scroll {
          animation: gridScroll 20s linear infinite;
        }
        
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        
        .animation-delay-600 {
          animation-delay: 0.6s;
        }
        
        .gradient-text {
          background: linear-gradient(
            to right,
            #4f46e5, /* Indigo */
            #8b5cf6, /* Violet */
            #ec4899, /* Pink */
            #3b82f6, /* Blue */
            #4f46e5  /* Back to indigo */
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shine 8s linear infinite;
          transition: all 0.3s ease;
        }

        /* Animation keyframes */
        @keyframes shine {
          to {
            background-position: 200% center;
          }
        }

        /* Hover effect */
        .gradient-text:hover {
          animation-duration: 3s;
        }

        /* Glass button effect */
        .btn.glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }
        
        .btn.glass:hover {
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        
        /* Input field hover effect */
        .input:not(:disabled):hover {
          border-color: var(--p);
          box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.1);
        }

        /* Success Transition Styles */
        .success-transition-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          font-family: 'Poppins', sans-serif;
          animation: fadeIn 0.5s ease forwards;
        }
        
        .success-logo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 3rem;
          opacity: 0;
          transform: translateY(20px);
          animation: slideUpFade 0.8s ease forwards 0.3s;
        }
        
        .logo-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin-bottom: 1.5rem;
        }
        
        .logo-shape {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          transition: all 0.7s;
        }
        
        .logo-shape.primary {
          background: var(--p);
          animation: rotateLogo 3s ease infinite;
        }
        
        .logo-shape.secondary {
          background: var(--s, #38bdf8);
          opacity: 0.6;
          animation: rotateLogo 3s ease infinite 0.2s reverse;
        }
        
        .logo-letter {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 2rem;
          z-index: 10;
        }
        
        .success-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .welcome-text {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: var(--bc);
        }
        
        .success-spinner {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0;
          animation: fadeIn 0.5s ease forwards 0.8s;
        }
        
        .spinner-circles {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .spinner-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--p);
          filter: blur(1px);
          opacity: 0.7;
          animation: spin 2s linear infinite;
          transform: scale(0);
        }
        
        .circle-1 {
          --circle-color-1: var(--p);
          transform-origin: center center;
        }
        
        .circle-2 {
          --circle-color-2: #3b82f6;
          width: 85%;
          height: 85%;
          top: 7.5%;
          left: 7.5%;
          border-color: transparent;
          border-right-color: #3b82f6;
        }
        
        .circle-3 {
          --circle-color-3: #8b5cf6;
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-color: transparent;
          border-bottom-color: #8b5cf6;
        }
        
        .circle-4 {
          --circle-color-4: #ec4899;
          width: 55%;
          height: 55%;
          top: 22.5%;
          left: 22.5%;
          border-color: transparent;
          border-left-color: #ec4899;
        }
        
        .circle-5 {
          --circle-color-5: #4f46e5;
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-color: transparent;
          border-top-color: #4f46e5;
        }
        
        .circle-6 {
          --circle-color-6: #06b6d4;
          width: 25%;
          height: 25%;
          top: 37.5%;
          left: 37.5%;
          border-color: transparent;
          border-bottom-color: #06b6d4;
          animation: spinReverse 1.5s linear infinite;
        }
        
        .success-particles .particle {
          position: absolute;
          border-radius: 50%;
          background: var(--p);
          opacity: 0.3;
          animation: floatParticle 3s ease-in-out infinite;
        }
        
        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes spin {
          0% { transform: scale(0) rotate(0deg); }
          20% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
        
        @keyframes spinReverse {
          0% { transform: scale(0) rotate(0deg); }
          20% { transform: scale(1) rotate(0deg); }
          100% { transform: scale(1) rotate(-360deg); }
        }
        
        @keyframes rotateLogo {
          0% { transform: rotate(0deg); }
          33% { transform: rotate(90deg); }
          66% { transform: rotate(45deg); }
          100% { transform: rotate(0deg); }
        }
        
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(5px); }
          50% { transform: translateY(-8px) translateX(12px); }
          75% { transform: translateY(8px) translateX(-8px); }
        }
      `}</style>
    </div>
  );
};

export default Register;