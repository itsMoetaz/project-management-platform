import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/Api';
import { toast } from 'react-hot-toast';

const Logout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = async () => {
            try {
                await api.post('/api/auth/logout');
                localStorage.clear();
                toast.success('Déconnexion réussie');
                navigate('/login');
            } catch (error) {
                toast.error('Échec de la déconnexion');
                navigate('/');
            }
        };
        performLogout();
    }, [navigate]);

    return null;
};

export default Logout;