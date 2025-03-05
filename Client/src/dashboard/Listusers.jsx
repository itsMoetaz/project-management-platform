import api from '../utils/Api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiSettings, FiLogOut, FiEye, FiList } from 'react-icons/fi';

const Listusers = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]); // 🔹 Liste des utilisateurs
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/api/users/getMe');
                setUser(response.data);
            } catch (error) {
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        const fetchUsers = async () => {
            try {
                const response = await api.get('/api/users'); // 🔹 Récupère tous les utilisateurs
                setUsers(response.data);
            } catch (error) {
                console.error('Erreur lors du chargement des utilisateurs:', error);
            }
        };

        fetchUser();
        fetchUsers(); // 🔹 Appel de la fonction pour récupérer les utilisateurs
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await api.get('/api/auth/logout');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) return <div className="text-center p-8">Loading...</div>;

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
                            <FiSettings className="mr-2"/> Settings
                        </Link>
                    </li>
                    <li>
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center p-3 text-red-600 hover:bg-red-100 rounded-md"
                        >
                            <FiLogOut className="mr-2"/> Logout
                        </button>
                    </li>
                </ul>
            </aside>

            {/* Main Content */}
            <div className="flex-1 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                </div>

                {/* User Info Card */}
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold">Welcome, {user.name}!</h2>
                    <p className="text-gray-600">Email: {user.email}</p>
                </div>

                {/* 📊 Stats Section - Liste des utilisateurs */}
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Liste des utilisateurs</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map((usr) => (
                            <div key={usr._id} className="p-4 border rounded-lg shadow-sm bg-gray-100">
                                <div className="flex items-center space-x-3">
                                    <img
                                        src={usr.profile_picture || "https://via.placeholder.com/50"}
                                        alt="Profile"
                                        className="w-12 h-12 rounded-full"
                                    />
                                    <div>
                                        <h3 className="font-semibold">{usr.name}</h3>
                                        <p className="text-sm text-gray-600">{usr.email}</p>
                                        <p className="text-xs text-gray-500">
                                            📅 Dernière connexion : {usr.last_login ? new Date(usr.last_login).toLocaleString() : "Jamais"}
                                        </p>
                                    </div>
                                    <Link to={`/dashboard/user/${usr._id}`} className="text-blue-500 hover:underline">
                                        <FiEye />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Listusers;
