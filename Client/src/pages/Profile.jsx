import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/Api';
import { toast } from 'react-hot-toast';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const [theme, setTheme] = useState(() => {
        // Get saved theme from localStorage or default to 'system'
        return localStorage.getItem('theme') || 'system';
    });
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        bio: '',
        role: '',
        two_factor_enabled: false,
        profile_picture: '',
        password: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/api/users/getMe');
                setUser(response.data);
                setFormData({
                    name: response.data.name,
                    email: response.data.email,
                    phone_number: response.data.phone_number || '',
                    bio: response.data.bio || '',
                    role: response.data.role || 'user',
                    two_factor_enabled: response.data.two_factor_enabled || false,
                    profile_picture: response.data.profile_picture || '',
                    password: '',
                    newPassword: '',
                    confirmPassword: '',
                });
                if (response.data.profile_picture) {
                    setImagePreview(response.data.profile_picture);
                }
            } catch (error) {
                toast.error('Failed to load profile');
                navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [navigate]);

    useEffect(() => {
        // Apply the theme to the document's data-theme attribute
        if (theme === 'system') {
            // Check system preference
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', systemTheme);
            
            // Add listener for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => {
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        // Save the theme preference to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        // Add transition styles to document root
        const style = document.createElement('style');
        style.textContent = `
          :root {
            /* Add transition to all color-related properties */
            transition: background-color 0.3s ease,
                        color 0.3s ease,
                        border-color 0.3s ease,
                        fill 0.3s ease,
                        stroke 0.3s ease,
                        outline-color 0.3s ease,
                        box-shadow 0.3s ease;
          }
          
          /* Apply transitions to common elements */
          button, input, select, textarea, .btn, .badge, .card,
          .navbar, .dropdown, .modal, .alert, .tab, .menu {
            transition: background-color 0.3s ease,
                        color 0.3s ease,
                        border-color 0.3s ease,
                        box-shadow 0.3s ease;
          }
          
          /* Smooth transition for all SVG elements */
          svg {
            transition: fill 0.3s ease, stroke 0.3s ease;
          }
        `;
        
        document.head.appendChild(style);
        
        // Clean up function to remove the style when component unmounts
        return () => {
          document.head.removeChild(style);
        }
      }, []); // Empty dependency array means this runs once on mount

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };
    
    const handleUploadImage = async () => {
        if (!imagePreview || imagePreview === user.profile_picture) return;
        
        setIsSaving(true);
        try {
            // Use only the base64 approach which already works
            const response = await api.put('/api/users/updateMe', {
                profile_picture: imagePreview
            });
            
            if (response.data.user) {
                setUser(response.data.user);
                toast.success('Profile picture updated successfully');
            } else {
                throw new Error("Failed to update profile picture");
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.response?.data?.message || 'Failed to upload profile picture');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const response = await api.put('/api/users/updateMe', {
                name: formData.name,
                phone_number: formData.phone_number,
                bio: formData.bio,
                profile_picture: imagePreview || formData.profile_picture
            });
    
            if (response.data.user) {
                setUser(response.data.user);
                setIsEditing(false);
                toast.success('Profile updated successfully');
            }
        } catch (error) {
            console.error('Update error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to update profile';
            toast.error(errorMessage);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        
        setIsSaving(true);
        try {
            await api.put('/api/users/change-password', {
                currentPassword: formData.password,
                newPassword: formData.newPassword
            });
            
            toast.success('Password changed successfully');
            setFormData(prev => ({
                ...prev,
                password: '',
                newPassword: '',
                confirmPassword: ''
            }));
        } catch (error) {
            console.error('Password change error:', error);
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setIsSaving(false);
        }
    };
    const formatPhoneDisplay = (number) => {
        if (!number) return 'Not provided';

        if (number.length === 8 && !number.startsWith('+')) {
            return `+216 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
        } else if (number.startsWith('216')) {
            return `+216 ${number.slice(3, 5)} ${number.slice(5, 8)} ${number.slice(8)}`;
        } else if (number.startsWith('33')) {
            return `+33 ${number.slice(2, 3)} ${number.slice(3, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
        } else if (number.startsWith('1')) {
            return `+1 (${number.slice(1, 4)}) ${number.slice(4, 7)}-${number.slice(7)}`;
        }
        return `+${number}`;
    };
    
    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
    };

    if (loading) return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center">
            <div className="text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-lg">Loading profile...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-base-200 font-poppins">
            {/* Navbar */}
            <nav className="navbar bg-base-100 shadow-lg px-4 lg:px-8">
                <div className="flex-1">
                    <Link to="/acceuil" className="btn btn-ghost text-xl text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        PlaniFy
                    </Link>
                </div>
                
                <div className="flex-none gap-4">
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} className="btn btn-ghost btn-circle avatar">
                            {user.profile_picture ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden">
                                    <img 
                                        src={user.profile_picture} 
                                        alt={`${user.name}'s profile`} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                            <li className="px-4 py-2 border-b">
                                <span className="font-bold">{user.name}</span>
                                <span className="text-sm block opacity-70">{user.email}</span>
                            </li>
                            <li><Link to="/acceuil">Dashboard</Link></li>
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Profile Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    {/* Profile Header */}
                    <div className="bg-base-100 shadow-xl rounded-t-lg overflow-hidden">
                        <div className="h-40 bg-gradient-to-r from-primary to-secondary opacity-80"></div>
                        <div className="px-8 pb-6 relative">
                        <div className="absolute -top-16 left-8 group">
    <div className="w-32 h-32 rounded-full border-4 border-base-100 overflow-hidden bg-base-200 shadow-lg relative">
        {imagePreview ? (
            <img 
                src={imagePreview} 
                alt="Profile" 
                className="w-full h-full object-cover"
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-white text-4xl font-bold">
                {user.name.charAt(0).toUpperCase()}
            </div>
        )}
        
        {/* Make overlay only cover the circle - moved inside the picture div */}
        <div 
            className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current.click()}
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>
    </div>
    
    <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect}
        className="hidden" 
        accept="image/*"
    />
    
    {/* Moved outside the profile picture div for better visibility */}
    {imagePreview && imagePreview !== user.profile_picture && (
        <div className="mt-4 flex justify-center">
            <button 
                onClick={handleUploadImage}
                className="btn btn-sm btn-primary"
                disabled={isSaving}
            >
                {isSaving ? (
                    <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Uploading...
                    </>
                ) : "Save Photo"}
            </button>
            <button 
                onClick={() => {
                    setImagePreview(user.profile_picture);
                    fileInputRef.current.value = null;
                }}
                className="btn btn-sm btn-outline ml-2"
                disabled={isSaving}
            >
                Cancel
            </button>
        </div>
    )}
</div>
                            
                            <div className="pt-16 sm:ml-36 sm:pt-0">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold">{user.name}</h1>
                                        <p className="text-base-content opacity-75">{user.email}</p>
                                        <p className="mt-1">
                                            <span className="badge badge-primary">{user.role}</span>
                                        </p>
                                    </div>
                                    {!isEditing && (
                                        <button 
                                            onClick={() => setIsEditing(true)}
                                            className="btn btn-primary"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit Profile
                                        </button>
                                    )}
                                </div>
                                
                                {user.bio && (
                                    <div className="mt-4 text-base-content opacity-90">
                                        <p>{user.bio}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="tabs tabs-boxed bg-base-200 px-6">
                            <button 
                                className={`tab ${activeTab === 'profile' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                Profile
                            </button>
                            <button 
                                className={`tab ${activeTab === 'security' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('security')}
                            >
                                Security
                            </button>
                            <button 
                                className={`tab ${activeTab === 'preferences' ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab('preferences')}
                            >
                                Preferences
                            </button>
                        </div>
                    </div>
                    
                    {/* Profile Content Tabs */}
                    <div className="bg-base-100 shadow-xl rounded-b-lg p-6">
                        {activeTab === 'profile' && (
                            <div>
                                {isEditing ? (
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium">Full Name</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                    className="input input-bordered"
                                                    required
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium">Email Address</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    className="input input-bordered input-disabled"
                                                    disabled
                                                    readOnly
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-control">
    <label className="label">
        <span className="label-text font-medium">Phone Number</span>
    </label>
    <input
        type="text"
        value={formData.phone_number}
        onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
        className="input input-bordered"
        placeholder="e.g. +216 12 345 6789"
    />
</div>

                                            <div className="form-control">
                                                <label className="label">
                                                    <span className="label-text font-medium">Role</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.role}
                                                    className="input input-bordered input-disabled"
                                                    disabled
                                                />
                                            </div>
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text font-medium">Bio</span>
                                            </label>
                                            <textarea
                                                value={formData.bio}
                                                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                                className="textarea textarea-bordered h-24"
                                                placeholder="Tell us about yourself"
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary flex-1"
                                                disabled={isSaving}
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <span className="loading loading-spinner loading-xs"></span>
                                                        Saving...
                                                    </>
                                                ) : "Save Changes"}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setIsEditing(false)}
                                                className="btn btn-outline flex-1"
                                                disabled={isSaving}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <h3 className="text-sm font-semibold text-base-content/60 uppercase">Contact Information</h3>
                                                <div className="mt-3 space-y-4">
                                                    <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                        </svg>
                                                        <span>{user.email}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        <span>{formatPhoneDisplay(user.phone_number)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-semibold text-base-content/60 uppercase">Account Details</h3>
                                                <div className="mt-3 space-y-4">
                                                    <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span>{user.name}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                        </svg>
                                                        <span className="capitalize">{user.role}</span>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                        <span>2FA: {user.two_factor_enabled ? 'Enabled' : 'Disabled'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <h3 className="text-sm font-semibold text-base-content/60 uppercase">Biography</h3>
                                            <div className="mt-3 p-4 bg-base-200 rounded-lg">
                                                <p>{user.bio || 'No bio provided yet. Click Edit Profile to add one!'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Change Password</h3>
                                    <form onSubmit={handlePasswordChange} className="space-y-4">
                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Current Password</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                                className="input input-bordered"
                                                required
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">New Password</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.newPassword}
                                                onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                                className="input input-bordered"
                                                required
                                                minLength={8}
                                            />
                                        </div>

                                        <div className="form-control">
                                            <label className="label">
                                                <span className="label-text">Confirm New Password</span>
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                                className="input input-bordered"
                                                required
                                            />
                                        </div>

                                        <button 
                                            type="submit" 
                                            className="btn btn-primary"
                                            disabled={isSaving || !formData.password || !formData.newPassword || formData.newPassword !== formData.confirmPassword}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <span className="loading loading-spinner loading-xs"></span>
                                                    Changing Password...
                                                </>
                                            ) : "Change Password"}
                                        </button>
                                    </form>
                                </div>
                                
                                <div className="divider"></div>
                                
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Two-Factor Authentication</h3>
                                    <div className="flex items-center justify-between bg-base-200 p-4 rounded-lg">
                                        <div>
                                            <p className="font-medium">Two-Factor Authentication</p>
                                            <p className="text-sm opacity-70">Add an extra layer of security to your account</p>
                                        </div>
                                        <div className="form-control">
                                            <label className="cursor-pointer label">
                                                <input 
                                                    type="checkbox" 
                                                    className="toggle toggle-primary" 
                                                    checked={formData.two_factor_enabled}
                                                    readOnly
                                                />
                                            </label>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline btn-sm mt-4">
                                        {formData.two_factor_enabled ? 'Disable' : 'Enable'} Two-Factor Authentication
                                    </button>
                                </div>
                                
                                <div className="divider"></div>
                                
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Sessions</h3>
                                    <div className="bg-base-200 p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Current Session</p>
                                                <p className="text-sm opacity-70">This device</p>
                                            </div>
                                            <div className="badge badge-success">Active</div>
                                        </div>
                                    </div>
                                    <button className="btn btn-outline btn-error btn-sm mt-4">
                                        Logout from All Devices
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'preferences' && (
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Theme Settings</h3>
                                    <div className="flex gap-4">
                                        <button 
                                            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => handleThemeChange('light')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            Light
                                        </button>
                                        <button 
                                            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => handleThemeChange('dark')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                            </svg>
                                            Dark
                                        </button>
                                        <button 
                                            className={`btn ${theme === 'system' ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => handleThemeChange('system')}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            System
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="divider"></div>
                                
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Email Preferences</h3>
                                    <div className="space-y-4">
                                        <div className="form-control">
                                            <label className="cursor-pointer label justify-start gap-4">
                                                <input type="checkbox" checked={true} className="checkbox checkbox-primary" />
                                                <span>Task assignments and updates</span>
                                            </label>
                                        </div>
                                        <div className="form-control">
                                            <label className="cursor-pointer label justify-start gap-4">
                                                <input type="checkbox" checked={true} className="checkbox checkbox-primary" />
                                                <span>Project status updates</span>
                                            </label>
                                        </div>
                                        <div className="form-control">
                                            <label className="cursor-pointer label justify-start gap-4">
                                                <input type="checkbox" checked={false} className="checkbox checkbox-primary" />
                                                <span>Marketing and promotional emails</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="divider"></div>
                                
                                <div>
                                    <h3 className="text-xl font-bold mb-4">Language</h3>
                                    <select className="select select-bordered w-full max-w-xs">
                                        <option value="en">English (US)</option>
                                        <option value="fr">Français</option>
                                        <option value="ar">العربية</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;