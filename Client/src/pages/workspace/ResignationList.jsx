
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../../utils/Api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { format } from 'date-fns';
import { hasPermission } from '../../utils/permissionUtils';
import useSession from '../../hooks/useSession';

// Inline data.json (replace with import if stored in a file)
const profiles = [
  {
    "id": "1",
    "name": "Sara Ben Romdhane",
    "title": "Software Engineer | Full Stack Developer",
    "location": "Tunis, Tunisia",
    "summary": "Passionate software developer with 4+ years of experience in building scalable web applications using React and Spring Boot.",
    "experience": [
      {
        "company": "Vermeg",
        "title": "Senior Full Stack Developer",
        "startDate": "2021-06",
        "endDate": "Present",
        "description": "Lead the development of a financial dashboard using React and microservices architecture."
      },
      {
        "company": "Sofrecom",
        "title": "Software Developer",
        "startDate": "2019-04",
        "endDate": "2021-05",
        "description": "Developed REST APIs and collaborated with frontend teams on UI integration."
      }
    ],
    "education": [
      {
        "school": "ESPRIT - Ecole Supérieure Privée d'Ingénierie et de Technologie",
        "degree": "Master's in Software Engineering",
        "startDate": "2016",
        "endDate": "2019"
      }
    ],
    "skills": ["Java", "Spring Boot", "React", "Docker", "Kubernetes", "Git", "SQL"],
    "languages": ["French", "English", "Arabic"]
  },
  {
    "id": "2",
    "name": "Ali Trabelsi",
    "title": "Data Scientist | AI Engineer",
    "location": "Sfax, Tunisia",
    "summary": "Data science enthusiast with a strong background in machine learning, deep learning, and data engineering.",
    "experience": [
      {
        "company": "InstaDeep",
        "title": "AI Research Engineer",
        "startDate": "2022-01",
        "endDate": "Present",
        "description": "Worked on reinforcement learning models for logistics optimization."
      },
      {
        "company": "BIAT",
        "title": "Data Analyst Intern",
        "startDate": "2021-06",
        "endDate": "2021-09",
        "description": "Built dashboards to monitor customer satisfaction and banking activity."
      }
    ],
    "education": [
      {
        "school": "Institut Supérieur d’Informatique et de Mathématiques de Monastir (ISIMM)",
        "degree": "Bachelor in Data Science",
        "startDate": "2017",
        "endDate": "2020"
      }
    ],
    "skills": ["Python", "TensorFlow", "Pandas", "Scikit-learn", "SQL", "Tableau", "Spark"],
    "languages": ["English", "Arabic"]
  },
  {
    "id": "3",
    "name": "Yasmine Chatti",
    "title": "UI/UX Designer | Product Designer",
    "location": "Sousse, Tunisia",
    "summary": "Creative and user-centered UI/UX designer with 5+ years in designing web and mobile applications.",
    "experience": [
      {
        "company": "Vneuron",
        "title": "UI/UX Designer",
        "startDate": "2020-03",
        "endDate": "Present",
        "description": "Designed intuitive user interfaces for enterprise KYC compliance platforms."
      },
      {
        "company": "Freelance",
        "title": "Product Designer",
        "startDate": "2017-01",
        "endDate": "2020-01",
        "description": "Worked with startups on app design, user research, and prototyping."
      }
    ],
    "education": [
      {
        "school": "ISAMM",
        "degree": "Bachelor in Multimedia and Design",
        "startDate": "2013",
        "endDate": "2016"
      }
    ],
    "skills": ["Figma", "Adobe XD", "Wireframing", "User Research", "Prototyping", "Design Thinking"],
    "languages": ["French", "English"]
  },
  {
    "id": "4",
    "name": "Hedi Bouzid",
    "title": "DevOps Engineer | Cloud Architect",
    "location": "Tunis, Tunisia",
    "summary": "DevOps engineer with expertise in CI/CD, cloud infrastructure, and containerization.",
    "experience": [
      {
        "company": "Telnet Holding",
        "title": "DevOps Engineer",
        "startDate": "2021-08",
        "endDate": "Present",
        "description": "Implemented CI/CD pipelines and managed cloud infrastructure on AWS."
      },
      {
        "company": "Talan Tunisie",
        "title": "Cloud Engineer Intern",
        "startDate": "2020-06",
        "endDate": "2020-09",
        "description": "Assisted in migrating on-premise applications to AWS."
      }
    ],
    "education": [
      {
        "school": "ENIT - Ecole Nationale d'Ingénieurs de Tunis",
        "degree": "Master's in Computer Science",
        "startDate": "2016",
        "endDate": "2021"
      }
    ],
    "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "Ansible"],
    "languages": ["French", "English"]
  },
  {
    "id": "5",
    "name": "Maya Ghribi",
    "title": "Cybersecurity Analyst | Ethical Hacker",
    "location": "Tunis, Tunisia",
    "summary": "Cybersecurity professional with a focus on penetration testing and vulnerability assessment.",
    "experience": [
      {
        "company": "Telnet Holding",
        "title": "Cybersecurity Analyst",
        "startDate": "2022-01",
        "endDate": "Present",
        "description": "Conducted penetration tests and security audits for various clients."
      },
      {
        "company": "Sofrecom",
        "title": "Security Intern",
        "startDate": "2021-06",
        "endDate": "2021-09",
        "description": "Assisted in vulnerability assessments and security policy development."
      }
    ],
    "education": [
      {
        "school": "Institut Supérieur de Gestion de Tunis (ISG)",
        "degree": "Master's in Information Security",
        "startDate": "2017",
        "endDate": "2020"
      }
    ],
    "skills": ["Kali Linux", "Metasploit", "Burp Suite", "Wireshark", "Nmap", "OWASP", "Python"],
    "languages": ["French", "English", "Arabic"]
  },
  {
    "id": "6",
    "name": "Oussama Khlifi",
    "title": "Mobile Developer | Flutter Developer",
    "location": "Sousse, Tunisia",
    "summary": "Mobile developer with a passion for creating cross-platform applications using Flutter.",
    "experience": [
      {
        "company": "Talan Tunisie",
        "title": "Mobile Developer",
        "startDate": "2021-05",
        "endDate": "Present",
        "description": "Developed mobile applications using Flutter and integrated REST APIs."
      },
      {
        "company": "Freelance",
        "title": "Flutter Developer",
        "startDate": "2019-01",
        "endDate": "2021-04",
        "description": "Worked on various mobile projects using Flutter and Firebase."
      }
    ],
    "education": [
      {
        "school": "ESPRIT - Ecole Supérieure Privée d'Ingénierie et de Technologie",
        "degree": "Bachelor in Computer Science",
        "startDate": "2015",
        "endDate": "2018"
      }
    ],
    "skills": ["Flutter", "Dart", "Firebase", "REST APIs", "Git"],
    "languages": ["French", "English"]
  },
  {
    "id": "7",
    "name": "AmKhalifa Bouzid",
    "title": "Blockchain Developer | Smart Contract Engineer",
    "location": "Tunis, Tunisia",
    "summary": "Blockchain developer with experience in building decentralized applications and smart contracts.",
    "experience": [
      {
        "company": "Vermeg",
        "title": "Blockchain Developer",
        "startDate": "2021-09",
        "endDate": "Present",
        "description": "Developed smart contracts and decentralized applications on Ethereum."
      },
      {
        "company": "Freelance",
        "title": "Smart Contract Developer",
        "startDate": "2019-01",
        "endDate": "2021-08",
        "description": "Worked on various blockchain projects, including DeFi and NFTs."
      }
    ],
    "education": [
      {
        "school": "ESPRIT - Ecole Supérieure Privée d'Ingénierie et de Technologie",
        "degree": "Master's in Blockchain Technology",
        "startDate": "2016",
        "endDate": "2019"
      }
    ],
    "skills": ["Solidity", "Ethereum", "Web3.js", "Truffle", "IPFS"],
    "languages": ["French", "English"]
  }
];

const ResignationList = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { workspace } = useOutletContext() || {};
  const { user } = useSession();

  const [resignations, setResignations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [currentResignation, setCurrentResignation] = useState(null);
  const [status, setStatus] = useState('Pending');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(null);

  // Fetch all resignations for the workspace
  useEffect(() => {
    const fetchResignations = async () => {
      try {
        const response = await api.get('/api/resignations', {
          params: {
            userId: user?._id,
            workspaceId: workspaceId
          }
        });
        setResignations(response.data);
      } catch (error) {
        console.error('Error fetching resignations:', error);
        toast.error('Failed to load resignations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResignations();
  }, [workspaceId]);

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!currentResignation || !status) return;

    try {
      setIsUpdating(true);
      const response = await api.put(`/api/resignations/${currentResignation._id}/status`, { status });

      if (response.data) {
        setResignations(resignations.map(res =>
          res._id === currentResignation._id ? response.data : res
        ));
        toast.success('Status updated successfully');
        setShowUpdateModal(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  // Find profile with similar skills
  const findSimilarProfile = (employeeProfile, allProfiles) => {
    if (!employeeProfile?.skills || !employeeProfile.skills.length) {
      return null;
    }

    let maxMatches = 0;
    let similarProfile = null;

    allProfiles.forEach(profile => {
      if (profile.id !== employeeProfile.id) { // Exclude the employee's own profile
        const commonSkills = profile.skills.filter(skill =>
          employeeProfile.skills.includes(skill)
        );
        if (commonSkills.length > maxMatches) {
          maxMatches = commonSkills.length;
          similarProfile = { ...profile, commonSkills };
        }
      }
    });

    return similarProfile;
  };

  // Handle view profile for resignations (find similar profile)
  const handleViewProfile = (resignation) => {
    console.log('Resignation userId:', resignation.userId);
    console.log('Resignation userId.name:', resignation.userId?.name);
    console.log('Resignation userId.id:', resignation.userId?.id);
    console.log('Profile names:', profiles.map(p => p.name));
    console.log('Profile ids:', profiles.map(p => p.id));

    if (!resignation.userId) {
      toast.error('Employee data is missing');
      setCurrentProfile({ name: 'Unknown', title: 'N/A', location: 'N/A', summary: 'No profile data available', skills: [], experience: [], education: [], languages: [] });
      setShowProfileModal(true);
      return;
    }

    // Try matching by id first, then name
    let employeeProfile = profiles.find(p => p.id === resignation.userId?.id);

    if (!employeeProfile) {
      employeeProfile = profiles.find(p =>
        p.name.toLowerCase().trim() === resignation.userId?.name?.toLowerCase()?.trim()
      );
    }

    if (!employeeProfile) {
      // Partial name match as fallback
      employeeProfile = profiles.find(p =>
        resignation.userId?.name?.toLowerCase()?.trim().includes(p.name.toLowerCase().trim()) ||
        p.name.toLowerCase().trim().includes(resignation.userId?.name?.toLowerCase()?.trim())
      );
    }

    console.log('Employee profile:', employeeProfile);

    if (!employeeProfile) {
      toast.error('Employee profile not found');
      setCurrentProfile({ name: resignation.userId?.name || 'Unknown', title: 'N/A', location: 'N/A', summary: 'No profile data available', skills: [], experience: [], education: [], languages: [] });
      setShowProfileModal(true);
      return;
    }

    // Find similar profile based on skills
    const similarProfile = findSimilarProfile(employeeProfile, profiles);

    console.log('Similar profile:', similarProfile);

    if (similarProfile) {
      setCurrentProfile(similarProfile);
      setShowProfileModal(true);
    } else {
      toast.error('No similar profile found');
      setCurrentProfile({
        name: 'N/A',
        title: 'N/A',
        location: 'N/A',
        summary: `No profile with similar skills to ${employeeProfile.name} found.`,
        skills: [],
        experience: [],
        education: [],
        languages: [],
        commonSkills: []
      });
      setShowProfileModal(true);
    }
  };

  // Handle view profile details for all profiles
  const handleViewProfileDetails = (profile) => {
    setCurrentProfile(profile);
    setShowProfileModal(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved':
        return 'badge-success';
      case 'Rejected':
        return 'badge-error';
      case 'Pending':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <ToastContainer />

      {/* Update Status Modal */}
      {showUpdateModal && currentResignation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Update Resignation Status</h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Employee</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={currentResignation.userId?.name || 'Unknown User'}
                  disabled
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Reason</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={currentResignation.reason}
                  disabled
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Effective Date</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formatDate(currentResignation.effectiveDate)}
                  disabled
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Comment</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={currentResignation.comment || 'N/A'}
                  disabled
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && currentProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {currentProfile.commonSkills ? 'Similar Employee Profile' : 'Employee Profile'}
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Name</h4>
                <p>{currentProfile.name}</p>
              </div>
              <div>
                <h4 className="font-semibold">Title</h4>
                <p>{currentProfile.title}</p>
              </div>
              <div>
                <h4 className="font-semibold">Location</h4>
                <p>{currentProfile.location}</p>
              </div>
              <div>
                <h4 className="font-semibold">Summary</h4>
                <p>{currentProfile.summary}</p>
              </div>
              {currentProfile.commonSkills && (
                <div>
                  <h4 className="font-semibold">Common Skills</h4>
                  <p>{currentProfile.commonSkills.join(', ')}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold">All Skills</h4>
                <p>{currentProfile.skills.join(', ')}</p>
              </div>
              <div>
                <h4 className="font-semibold">Experience</h4>
                {currentProfile.experience.map((exp, index) => (
                  <div key={index} className="mb-2">
                    <p><strong>{exp.title}</strong> at {exp.company}</p>
                    <p>{exp.startDate} - {exp.endDate}</p>
                    <p>{exp.description}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold">Education</h4>
                {currentProfile.education.map((edu, index) => (
                  <div key={index} className="mb-2">
                    <p><strong>{edu.degree}</strong> at {edu.school}</p>
                    <p>{edu.startDate} - {edu.endDate}</p>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold">Languages</h4>
                <p>{currentProfile.languages.join(', ')}</p>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="btn btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resignations</h1>
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="btn btn-outline"
        >
          Back to Workspace
        </button>
      </div>

      {resignations.length === 0 ? (
        <div className="alert alert-info shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>No resignation requests found for this workspace.</span>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto mb-8">
          <h2 className="text-xl font-bold mb-4">Resignation Requests</h2>
          <table className="table w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Reason</th>
                <th>Effective Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resignations.map((resignation) => (
                <tr key={resignation._id}>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="avatar placeholder">
                        <div className="bg-neutral-focus text-neutral-content rounded-full w-10">
                          <span>{resignation.userId?.name?.charAt(0) || 'U'}</span>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{resignation.userId?.name || 'Unknown User'}</div>
                        <div className="text-sm opacity-50">{resignation.userId?.email || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td>{resignation.reason}</td>
                  <td>{formatDate(resignation.effectiveDate)}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(resignation.status)}`}>
                      {resignation.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex space-x-2">
                      {hasPermission('edit', workspace, user?._id) && (
                        <button
                          onClick={() => {
                            setCurrentResignation(resignation);
                            setStatus(resignation.status);
                            setShowUpdateModal(true);
                          }}
                          className="btn btn-sm btn-outline btn-primary"
                          disabled={isUpdating}
                        >
                          Update
                        </button>
                      )}
                      {hasPermission('view', workspace, user?._id) && (
                        <button
                          onClick={() => handleViewProfile(resignation)}
                          className="btn btn-sm btn-outline btn-primary"
                          disabled={isUpdating}
                        >
                          View Similar Profile
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All Profiles Table */}
      <div className="overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">All Employee Profiles</h2>
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td>{profile.name}</td>
                <td>{profile.title}</td>
                <td>{profile.location}</td>
                <td>
                  <button
                    onClick={() => handleViewProfileDetails(profile)}
                    className="btn btn-sm btn-outline btn-primary"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResignationList;
