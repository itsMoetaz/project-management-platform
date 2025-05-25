// src/hooks/useSession.js
import { useState, useEffect, useRef } from 'react';
import api from '../utils/Api';
import { useNavigate } from 'react-router-dom';

const useSession = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const abortControllerRef = useRef(new AbortController());

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/users/getMe', {
        signal: abortControllerRef.current.signal
      });
      setUser(response.data);
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      
      setUser(null);
      if (err.response?.status !== 401) { // Don't store 401 errors
        setError(err.response?.data?.error || 'Not authenticated');
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    checkAuth();
  
    return () => {
      // Cancel any pending requests on unmount
      abortControllerRef.current.abort();
      // Create new controller for potential future requests
      abortControllerRef.current = new AbortController();
    };
  }, []);

  const login = async (credentials) => {
    abortControllerRef.current.abort(); // Cancel any pending checks
    try {
      const response = await api.post('/api/auth/login', credentials);
      setUser(response.data.user);
      
      // Create new controller for auth check
      const authController = new AbortController();
      abortControllerRef.current = authController;

      // Silent auth check that won't throw errors
      await api.get('/api/users/getMe', { signal: authController.signal });
      
      return response.data;
    } catch (err) {
        if (err.name === 'AbortError') return; // Silent abort handling
        setError(err.response?.data?.error || 'Login failed');
        throw err;
      }
  };
  const refreshUser = async () => {
    try {
      const response = await api.get('/api/users/getMe');
      // Check if the response was from a canceled request
      if (response.status === 'canceled') {
        return;
      }
      
      if (response.data) {
        setUser(response.data);
        setIsAuthenticated(true);
        return response.data; // Return the user data for any component that needs it

      }
    } catch (error) {
      // No need to handle cancellations here as they're handled by the interceptor
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      abortControllerRef.current.abort(); // Cancel ongoing auth check
      await api.get('/api/auth/logout');
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Logout failed');
      throw err;
    } finally {
      // Create new controller for future mount
      abortControllerRef.current = new AbortController();
    }
  };

  return {
    user,
    refreshUser,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

export default useSession;