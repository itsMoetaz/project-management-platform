import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/Api';
import { toast } from 'react-hot-toast';
import { FiEdit, FiUser, FiMail, FiPhone, FiFileText, FiLock, FiShield, FiImage, FiSave, FiX } from 'react-icons/fi';

const AdminProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        bio: '',
        role: '',
        two_factor_enabled: false,
        profile_picture: '',
    });

    // Simplification: using the same logic as Dashboard.jsx and Listusers.jsx
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/api/users/getMe');
                
                if (response.data) {
                    setUser(response.data);
                    setFormData({
                        name: response.data.name || '',
                        email: response.data.email || '',
                        phone_number: response.data.phone_number || '',
                        bio: response.data.bio || '',
                        role: response.data.role || 'user',
                        two_factor_enabled: response.data.two_factor_enabled || false,
                        profile_picture: response.data.profile_picture || '',
                    });
                }
            } catch (error) {
                console.error("Error retrieving user data:", error);
                toast.error('You are not authenticated. Redirecting to login page.', {
                    style: {
                        background: '#f44336',
                        color: '#fff',
                        padding: '16px',
                        borderRadius: '0px'
                    }
                });
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        
        fetchUser();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        toast.loading('Updating profile...', {
            style: {
                background: '#3498db',
                color: '#fff',
                padding: '16px',
                borderRadius: '0px'
            }
        });

        try {
            const response = await api.put('/api/users/updateMe', {
                name: formData.name,
                email: formData.email,
                phone_number: formData.phone_number,
                bio: formData.bio,
                profile_picture: formData.profile_picture
            });

            if (response.data) {
                const updatedUser = response.data.user || response.data;
                
                setUser(updatedUser);
                setFormData(prev => ({
                    ...prev,
                    ...updatedUser
                }));
                setIsEditing(false);

                toast.dismiss();
                toast.success('Profile updated successfully', {
                    style: {
                        background: '#4CAF50',
                        color: '#fff',
                        padding: '16px',
                        borderRadius: '0px'
                    }
                });
            }
        } catch (error) {
            console.error('Update error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to update profile';

            toast.dismiss();
            toast.error(errorMessage, {
                style: {
                    background: '#f44336',
                    color: '#fff',
                    padding: '16px',
                    borderRadius: '0px'
                }
            });

            // If the error is due to an expired session, redirect after showing the message
            if (error.response?.status === 401) {
                setTimeout(() => navigate('/login'), 2000);
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64] flex items-center justify-center">
            <div className="text-white text-xl font-semibold animate-pulse flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading profile...
            </div>
        </div>
    );

    // If there's still no user after loading, display an error message
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64] flex items-center justify-center">
                <div className="bg-slate-800/80 p-8 rounded-xl max-w-md text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Invalid Session</h2>
                    <p className="text-gray-300 mb-6">
                        Your session appears to be expired or you are not logged in.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="btn btn-primary"
                    >
                        Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64] font-poppins">
            <div className="hero min-h-screen">
                <div className="hero-content flex-col lg:flex-row-reverse lg:gap-16 w-full max-w-6xl">
                    {/* Left Side - Profile Overview */}
                    <div className="text-center lg:text-left lg:w-1/2">
                        <div className="space-y-6">
                            <h1 className="text-4xl font-bold gradient-text">Administrator Profile</h1>
                            <p className="py-4 text-lg text-white">
                                Manage your personal information and security settings from this page.
                            </p>

                            {!isEditing && (
                                <div className="mockup-window bg-base-300">
                                    <div className="flex flex-col items-center justify-center px-6 py-8 bg-base-200">
                                        <div className="avatar mb-6">
                                            <div className="w-28 h-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-4xl text-white font-bold">
                                                {formData.profile_picture ? (
                                                    <img src={formData.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    user.name?.charAt(0).toUpperCase() || 'A'
                                                )}
                                            </div>
                                        </div>
                                        <h2 className="text-2xl font-bold text-white mb-2">{user.name}</h2>
                                        <div className="badge badge-primary font-medium mb-4 capitalize">{user.role}</div>
                                        <p className="text-gray-300">{user.email}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side - Profile Form */}
                    <div className="card flex-shrink-0 w-full lg:w-1/2 shadow-2xl bg-base-100 bg-opacity-20 backdrop-blur-sm">
                        <div className="card-body p-8 lg:p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-bold text-white">
                                    {isEditing ? "Edit Profile" : "Profile Information"}
                                </h2>
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn btn-sm btn-primary gap-2"
                                    >
                                        <FiEdit /> Edit
                                    </button>
                                )}
                            </div>

                            {!isEditing ? (
                                <div className="space-y-6">
                                    <InfoField icon={<FiUser />} label="Name" value={user.name} />
                                    <InfoField icon={<FiMail />} label="Email" value={user.email} />
                                    <InfoField icon={<FiPhone />} label="Phone" value={user.phone_number || 'Not provided'} />
                                    <InfoField icon={<FiFileText />} label="Biography" value={user.bio || 'No biography'} />
                                    <InfoField icon={<FiLock />} label="Role" value={user.role} isCapitalized={true} />
                                    <InfoField
                                        icon={<FiShield />}
                                        label="Two-factor authentication"
                                        value={user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                        isColored={true}
                                        isEnabled={user.two_factor_enabled}
                                    />
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiUser /> Name
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="input input-bordered bg-base-200 text-white"
                                            required
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiMail /> Email
                                            </span>
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="input input-bordered bg-base-200 text-white"
                                            required
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiPhone /> Phone
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.phone_number}
                                            onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                                            className="input input-bordered bg-base-200 text-white"
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiFileText /> Biography
                                            </span>
                                        </label>
                                        <textarea
                                            value={formData.bio}
                                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                            className="textarea textarea-bordered bg-base-200 text-white"
                                            rows="3"
                                        />
                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiImage /> Profile Image URL
                                            </span>
                                        </label>

                                    </div>

                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text text-white flex items-center gap-2">
                                                <FiLock /> Role
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.role}
                                            className="input input-bordered bg-base-200 text-white opacity-70"
                                            disabled
                                        />
                                        <label className="label">
                                            <span className="label-text-alt text-gray-400">The role cannot be changed</span>
                                        </label>
                                    </div>

                                    <div className="flex gap-4 mt-8">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="btn btn-outline flex-1 gap-2"
                                        >
                                            <FiX /> Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary flex-1 gap-2"
                                        >
                                            <FiSave /> Save
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="divider my-8">Navigate</div>

                            <div className="flex flex-col space-y-3">
                                <Link to="/dashboard" className="btn btn-outline btn-primary w-full">
                                    Back to Dashboard
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Style for gradient text */}
            <style>{`
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

                @keyframes shine {
                    to {
                        background-position: 200% center;
                    }
                }

                .gradient-text:hover {
                    animation-duration: 3s;
                }

                .gradient-text {
                    text-shadow: 0 2px 10px rgba(79, 70, 229, 0.15);
                }
            `}</style>
        </div>
    );
};

// Component to display information fields
const InfoField = ({ icon, label, value, isCapitalized = false, isColored = false, isEnabled = false }) => {
    return (
        <div className="p-4 bg-base-300 bg-opacity-50 rounded-lg">
            <label className="text-sm text-gray-400 flex items-center gap-2 mb-1">
                {icon} {label}
            </label>
            <p className={`font-medium text-white ${isCapitalized ? 'capitalize' : ''} ${isColored ? (isEnabled ? 'text-green-400' : 'text-yellow-400') : ''}`}>
                {value}
            </p>
        </div>
    );
};

export default AdminProfile;
