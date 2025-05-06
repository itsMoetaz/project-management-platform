import api from '../utils/Api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiSettings, FiLogOut, FiList, FiPlus, FiEye, FiSearch, FiRefreshCw, FiFilter, FiUserPlus, FiBell } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Listusers = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all'); // 'all', 'active', 'inactive'
    const [newUser, setNewUser] = useState({
        name: "",
        email: "",
        password: "",
        role: "user",
        phone_number: "",
        bio: ""
    });
    const [showFilters, setShowFilters] = useState(false);

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
                const response = await api.get('/api/users');
                setUsers(response.data);
                setFilteredUsers(response.data);
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };

        fetchUser();
        fetchUsers();
    }, [navigate]);

    useEffect(() => {
        // Filter users based on search and active filter
        let result = users;

        // Apply search filter
        if (searchTerm) {
            result = result.filter(usr =>
                usr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                usr.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply active/inactive filter
        if (filterActive !== 'all') {
            result = result.filter(usr =>
                filterActive === 'active' ? usr.isActive : !usr.isActive
            );
        }

        setFilteredUsers(result);
    }, [searchTerm, filterActive, users]);

    const handleLogout = async () => {
        try {
            await api.get('/api/auth/logout');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post("/api/users/addUser", newUser);
            setUsers([...users, response.data]);
            setShowForm(false);

            // Show success notification
            const notification = document.getElementById('notification');
            notification.classList.remove('opacity-0');
            notification.classList.add('opacity-100');

            setTimeout(() => {
                notification.classList.remove('opacity-100');
                notification.classList.add('opacity-0');
            }, 3000);

            // Reset form
            setNewUser({
                name: "",
                email: "",
                password: "",
                role: "user",
                phone_number: "",
                bio: ""
            });

            // Refresh users list
            const updatedUsers = await api.get('/api/users');
            setUsers(updatedUsers.data);
            setFilteredUsers(updatedUsers.data);
        } catch (error) {
            console.error("Error adding user:", error);
            alert("Error adding user: " + (error.response?.data?.message || "Unknown error"));
        }
    };

    const refreshUserList = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/users');
            setUsers(response.data);
            setFilteredUsers(response.data);
        } catch (error) {
            console.error('Error refreshing list:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64]">
            <div className="text-white text-xl font-semibold animate-pulse flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading user list...
            </div>
        </div>
    );

    // Animation variants for animated elements
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 100
            }
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64] font-poppins">
            {/* Success notification */}
            <div id="notification" className="fixed top-4 right-4 bg-green-500 text-white p-3 rounded-lg shadow-lg transition-opacity duration-300 opacity-0 z-50 flex items-center">
                <FiBell className="mr-2" /> User added successfully!
            </div>

            {/* Sidebar with improved design */}
            <aside className="w-64 bg-slate-900 text-white shadow-md min-h-screen p-5 flex flex-col">
                <div className="mb-10">
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">ProjectFlow</h2>
                    <p className="text-xs text-gray-400">Administration System</p>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-2">
                        <li>
                            <Link to="/dashboard" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiHome className="mr-2" /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/listusers" className="flex items-center p-3 bg-purple-600 text-white rounded-md shadow-md">
                                <FiList className="mr-2" /> User List
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/AdminProfile" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiUser className="mr-2" /> Profile
                            </Link>
                        </li>
                        <li>
                            <Link to="/settings" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiSettings className="mr-2" /> Settings
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className="mt-auto pt-5 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center p-3 text-red-400 hover:bg-red-900 hover:bg-opacity-30 rounded-md transition-all duration-200"
                    >
                        <FiLogOut className="mr-2" /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content with improved design */}
            <div className="flex-1 p-6 overflow-y-auto">
                <header className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            User Management
                        </h1>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={refreshUserList}
                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-all duration-200"
                                title="Refresh list"
                            >
                                <FiRefreshCw className="h-5 w-5" />
                            </button>
                            <div className="bg-slate-900 p-2 px-4 rounded-lg flex items-center">
                                <div className="bg-green-500 h-2 w-2 rounded-full mr-2"></div>
                                <span className="text-white font-medium">{user?.name || 'Admin'}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-400 mt-1">Manage user accounts on your platform</p>
                </header>

                {/* Search bar and filters */}
                <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl p-4 mb-6">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="relative flex-grow max-w-md">
                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for a user..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200"
                            >
                                <FiFilter className="mr-2" /> Filters
                            </button>
                            <button
                                onClick={() => setShowForm(!showForm)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg flex items-center shadow-lg hover:shadow-purple-500/20 transition-all duration-200"
                            >
                                <FiUserPlus className="mr-2" /> New User
                            </button>
                        </div>
                    </div>

                    {/* Advanced filtering options */}
                    {showFilters && (
                        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                            <div className="flex flex-wrap gap-4">
                                <div>
                                    <h4 className="text-sm text-gray-300 mb-2">Status</h4>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setFilterActive('all')}
                                            className={`px-3 py-1 rounded-md ${filterActive === 'all'
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setFilterActive('active')}
                                            className={`px-3 py-1 rounded-md ${filterActive === 'active'
                                                ? 'bg-green-600 text-white'
                                                : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setFilterActive('inactive')}
                                            className={`px-3 py-1 rounded-md ${filterActive === 'inactive'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-slate-600 text-gray-300 hover:bg-slate-500'}`}
                                        >
                                            Inactive
                                        </button>
                                    </div>
                                </div>
                                <div className="ml-auto">
                                    <p className="text-gray-300 text-sm">
                                        {filteredUsers.length} user(s) found
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Improved user add form */}
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-slate-800/60 backdrop-blur-sm shadow-lg rounded-xl p-6 mb-6 border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white flex items-center">
                                <FiUserPlus className="mr-2 text-purple-400" /> Add a user
                            </h2>
                            <button
                                onClick={() => setShowForm(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={newUser.name}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                    placeholder="Enter full name"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={newUser.email}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                    placeholder="example@email.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={newUser.password}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                    placeholder="Choose a secure password"
                                />
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={newUser.role}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-300 mb-1">Phone (optional)</label>
                                <input
                                    type="text"
                                    id="phone_number"
                                    name="phone_number"
                                    value={newUser.phone_number}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    placeholder="Phone number"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-1">Biography (optional)</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={newUser.bio}
                                    onChange={handleInputChange}
                                    className="w-full p-2 bg-slate-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    rows="3"
                                    placeholder="A short biography of the user"
                                ></textarea>
                            </div>
                            <div className="md:col-span-2 flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-md hover:shadow-purple-500/30"
                                >
                                    Create User
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* User list with improved design and animation */}
                {filteredUsers.length > 0 ? (
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredUsers.map((usr) => (
                            <motion.div
                                key={usr._id}
                                variants={itemVariants}
                                whileHover={{ scale: 1.02 }}
                                className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-md border border-gray-700 hover:shadow-purple-500/10 transition-all duration-300"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 rounded-full ring ring-purple-500 ring-offset-2 ring-offset-slate-800 overflow-hidden">
                                            {usr.profile_picture ? (
                                                <img
                                                    src={usr.profile_picture}
                                                    alt={usr.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.style.display = 'none';
                                                        e.target.parentNode.innerHTML = `<div class="bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center h-full w-full">${usr.name.charAt(0).toUpperCase()}</div>`;
                                                    }}
                                                />
                                            ) : (
                                                <div className="bg-gradient-to-br from-purple-600 to-blue-600 text-white flex items-center justify-center h-full w-full">
                                                    {usr.name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{usr.name}</h3>
                                            <p className="text-sm text-gray-400">{usr.email}</p>
                                        </div>
                                    </div>
                                    <div className={`h-3 w-3 rounded-full ${usr.isActive ? 'bg-green-500' : 'bg-red-500'}`}
                                         title={usr.isActive ? 'Active user' : 'Inactive user'}></div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col space-y-1">
                                    <p className="text-xs text-gray-400 flex justify-between">
                                        <span>Role:</span>
                                        <span className="text-white">
                                            {usr.role === 'admin' ?
                                                <span className="bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded text-xs">Administrator</span> :
                                                <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">User</span>
                                            }
                                        </span>
                                    </p>
                                    <p className="text-xs text-gray-400 flex justify-between">
                                        <span>Verified:</span>
                                        <span className="text-white">{usr.isVerified ? 'Yes' : 'No'}</span>
                                    </p>
                                    <p className="text-xs text-gray-400 flex justify-between">
                                        <span>Last activity:</span>
                                        <span className="text-white">
                                            {usr.last_login ? new Date(usr.last_login).toLocaleString() : "Never logged in"}
                                        </span>
                                    </p>
                                </div>

                                <div className="mt-4 flex justify-center">
                                    <Link
                                        to={`/dashboard/user/${usr._id}`}
                                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg flex items-center justify-center shadow-md hover:shadow-purple-500/20 transition-all duration-300"
                                    >
                                        <FiEye className="mr-2" /> View profile
                                    </Link>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-slate-800/30 rounded-xl border border-gray-700">
                        <img
                            src="https://cdn-icons-png.flaticon.com/512/7486/7486754.png"
                            alt="No results"
                            className="w-24 h-24 mb-4 opacity-50"
                        />
                        <h3 className="text-xl font-semibold text-white">No users found</h3>
                        <p className="text-gray-400 max-w-md text-center mt-2">
                            We couldn't find any users matching your search criteria. Try with different terms or reset the filters.
                        </p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setFilterActive('all');
                            }}
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            Reset filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Listusers;
