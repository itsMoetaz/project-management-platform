import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: import.meta.env.REACT_APP_API_URL || 'http://localhost:3000',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(config => {

  return config;
});

// Response interceptor with improved handling
api.interceptors.response.use(
  response => response,
  error => {
    // Ignorer les erreurs spécifiques pour ces endpoints
    if (error.config.url.includes('/auth/register') || 
        error.config.url.includes('/auth/login') || error.config.url.includes('/workspace')) {
      return Promise.reject(error);
    }
    
    // Ignorer les erreurs d'invitation
    if (error.response?.status === 400 && 
        error.config.url.includes('/invite') && 
        error.response?.data?.message === 'An invitation has already been sent to this email') {
      return Promise.reject(error);
    }
    
    // Gestion des requêtes annulées
    if (axios.isCancel(error) || 
        error.code === 'ERR_CANCELED' || 
        (error.message && error.message.toLowerCase() === 'canceled')) {
      // Résoudre avec un statut personnalisé au lieu de rejeter
      return Promise.resolve({ status: 'canceled', data: null });
    }
    
    // Gestion améliorée des erreurs 401 (Non autorisé)
    if (error.response?.status === 401) {
      // Supprimer le token invalide
      localStorage.removeItem('token');
      
      // Ne pas rediriger automatiquement si nous sommes sur certaines pages
      const currentPath = window.location.pathname;
      const noRedirectPaths = ['/login', '/register', '/forgot-password'];
      
      if (!noRedirectPaths.some(path => currentPath.includes(path))) {
        // Afficher le toast mais laisser le composant gérer la redirection
        toast.error('Session expirée. Veuillez vous reconnecter.', {
          duration: 5000,
          position: 'top-center',
          style: {
            background: '#f44336',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px'
          }
        });
        
        // Au lieu de rediriger ici, on laisse le rejet de promesse se propager
        // Le composant pourra décider comment gérer cette erreur
      }
    }

    // Afficher les messages d'erreur pour d'autres types d'erreurs
    const errorMessage = error.response?.data?.error || 
                       error.message || 
                       'Une erreur est survenue';
    
    // Uniquement afficher le toast pour les erreurs qui ne sont pas des erreurs d'authentification
    // ou si nous sommes déjà sur une page d'authentification
    if (error.response?.status !== 401 || window.location.pathname.includes('/login')) {
      toast.error(errorMessage, {
        duration: 5000,
        position: 'top-center',
        style: {
          background: '#f44336',
          color: '#fff',
          padding: '16px',
        }
      });
    }

    return Promise.reject(error);
  }
);

export default api;