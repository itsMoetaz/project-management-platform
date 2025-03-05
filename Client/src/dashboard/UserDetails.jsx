import api from '../utils/Api';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiHome, FiUser, FiSettings, FiLogOut, FiList } from 'react-icons/fi';

const UserDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get(`/api/users/getUser/${id}`);
                setUser(response.data);
            } catch (err) {
                setError("Utilisateur non trouvé");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    const handleLogout = async () => {
        try {
            await api.get('/api/auth/logout');
            navigate('/login');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    };

    if (loading) return <div className="text-center p-8">Chargement...</div>;
    if (error) return <div className="text-center text-red-500 p-8">{error}</div>;

    return (
        <div className="flex min-h-screen bg-gray-100 font-poppins">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md min-h-screen p-5">
                <h2 className="text-2xl font-bold text-primary mb-6">ProjectFlow</h2>
                <ul className="space-y-3">
                    <li>
                        <Link to="/dashboard" className="flex items-center p-3 hover:bg-gray-200 rounded-md">
                            <FiHome className="mr-2"/> Dashboard
                        </Link>
                    </li>
                    <li>
                        <Link to="/dashboard/listusers" className="flex items-center p-3 hover:bg-gray-200 rounded-md">
                            <FiList className="mr-2"/> listusers
                        </Link>
                    </li>
                    <li>
                        <Link to="/profile" className="flex items-center p-3 hover:bg-gray-200 rounded-md">
                            <FiUser className="mr-2"/> Profile
                        </Link>
                    </li>
                    <li>
                        <Link to="/settings" className="flex items-center p-3 hover:bg-gray-200 rounded-md">
                            <FiSettings className="mr-2"/> Paramètres
                        </Link>
                    </li>
                    <li>
                        <button onClick={handleLogout}
                                className="flex w-full items-center p-3 text-red-600 hover:bg-red-100 rounded-md">
                            <FiLogOut className="mr-2"/> Déconnexion
                        </button>
                    </li>
                </ul>
            </aside>

            {/* Main Content */}
            <div className="flex-1 p-6">
                <Link to="/dashboard/listusers" className="text-blue-500 flex items-center mb-4">
                    <FiArrowLeft className="mr-2" /> Retour à la liste des utilisateurs
                </Link>

                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">Détails de l'utilisateur</h2>

                    <div className="flex items-center space-x-4">
                        <img
                            src={user.profile_picture || "https://via.placeholder.com/100"}
                            alt="Profile"
                            className="w-24 h-24 rounded-full border"
                        />
                        <div>
                            <p className="text-lg font-semibold">{user.name}</p>
                            <p className="text-gray-600">{user.email}</p>
                            <p className="text-sm text-gray-500">📅 Dernière connexion : {user.last_login ? new Date(user.last_login).toLocaleString() : "Jamais"}</p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <p><strong>Rôle :</strong> {user.role || "Utilisateur"}</p>
                        <p><strong>Date de création :</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetails;
