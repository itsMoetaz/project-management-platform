import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/Api';
import useSession from '../../hooks/useSession';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MemberProfile = () => {
  const { workspaceId, userId } = useParams();
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category: 'Technical',
    tags: 50,
  });

  const skillCategories = {
    Technical: 'bg-blue-500 text-white',
    'Soft Skill': 'bg-green-500 text-white',
    Management: 'bg-purple-500 text-white',
  };

  useEffect(() => {
    const fetchProfileAndSkills = async () => {
      setIsLoading(true);
      try {
        const profileResponse = await api.get(`/api/users/${userId}/profile`);
        if (profileResponse.data?.profile) {
          setProfile(profileResponse.data.profile);
        } else {
          throw new Error('Profile not found');
        }

        const skillsResponse = await api.get(`/api/skills/member/${userId}`, {
          params: { workspaceId: workspaceId || undefined },
        });
        setSkills(skillsResponse.data.skills || []);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(error.response?.data?.message || 'Failed to load profile data');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndSkills();
  }, [userId, workspaceId, navigate]);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    const { name, description, category, tags } = newSkill;

    if (!name.trim() || !description.trim()) {
      toast.warn('Please fill all required fields');
      return;
    }

    try {
      const response = await api.post(user?._id === userId ? '/api/skills/add' : '/api/skills/add-to-member', {
        userId,
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        workspaceId: workspaceId || null,
      });

      setSkills([...skills, response.data]);
      setNewSkill({ name: '', description: '', category: 'Technical', tags: 50 });
      setIsAddingSkill(false);
      toast.success('Skill added successfully');
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error(error.response?.data?.message || 'Failed to add skill');
    }
  };

  const handleSkillChange = (e) => {
    const { name, value } = e.target;
    setNewSkill((prev) => ({
      ...prev,
      [name]: name === 'tags' ? parseInt(value) : value,
    }));
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-blue-500 mb-4 animate-bounce"></div>
          <span className="text-white text-lg">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 bg-gray-800 rounded-xl shadow-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mx-auto text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-xl font-semibold text-white">Profile Not Found</h3>
          <p className="mt-2 text-gray-400">The member profile you're looking for doesn't exist or isn't accessible.</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-lg shadow-md hover:scale-105 hover:from-pink-600 hover:to-rose-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-10 px-4 sm:px-6 lg:px-8 text-white">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Member Profile</h1>
            <p className="text-gray-400 mt-1">Details and skills</p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 font-semibold rounded-lg shadow-md hover:scale-105 hover:from-pink-600 hover:to-rose-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
            onClick={() => navigate(-1)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full ring-2 ring-gray-700 overflow-hidden">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-3xl font-bold">
                    {profile.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-gray-400 mt-1">{profile.bio || 'No bio available'}</p>
              <div className="mt-4 space-y-2">
                <p>
                  <span className="font-medium">Email:</span>{' '}
                  <span className="text-gray-400">{profile.email || 'Not specified'}</span>
                </p>
                <p>
                  <span className="font-medium">Phone:</span>{' '}
                  <span className="text-gray-400">{profile.phone_number || 'Not specified'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Skills</h3>
              <button
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-lg shadow-md hover:scale-105 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setIsAddingSkill(true)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Skill
              </button>
            </div>

            {isAddingSkill && (
              <form onSubmit={handleAddSkill} className="mb-6 bg-gray-700 p-4 rounded-lg">
                <h4 className="text-lg font-medium mb-4">Add New Skill</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Name*</label>
                    <input
                      type="text"
                      name="name"
                      value={newSkill.name}
                      onChange={handleSkillChange}
                      placeholder="e.g. React, Communication..."
                      className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category*</label>
                    <select
                      name="category"
                      value={newSkill.category}
                      onChange={handleSkillChange}
                      className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="Technical">Technical</option>
                      <option value="Soft Skill">Soft Skill</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description*</label>
                    <textarea
                      name="description"
                      value={newSkill.description}
                      onChange={handleSkillChange}
                      placeholder="Describe this skill..."
                      rows="3"
                      className="w-full px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Tags: {newSkill.tags}%
                    </label>
                    <input
                      type="range"
                      name="tags"
                      min="0"
                      max="100"
                      value={newSkill.tags}
                      onChange={handleSkillChange}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingSkill(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-md shadow-md hover:scale-105 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300"
                  >
                    Save Skill
                  </button>
                </div>
              </form>
            )}

            {skills.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <div key={skill._id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-lg font-medium">{skill.name}</h4>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          skillCategories[skill.category] || 'bg-gray-500 text-white'
                        }`}
                      >
                        {skill.category}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{skill.description}</p>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{ width: `${skill.tags}%` }}
                      ></div>
                    </div>
                    <p className="text-right text-xs text-gray-400 mt-1">{skill.tags}%</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-800 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <h4 className="mt-4 text-lg font-medium">No Skills Added</h4>
                <p className="mt-1 text-gray-500">Add skills to see them displayed here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberProfile;