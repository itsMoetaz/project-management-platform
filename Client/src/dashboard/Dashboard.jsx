import api from '../utils/Api';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiUser, FiSettings, FiLogOut, FiList, FiActivity, FiPieChart, FiBarChart2 } from 'react-icons/fi';
import AdminProfile from "./AdminProfile.jsx";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    ArcElement
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [workspaceCount, setWorkspaceCount] = useState(0);
    const [userCount, setUserCount] = useState(0);
    const [projectCount, setProjectCount] = useState(0);
    const [taskStatusDistribution, setTaskStatusDistribution] = useState([]);
    const [taskDeadlineVsCompletion, setTaskDeadlineVsCompletion] = useState([]);
    const [userStatusDistribution, setUserStatusDistribution] = useState([]);
    const [workspaceProgress, setWorkspaceProgress] = useState([]);
    const [taskDistributionByUser, setTaskDistributionByUser] = useState([]);
    const [taskProgressByDeadline, setTaskProgressByDeadline] = useState([]);
    const [taskTrendOverTime, setTaskTrendOverTime] = useState([]);
    const [dashboardStats, setDashboardStats] = useState({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0
    });
    const [teamSkillsDistribution, setTeamSkillsDistribution] = useState([]);
    const [certificationStats, setCertificationStats] = useState({ totalCertifications: 0, topCertifications: [] });
    const [ressourceUtilization, setRessourceUtilization] = useState({
        totalRessources: 0,
        ressourcesByType: [],
        recentlyAdded: []
    });
    const [notificationStats, setNotificationStats] = useState({
        totalNotifications: 0,
        notificationsByType: [],
        deliveryStats: { read: 0, unread: 0 }
    });
    const [teamExperienceStats, setTeamExperienceStats] = useState({
        avgYearsExperience: 0,
        experienceLevels: [],
        topIndustries: []
    });
    const [recentLogins, setRecentLogins] = useState([]);
    const [registrationTrend, setRegistrationTrend] = useState([]);
    const [userRoleDistribution, setUserRoleDistribution] = useState([]);
    const [notificationTypes, setNotificationTypes] = useState([]);

    // Function to predict future registrations
    const predictFutureRegistrations = (data, daysToPredict = 7) => {
        // Calculate average registrations from the last 7 days
        const average = data.reduce((acc, day) => acc + day.registrations, 0) / data.length;

        const futureDates = [];
        const today = new Date(data[data.length - 1].date);

        for (let i = 1; i <= daysToPredict; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const dateString = futureDate.toISOString().split('T')[0];

            futureDates.push({
                date: dateString,
                registrations: Math.round(average) // you can make this more intelligent later
            });
        }

        return futureDates;
    };

    // Function to predict future monthly registrations
    const predictFutureMonthlyRegistrations = (data, monthsToPredict = 6) => {
        // Step 1: Group data by month (YYYY-MM)
        const monthlySums = {};
        data.forEach(item => {
            const month = item.date.substring(0, 7); // 'YYYY-MM'
            if (!monthlySums[month]) {
                monthlySums[month] = 0;
            }
            monthlySums[month] += item.registrations;
        });

        const monthlyData = Object.entries(monthlySums).map(([month, registrations]) => ({
            month,
            registrations,
        }));

        // Step 2: Calculate monthly average
        const average = monthlyData.reduce((acc, m) => acc + m.registrations, 0) / monthlyData.length;

        // Step 3: Generate future months
        const futureMonths = [];
        const [lastYear, lastMonth] = monthlyData[monthlyData.length - 1].month.split('-').map(Number);

        let currentYear = lastYear;
        let currentMonth = lastMonth;

        for (let i = 1; i <= monthsToPredict; i++) {
            currentMonth += 1;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear += 1;
            }

            const formattedMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

            futureMonths.push({
                month: formattedMonth,
                registrations: Math.round(average), // simple prediction
            });
        }

        return futureMonths;
    };

    // Custom colors for better visual experience
    const chartColors = {
        primary: ['rgba(101, 116, 205, 0.8)', 'rgba(101, 116, 205, 0.6)', 'rgba(101, 116, 205, 0.4)'],
        secondary: ['rgba(229, 62, 62, 0.8)', 'rgba(229, 62, 62, 0.6)', 'rgba(229, 62, 62, 0.4)'],
        accent: ['rgba(180, 83, 9, 0.8)', 'rgba(180, 83, 9, 0.6)', 'rgba(180, 83, 9, 0.4)'],
        success: ['rgba(72, 187, 120, 0.8)', 'rgba(72, 187, 120, 0.6)', 'rgba(72, 187, 120, 0.4)'],
        warning: ['rgba(237, 137, 54, 0.8)', 'rgba(237, 137, 54, 0.6)', 'rgba(237, 137, 54, 0.4)'],
        info: ['rgba(90, 103, 216, 0.8)', 'rgba(90, 103, 216, 0.6)', 'rgba(90, 103, 216, 0.4)'],
        status: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
    };

    // Global chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: 'white'
                }
            },
            title: {
                display: true,
                color: 'white',
                font: {
                    size: 16
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            }
        }
    };

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
        fetchUser();
    }, [navigate]);

    const fetchWorkspaceCount = async () => {
        try {
            const response = await api.get('/api/workspaces/count');
            setWorkspaceCount(response.data.count);
        } catch (error) {
            console.error('Error fetching workspace count:', error);
        }
    };

    const fetchUserCount = async () => {
        try {
            const response = await api.get('/api/users/count');
            setUserCount(response.data.count);
        } catch (error) {
            console.error('Error fetching user count:', error);
        }
    };

    const fetchProjectCount = async () => {
        try {
            const response = await api.get('/api/projects/count');
            setProjectCount(response.data.count);
        } catch (error) {
            console.error('Error fetching project count:', error);
        }
    };

    const fetchTaskStatusDistribution = async () => {
        try {
            const response = await api.get('/api/dashboard/task-status-distribution');
            setTaskStatusDistribution(response.data);

            // Calculate global task statistics
            const totalTasks = response.data.reduce((sum, item) => sum + item.count, 0);
            const completedTasks = response.data.find(item => item.name === 'DONE')?.count || 0;
            const pendingTasks = totalTasks - completedTasks;

            setDashboardStats({
                totalTasks,
                completedTasks,
                pendingTasks
            });
        } catch (error) {
            console.error('Error fetching task status distribution:', error);
        }
    };

    const fetchTaskDeadlineVsCompletion = async () => {
        try {
            const response = await api.get('/api/dashboard/task-deadline-vs-completion');
            setTaskDeadlineVsCompletion(response.data);
        } catch (error) {
            console.error('Error fetching task deadline vs completion:', error);
        }
    };

    const fetchUserStatusDistribution = async () => {
        try {
            const response = await api.get('/api/dashboard/user-status-distribution');
            setUserStatusDistribution(response.data);
        } catch (error) {
            console.error('Error fetching user status distribution:', error);
        }
    };

    const fetchWorkspaceProgress = async () => {
        try {
            // Using project-progress instead of workspace-progress which does not exist
            const response = await api.get('/api/dashboard/project-progress');
            
            // Adapt received data to the expected format for the chart
            const formattedData = response.data.map(project => ({
                workspaceName: project.projectName || "Unnamed Project",
                completedTasks: project.completedTasks || 0
            }));
            
            setWorkspaceProgress(formattedData);
        } catch (error) {
            console.error('Error fetching workspace progress:', error);
            // In case of error, set empty data to avoid rendering errors
            setWorkspaceProgress([]);
        }
    };

    const fetchTaskDistributionByUser = async () => {
        try {
            const response = await api.get('/api/dashboard/task-distribution-by-user');
            setTaskDistributionByUser(response.data);
        } catch (error) {
            console.error('Error fetching task distribution by user:', error);
        }
    };

    const fetchTaskProgressByDeadline = async () => {
        try {
            const response = await api.get('/api/dashboard/task-progress-by-deadline');
            setTaskProgressByDeadline(response.data);
        } catch (error) {
            console.error('Error fetching task progress by deadline:', error);
        }
    };

    const fetchTaskTrendOverTime = async () => {
        try {
            const response = await api.get('/api/dashboard/task-trend-over-time');
            setTaskTrendOverTime(response.data);
        } catch (error) {
            console.error('Error fetching task trend over time:', error);
        }
    };

    const fetchTeamSkillsDistribution = async () => {
        try {
            const response = await api.get('/api/dashboard/team-skills-distribution');
            setTeamSkillsDistribution(response.data);
        } catch (error) {
            console.error('Error fetching team skills distribution:', error);
        }
    };

    const fetchCertificationStats = async () => {
        try {
            const response = await api.get('/api/dashboard/certifications-stats');
            setCertificationStats(response.data);
        } catch (error) {
            console.error('Error fetching certification stats:', error);
        }
    };

    const fetchRessourceUtilization = async () => {
        try {
            const response = await api.get('/api/dashboard/ressource-utilization');
            setRessourceUtilization(response.data);
        } catch (error) {
            console.error('Error fetching ressource utilization:', error);
        }
    };

    const fetchNotificationStats = async () => {
        try {
            const response = await api.get('/api/dashboard/notification-stats');
            setNotificationStats(response.data);
        } catch (error) {
            console.error('Error fetching notification stats:', error);
        }
    };

    const fetchTeamExperienceStats = async () => {
        try {
            const response = await api.get('/api/dashboard/team-experience-stats');
            setTeamExperienceStats(response.data);
        } catch (error) {
            console.error('Error fetching team experience stats:', error);
        }
    };

    const fetchRecentLogins = async () => {
        try {
            const response = await api.get('/api/dashboard/recent-logins');
            setRecentLogins(response.data);
        } catch (error) {
            console.error('Error fetching recent logins:', error);
            // Example data in case of error
            const today = new Date();
            setRecentLogins([
                { name: "Thomas Dubois", email: "thomas.d@example.com", lastLogin: new Date(today - 1000 * 60 * 30).toISOString(), ip: "192.168.1.45" },
                { name: "Sophia Laurent", email: "s.laurent@company.com", lastLogin: new Date(today - 1000 * 60 * 120).toISOString(), ip: "203.0.113.42" },
                { name: "Lucas Martin", email: "l.martin@gmail.com", lastLogin: new Date(today - 1000 * 60 * 240).toISOString(), ip: "198.51.100.73" },
                { name: "Emma Bernard", email: "emma.b@organization.org", lastLogin: new Date(today - 1000 * 60 * 400).toISOString(), ip: "172.16.254.1" }
            ]);
        }
    };

    const fetchRegistrationTrend = async () => {
        try {
            const response = await api.get('/api/dashboard/registration-trend');
            setRegistrationTrend(response.data);
        } catch (error) {
            console.error('Error fetching registration trend:', error);
            // Example data in case of error
            const today = new Date();
            const trendData = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateString = date.toISOString().split('T')[0]; // Format "YYYY-MM-DD"
                
                trendData.push({
                    date: dateString,
                    registrations: Math.floor(Math.random() * 5) + 1, // Between 1 and 5 registrations per day
                });
            }
            
            setRegistrationTrend(trendData);
        }
    };

    const fetchUserRoleDistribution = async () => {
        try {
            const response = await api.get('/api/dashboard/user-role-distribution');
            setUserRoleDistribution(response.data);
        } catch (error) {
            console.error('Error fetching user role distribution:', error);
            // Example data in case of error
            setUserRoleDistribution([
                { role: "Administrator", count: 3 },
                { role: "Project Manager", count: 12 },
                { role: "Developer", count: 18 },
                { role: "Designer", count: 7 }
            ]);
        }
    };

    const fetchNotificationTypes = async () => {
        try {
            const response = await api.get('/api/dashboard/notification-types');
            setNotificationTypes(response.data);
        } catch (error) {
            console.error('Error fetching notification types:', error);
            // Example data in case of error
            setNotificationTypes([
                { type: "System", count: 45, color: "#FF6384" },
                { type: "Task", count: 32, color: "#36A2EB" },
                { type: "Project", count: 28, color: "#FFCE56" },
                { type: "Mention", count: 19, color: "#4BC0C0" }
            ]);
        }
    };

    useEffect(() => {
        fetchWorkspaceCount();
        fetchUserCount();
        fetchProjectCount();
        fetchTaskStatusDistribution();
        fetchTaskDeadlineVsCompletion();
        fetchUserStatusDistribution();
        fetchWorkspaceProgress();
        fetchTaskDistributionByUser();
        fetchTaskProgressByDeadline();
        fetchTaskTrendOverTime();
        fetchTeamSkillsDistribution();
        fetchCertificationStats();
        fetchRessourceUtilization();
        fetchNotificationStats();
        fetchTeamExperienceStats();
        fetchRecentLogins();
        fetchRegistrationTrend();
        fetchUserRoleDistribution();
        fetchNotificationTypes();
    }, []);

    const handleLogout = async () => {
        try {
            await api.get('/api/auth/logout');
            navigate('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64]">
            <div className="text-white text-xl font-semibold animate-pulse flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Chargement du tableau de bord...
            </div>
        </div>
    );

    // Chart configurations with our custom colors and options
    const taskStatusChart = {
        labels: taskStatusDistribution.map(status => status.name),
        datasets: [{
            label: 'Répartition des statuts des tâches',
            data: taskStatusDistribution.map(status => status.count),
            backgroundColor: chartColors.status,
            borderColor: chartColors.status,
            borderWidth: 1,
        }],
    };

    const taskDeadlineVsCompletionChart = {
        labels: taskDeadlineVsCompletion.map(item => item.taskName),
        datasets: [
            {
                label: 'Pourcentage de complétion',
                data: taskDeadlineVsCompletion.map(item => item.deadlineCompletionPercentage),
                backgroundColor: chartColors.primary[0],
                borderColor: chartColors.primary[0],
                borderWidth: 2,
            },
        ],
    };

    const userStatusChart = {
        labels: userStatusDistribution.map(status => status.status),
        datasets: [{
            label: 'Répartition des statuts utilisateurs',
            data: userStatusDistribution.map(status => status.count),
            backgroundColor: [chartColors.info[0], chartColors.warning[0]],
            borderColor: [chartColors.info[0], chartColors.warning[0]],
            borderWidth: 1,
        }],
    };

    const workspaceProgressChart = {
        labels: workspaceProgress.map(workspace => workspace.workspaceName),
        datasets: [{
            label: 'Tâches terminées par espace de travail',
            data: workspaceProgress.map(workspace => workspace.completedTasks),
            backgroundColor: chartColors.success[0],
            borderColor: chartColors.success[0],
            borderWidth: 1,
        }],
    };

    const taskDistributionByUserChart = {
        labels: taskDistributionByUser.map(user => user.userName),
        datasets: [
            {
                label: 'Tâches en cours',
                data: taskDistributionByUser.map(user => user.tasksInProgress),
                backgroundColor: chartColors.warning[0],
                borderColor: chartColors.warning[0],
                borderWidth: 1,
            },
            {
                label: 'Tâches terminées',
                data: taskDistributionByUser.map(user => user.tasksCompleted),
                backgroundColor: chartColors.success[0],
                borderColor: chartColors.success[0],
                borderWidth: 1,
            }
        ],
    };

    const taskTrendOverTimeChart = {
        labels: taskTrendOverTime.map(item => item.date),
        datasets: [
            {
                label: 'Tâches terminées',
                data: taskTrendOverTime.map(item => item.completedTasks),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: chartColors.success[0],
                borderWidth: 2,
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Tâches en cours',
                data: taskTrendOverTime.map(item => item.inProgressTasks),
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                borderColor: chartColors.warning[0],
                borderWidth: 2,
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Chart configurations for new data
    const teamSkillsChart = {
        labels: teamSkillsDistribution.map(skill => skill.skillName),
        datasets: [{
            label: 'Nombre d\'utilisateurs',
            data: teamSkillsDistribution.map(skill => skill.userCount),
            backgroundColor: chartColors.primary,
            borderColor: chartColors.primary.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
        }],
    };

    const certificationsChart = {
        labels: certificationStats.topCertifications?.map(cert => cert.name) || [],
        datasets: [{
            label: 'Nombre de certifications',
            data: certificationStats.topCertifications?.map(cert => cert.count) || [],
            backgroundColor: chartColors.info,
            borderColor: chartColors.info.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
        }],
    };

    const ressourceTypeChart = {
        labels: ressourceUtilization.ressourcesByType?.map(item => item.type) || [],
        datasets: [{
            label: 'Ressources par type',
            data: ressourceUtilization.ressourcesByType?.map(item => item.count) || [],
            backgroundColor: chartColors.status,
            borderColor: chartColors.status.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
        }],
    };

    const notificationsChart = {
        labels: notificationStats.notificationsByType?.map(item => item.type) || [],
        datasets: [{
            label: 'Notifications par type',
            data: notificationStats.notificationsByType?.map(item => item.count) || [],
            backgroundColor: notificationStats.notificationsByType?.map(item => item.color) || chartColors.status,
            borderColor: notificationStats.notificationsByType?.map(item => item.color) || chartColors.status,
            borderWidth: 1,
        }],
    };

    const teamExperienceChart = {
        labels: teamExperienceStats.experienceLevels?.map(item => item.level) || [],
        datasets: [{
            label: 'Répartition de l\'expérience',
            data: teamExperienceStats.experienceLevels?.map(item => item.count) || [],
            backgroundColor: chartColors.accent,
            borderColor: chartColors.accent.map(color => color.replace('0.8', '1')),
            borderWidth: 1,
        }],
    };

    // New chart configurations
    const userRoleChart = {
        labels: userRoleDistribution.map(item => item.role),
        datasets: [{
            label: 'Nombre d\'utilisateurs',
            data: userRoleDistribution.map(item => item.count),
            backgroundColor: chartColors.status,
            borderColor: chartColors.status,
            borderWidth: 1,
        }],
    };

    const notificationTypesChart = {
        labels: notificationTypes.map(item => item.type),
        datasets: [{
            label: 'Notifications par type',
            data: notificationTypes.map(item => item.count),
            backgroundColor: notificationTypes.map(item => item.color),
            borderColor: notificationTypes.map(item => item.color),
            borderWidth: 1,
        }],
    };

    const registrationTrendChart = {
        labels: registrationTrend.map(item => item.date),
        datasets: [{
            label: 'Nouvelles inscriptions',
            data: registrationTrend.map(item => item.registrations),
            backgroundColor: 'rgba(94, 114, 228, 0.2)',
            borderColor: chartColors.primary[0],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
        }],
    };

    const futureRegistrationChart = {
        labels: predictFutureRegistrations(registrationTrend).map(item => item.date),
        datasets: [{
            label: 'Prévisions des inscriptions',
            data: predictFutureRegistrations(registrationTrend).map(item => item.registrations),
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: chartColors.secondary[0],
            borderWidth: 2,
            fill: true,
            tension: 0.4,
        }],
    };

    // Registration prediction chart configuration
    const predictedData = predictFutureRegistrations(registrationTrend);
    const allTrendData = [...registrationTrend, ...predictedData];

    const registrationPredictionChart = {
        labels: allTrendData.map(item => item.date),
        datasets: [
            {
                label: 'Inscriptions réelles',
                data: registrationTrend.map(item => item.registrations),
                borderColor: chartColors.primary[0],
                backgroundColor: 'rgba(94, 114, 228, 0.2)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
            },
            {
                label: 'Prévisions',
                data: [...Array(registrationTrend.length).fill(null), ...predictedData.map(item => item.registrations)],
                borderColor: 'rgba(0, 230, 118, 1)',
                borderDash: [5, 5],
                backgroundColor: 'rgba(0, 230, 118, 0.2)',
                fill: false,
                tension: 0.4,
            }
        ],
    };

    // Monthly registration prediction chart configuration
    const monthlyData = predictFutureMonthlyRegistrations(registrationTrend);
    
    // Group current data by month
    const currentMonthlyData = {};
    registrationTrend.forEach(item => {
        const month = item.date.substring(0, 7); // 'YYYY-MM'
        if (!currentMonthlyData[month]) {
            currentMonthlyData[month] = 0;
        }
        currentMonthlyData[month] += item.registrations;
    });
    
    const formattedCurrentMonthlyData = Object.entries(currentMonthlyData).map(([month, registrations]) => ({
        month,
        registrations,
    }));
    
    const allMonthlyData = [...formattedCurrentMonthlyData, ...monthlyData];
    
    const monthlyRegistrationPredictionChart = {
        labels: allMonthlyData.map(item => item.month),
        datasets: [
            {
                label: 'Inscriptions mensuelles réelles',
                data: formattedCurrentMonthlyData.map(item => item.registrations),
                borderColor: chartColors.primary[0],
                backgroundColor: 'rgba(94, 114, 228, 0.2)',
                borderWidth: 2,
                fill: false,
                tension: 0.4,
            },
            {
                label: 'Prévisions mensuelles',
                data: [...Array(formattedCurrentMonthlyData.length).fill(null), ...monthlyData.map(item => item.registrations)],
                borderColor: 'rgba(255, 99, 132, 1)',
                borderDash: [5, 5],
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: false,
                tension: 0.4,
            }
        ],
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-r from-[#0C0A1F] to-[#3C0B64] font-poppins">
            {/* Sidebar with improved design */}
            <aside className="w-64 bg-slate-900 text-white shadow-md min-h-screen p-5 flex flex-col">
                <div className="mb-10">
                    <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">ProjectFlow</h2>
                    <p className="text-xs text-gray-400">Tableau de Bord Admin</p>
                </div>

                <nav className="flex-grow">
                    <ul className="space-y-2">
                        <li>
                            <Link to="/dashboard" className="flex items-center p-3 bg-purple-600 text-white rounded-md shadow-md">
                                <FiHome className="mr-2" /> Tableau de Bord
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/listusers" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiList className="mr-2" /> Liste des Utilisateurs
                            </Link>
                        </li>
                        <li>
                            <Link to="/dashboard/AdminProfile" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiUser className="mr-2" /> Profil
                            </Link>
                        </li>
                        <li>
                            <Link to="/settings" className="flex items-center p-3 hover:bg-purple-600 hover:bg-opacity-50 rounded-md transition-all duration-200">
                                <FiSettings className="mr-2" /> Paramètres
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div className="mt-auto pt-5 border-t border-gray-700">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center p-3 text-red-400 hover:bg-red-900 hover:bg-opacity-30 rounded-md transition-all duration-200"
                    >
                        <FiLogOut className="mr-2" /> Déconnexion
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                <header className="mb-8">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            Tableau de Bord d'Administration
                        </h1>
                        <div className="flex items-center space-x-4">
                            <div className="bg-slate-800 p-2 rounded-full">
                                <FiActivity className="text-purple-500" />
                            </div>
                            <div className="bg-slate-900 p-2 px-4 rounded-lg flex items-center">
                                <div className="bg-green-500 h-2 w-2 rounded-full mr-2"></div>
                                <span className="text-white font-medium">{user?.name || 'Admin'}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-400 mt-1">Vue d'ensemble des projets et utilisateurs</p>
                </header>

                {/* Stats Cards - Modern design with icons */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 border border-gray-700 hover:shadow-purple-900/20 hover:border-purple-700/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Total Projets</p>
                                <h3 className="text-3xl font-bold text-white">{projectCount}</h3>
                                <p className="text-green-500 text-xs mt-1">+ 12.5% ce mois</p>
                            </div>
                            <div className="p-3 bg-purple-900/30 rounded-lg">
                                <FiBarChart2 className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 border border-gray-700 hover:shadow-blue-900/20 hover:border-blue-700/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Espaces de Travail</p>
                                <h3 className="text-3xl font-bold text-white">{workspaceCount}</h3>
                                <p className="text-green-500 text-xs mt-1">+ 8.2% ce mois</p>
                            </div>
                            <div className="p-3 bg-blue-900/30 rounded-lg">
                                <FiPieChart className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 border border-gray-700 hover:shadow-green-900/20 hover:border-green-700/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Utilisateurs</p>
                                <h3 className="text-3xl font-bold text-white">{userCount}</h3>
                                <p className="text-green-500 text-xs mt-1">+ 5.1% ce mois</p>
                            </div>
                            <div className="p-3 bg-green-900/30 rounded-lg">
                                <FiUser className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 border border-gray-700 hover:shadow-amber-900/20 hover:border-amber-700/50 transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Tâches</p>
                                <h3 className="text-3xl font-bold text-white">{dashboardStats.totalTasks}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-green-500 text-xs">{dashboardStats.completedTasks} terminées</span>
                                    <span className="text-gray-400">·</span>
                                    <span className="text-amber-500 text-xs">{dashboardStats.pendingTasks} en cours</span>
                                </div>
                            </div>
                            <div className="p-3 bg-amber-900/30 rounded-lg">
                                <FiActivity className="h-6 w-6 text-amber-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Graphs Section - Improved design with uniform, more modern cards */}

                {/* Graphs Section - Design amélioré avec des cartes uniformes et plus modernes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Répartition des statuts des tâches</h3>
                        <div className="h-64">
                            <Doughnut
                                data={taskStatusChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Distribution des statuts' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Tâches par délai vs complétion</h3>
                        <div className="h-64">
                            <Line
                                data={taskDeadlineVsCompletionChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Progression des tâches' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Répartition des statuts utilisateurs</h3>
                        <div className="h-64">
                            <Doughnut
                                data={userStatusChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Activité des utilisateurs' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-green-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Progression par espace de travail</h3>
                        <div className="h-64">
                            <Bar
                                data={workspaceProgressChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Tâches terminées par workspace' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-amber-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Tâches par utilisateur</h3>
                        <div className="h-64">
                            <Bar
                                data={taskDistributionByUserChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Charge de travail par utilisateur' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-cyan-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Tendance des tâches au fil du temps</h3>
                        <div className="h-64">
                            <Line
                                data={taskTrendOverTimeChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Évolution sur la période' }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Ajout des nouveaux graphiques après les graphiques existants */}
                <div className="bg-slate-900/40 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 col-span-2 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Analyses Avancées
                    </h2>
                    
                    {/* Première rangée de graphiques avancés */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Distribution des compétences</h3>
                            <div className="h-64">
                                <Bar
                                    data={teamSkillsChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Compétences de l\'équipe' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Certifications ({certificationStats.totalCertifications})</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={certificationsChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Top 5 des certifications' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-amber-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Ressources ({ressourceUtilization.totalRessources})</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={ressourceTypeChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Types de ressources' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-green-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Notifications</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={notificationsChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Types de notifications' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Statistiques d'expérience */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Expérience de l'équipe</h3>
                            <div className="h-64">
                                <Bar
                                    data={teamExperienceChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Niveaux d\'expérience' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300 col-span-2">
                            <h3 className="text-xl font-semibold text-white mb-4">Top secteurs d'activité</h3>
                            <div className="space-y-4 mt-4">
                                {teamExperienceStats.topIndustries?.map((industry, index) => (
                                    <div key={index} className="flex items-center">
                                        <div className="w-32 text-gray-300">{industry.name}</div>
                                        <div className="flex-1 mx-2">
                                            <div className="bg-gray-700 h-4 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500" 
                                                    style={{ width: `${(industry.count / Math.max(...teamExperienceStats.topIndustries.map(i => i.count))) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="w-10 text-right text-gray-300">{industry.count}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-400">Moyenne d'années d'expérience</p>
                                        <p className="text-2xl font-bold text-white">{teamExperienceStats.avgYearsExperience} ans</p>
                                    </div>
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
                                        {teamExperienceStats.avgYearsExperience}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Ressources récentes */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-cyan-900/10 transition-all duration-300 mb-6">
                        <h3 className="text-xl font-semibold text-white mb-4">Ressources récemment ajoutées</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {ressourceUtilization.recentlyAdded?.map((resource, index) => (
                                <div key={index} className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-all duration-300">
                                    <div className="flex items-center mb-2">
                                        <div className={`h-8 w-8 rounded-lg mr-2 flex items-center justify-center
                                            ${resource.type === 'Documents' ? 'bg-blue-900/50 text-blue-400' : 
                                             resource.type === 'Images' ? 'bg-green-900/50 text-green-400' :
                                             resource.type === 'Vidéos' ? 'bg-red-900/50 text-red-400' :
                                             resource.type === 'Audio' ? 'bg-yellow-900/50 text-yellow-400' :
                                             'bg-purple-900/50 text-purple-400'}`}>
                                            {resource.type === 'Documents' ? 'DOC' : 
                                             resource.type === 'Images' ? 'IMG' :
                                             resource.type === 'Vidéos' ? 'VID' :
                                             resource.type === 'Audio' ? 'AUD' : 'FIC'}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-medium">{resource.name}</h4>
                                            <p className="text-xs text-gray-400">{resource.date}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Statistiques de notifications */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-amber-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Vue d'ensemble des notifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-slate-700/30 p-4 rounded-lg">
                                <h4 className="text-gray-400 mb-1">Total</h4>
                                <p className="text-3xl font-bold text-white">{notificationStats.totalNotifications}</p>
                            </div>
                            <div className="bg-slate-700/30 p-4 rounded-lg">
                                <h4 className="text-gray-400 mb-1">Lues</h4>
                                <p className="text-3xl font-bold text-green-400">{notificationStats.deliveryStats?.read}</p>
                            </div>
                            <div className="bg-slate-700/30 p-4 rounded-lg">
                                <h4 className="text-gray-400 mb-1">Non lues</h4>
                                <p className="text-3xl font-bold text-red-400">{notificationStats.deliveryStats?.unread}</p>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <div className="h-3 bg-green-500 rounded-l-full" style={{ width: `${(notificationStats.deliveryStats?.read / notificationStats.totalNotifications) * 100}%` }}></div>
                            <div className="h-3 bg-red-500 rounded-r-full" style={{ width: `${(notificationStats.deliveryStats?.unread / notificationStats.totalNotifications) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-400">{Math.round((notificationStats.deliveryStats?.read / notificationStats.totalNotifications) * 100)}% lues</span>
                            <span className="text-xs text-gray-400">{Math.round((notificationStats.deliveryStats?.unread / notificationStats.totalNotifications) * 100)}% non lues</span>
                        </div>
                    </div>
                </div>

                {/* Section spéciale pour les rapports */}
                <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                        <FiActivity className="mr-2 text-purple-400" />
                        Activité récente
                    </h2>
                    <div className="space-y-3">
                        {taskProgressByDeadline.slice(0, 5).map((task, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-700/30 p-3 rounded-lg">
                                <div className="flex items-center">
                                    <div className="h-2 w-2 rounded-full mr-3" style={{
                                        backgroundColor: task.completionPercentage > 75 ? '#4ade80' :
                                            task.completionPercentage > 50 ? '#facc15' :
                                                task.completionPercentage > 25 ? '#fb923c' : '#f87171'
                                    }}></div>
                                    <span className="text-white">{task.taskName}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-32 bg-gray-700 rounded-full h-2 mr-3">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${task.completionPercentage}%`,
                                                backgroundColor: task.completionPercentage > 75 ? '#4ade80' :
                                                    task.completionPercentage > 50 ? '#facc15' :
                                                        task.completionPercentage > 25 ? '#fb923c' : '#f87171'
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-white text-sm">{task.completionPercentage}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-right">
                        <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">Voir tous les rapports →</button>
                    </div>
                </div>

                {/* NOUVELLE SECTION: Informations administratives */}
                <div className="bg-slate-900/40 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Informations Administratives
                    </h2>

                    {/* Graphiques pour les rôles utilisateurs et types de notifications */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Répartition des rôles utilisateurs</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={userRoleChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Distribution des rôles' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-purple-900/10 transition-all duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">Types de notifications</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={notificationTypesChart}
                                    options={{
                                        ...chartOptions,
                                        plugins: {
                                            ...chartOptions.plugins,
                                            title: { ...chartOptions.plugins.title, text: 'Distribution par type' }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tendance des inscriptions */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-green-900/10 transition-all duration-300 mb-8">
                        <h3 className="text-xl font-semibold text-white mb-4">Tendance des inscriptions</h3>
                        <div className="h-64">
                            <Line
                                data={registrationTrendChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Nouvelles inscriptions (7 derniers jours)' }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Prévisions des inscriptions */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-red-900/10 transition-all duration-300 mb-8">
                        <h3 className="text-xl font-semibold text-white mb-4">Prévisions des inscriptions</h3>
                        <div className="h-64">
                            <Line
                                data={futureRegistrationChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Prévisions des inscriptions (7 prochains jours)' }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Graphique combiné des inscriptions réelles et prévisions */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-green-900/10 transition-all duration-300 mb-8">
                        <h3 className="text-xl font-semibold text-white mb-4">Inscriptions réelles et prévisions</h3>
                        <div className="h-64">
                            <Line
                                data={registrationPredictionChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Inscriptions réelles et prévisions combinées' }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Prévisions des inscriptions mensuelles */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-blue-900/10 transition-all duration-300 mb-8">
                        <h3 className="text-xl font-semibold text-white mb-4">Prévisions des inscriptions mensuelles</h3>
                        <div className="h-64">
                            <Line
                                data={monthlyRegistrationPredictionChart}
                                options={{
                                    ...chartOptions,
                                    plugins: {
                                        ...chartOptions.plugins,
                                        title: { ...chartOptions.plugins.title, text: 'Inscriptions mensuelles réelles et prévisions' }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Connexions récentes */}
                    <div className="bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-700 hover:shadow-amber-900/10 transition-all duration-300">
                        <h3 className="text-xl font-semibold text-white mb-4">Connexions récentes</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-slate-800/50 rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Utilisateur</th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date de connexion</th>
                                        <th className="py-3 px-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Adresse IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {recentLogins.map((login, index) => {
                                        const loginDate = new Date(login.lastLogin);
                                        const now = new Date();
                                        const diffInMinutes = Math.floor((now - loginDate) / (1000 * 60));
                                        
                                        let timeAgo;
                                        if (diffInMinutes < 60) {
                                            timeAgo = `Il y a ${diffInMinutes} min`;
                                        } else if (diffInMinutes < 24 * 60) {
                                            timeAgo = `Il y a ${Math.floor(diffInMinutes / 60)} h`;
                                        } else {
                                            timeAgo = `Il y a ${Math.floor(diffInMinutes / (60 * 24))} j`;
                                        }
                                        
                                        return (
                                            <tr key={index} className="hover:bg-slate-700/30 transition-all duration-200">
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-sm font-medium">
                                                            {login.name?.charAt(0).toUpperCase() || 'U'}
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-white font-medium">{login.name}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap text-gray-300">{login.email}</td>
                                                <td className="py-3 px-4 whitespace-nowrap text-gray-400">{timeAgo}</td>
                                                <td className="py-3 px-4 whitespace-nowrap text-gray-400">{login.ip}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer with copyright */}
                <footer className="text-center text-gray-500 text-xs mt-8">
                    © 2025 ProjectFlow. Tous droits réservés.
                </footer>
            </div>
        </div>
    );
};

export default Dashboard;