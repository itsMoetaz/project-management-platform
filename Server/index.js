const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const app = express();
const Project = require('./models/Project');
const notificationController = require('./controllers/notificationController');
const cron = require('node-cron');
const axios = require('axios'); // Ajout de l'importation d'axios
require("dotenv").config();
const cookieParser = require("cookie-parser");
const Bug = require('./models/Bug');

// Initialisation d'Express
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configuration CORS unique
app.use(
  cors({
    origin: [
      "https://project-management-platform-7osu.vercel.app/" || "http://localhost:5173",
      "http://localhost:3000"
    ],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connexion à MongoDB (appel unique)
connectDB();

// Importation des routes
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const projectRoutes = require("./routes/projectRoutes");
const workspaceRoutes = require("./routes/WorkspaceRoutes");
const experienceRoutes = require("./routes/experienceRoutes");
const ressourceRoutes = require("./routes/ressourceRoutes");
const certificationRoutes = require('./routes/certificationsRoutes');
const skillsRoutes = require('./routes/skillsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const messageRoutes = require('./routes/messageRoutes');
const projectHistoryRoutes = require('./routes/projectHistoryRoutes');
const bugRoutes = require('./routes/bugRoutes');
const resignationRoutes = require('./routes/resignationRoutes');
// Utilisation des routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api", taskRoutes);
app.use('/api', messageRoutes);
app.use('/api', projectHistoryRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/ressources", ressourceRoutes);
app.use('/api/certifications', certificationRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/bugs', bugRoutes);
app.use('/api/resignations', resignationRoutes);
// Route pour le matching de profils (non modifiée)
app.post('/api/match-profiles', async (req, res) => {
  const { workspace_id, task_description } = req.body;
  
  try {
    const path = require('path');
    const scriptPath = path.resolve(__dirname, '../Moetaz.py');
    const pythonPath = 'C:\\Users\\moeta\\OneDrive\\Desktop\\pi\\project-management-platform\\venv\\Scripts\\python.exe';
    
    console.log(`Running Python script with:`, {
      workspace_id,
      task_description,
      scriptPath,
      pythonPath
    });
    
    const { spawn } = require('child_process');
    const python = spawn(pythonPath, [
      scriptPath,
      '--workspace_id', workspace_id,
      '--task_description', task_description
    ]);
    
    let matchData = '';
    let errorData = '';
    
    python.stdout.on('data', (data) => {
      matchData += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error(`Python script log: ${data}`);
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        return res.status(500).json({ 
          error: 'Profile matching failed', 
          details: errorData || 'Unknown error' 
        });
      }
      
      try {
        let jsonStr = matchData.trim();
        if (jsonStr.includes('[{') && jsonStr.includes('}]')) {
          const jsonStart = jsonStr.indexOf('[{');
          const jsonEnd = jsonStr.lastIndexOf('}]') + 2;
          jsonStr = jsonStr.substring(jsonStart, jsonEnd);
        }
        
        const results = JSON.parse(jsonStr);
        res.json(results);
      } catch (error) {
        console.error('Failed to parse Python output:', error);
        console.error('Raw output:', matchData);
        return res.status(500).json({ 
          error: 'Failed to parse matching results',
          details: 'Check server logs for the raw output' 
        });
      }
    });
  } catch (error) {
    console.error('Error executing Python script:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route corrigée pour prédire le retard d'un projet spécifique
app.post('/api/projects/:id/predict-delay', async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log('Project ID reçu:', projectId);

    // Vérifier si le projet existe dans MongoDB
    const project = await Project.findById(projectId);
    console.log('Projet trouvé:', project);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Envoyer une requête POST à Flask avec uniquement le projectId
    console.log('Envoi de la requête à Flask avec:', { projectId });
    const flaskResponse = await axios.post('http://127.0.0.1:5000/predict', {
      projectId: projectId
    });

    // Renvoyer la réponse de Flask au frontend
    console.log('Réponse de Flask:', flaskResponse.data);
    res.status(200).json(flaskResponse.data);
  } catch (error) {
    console.error('Erreur complète lors de la prédiction via Flask:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la prédiction', 
      error: error.message, 
      stack: error.stack 
    });
  }
});

// This sets up a daily check at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily project deadline check...');
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    // Find projects with deadlines approaching within a month
    const projects = await Project.find({
      end_date: {
        $gte: new Date(), // Not passed yet
        $lte: oneMonthFromNow // Within a month
      },
      // Only notify about projects we haven't sent a notification for yet
      deadline_notification_sent: { $ne: true }
    }).populate('id_teamMembre', '_id');
    
    console.log(`Found ${projects.length} projects approaching deadline`);
    
    // Create notifications for each project
    for (const project of projects) {
      const daysRemaining = Math.ceil((new Date(project.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      
      // Notify each team member
      if (project.id_teamMembre && project.id_teamMembre.length > 0) {
        for (const member of project.id_teamMembre) {
          await notificationController.createNotification({
            recipient: member._id,
            type: 'deadline',
            message: `Project "${project.project_name || project.name}" deadline approaching in ${daysRemaining} days!`,
            relatedProject: project._id,
            actionLink: `/workspace/${project.id_workspace}/projects/${project._id}`,
            priority: 'high'
          });
        }
      }
      
      // Mark that we've sent the notification
      await Project.findByIdAndUpdate(project._id, { deadline_notification_sent: true });
    }
    
    console.log('Project deadline check completed');
  } catch (error) {
    console.error('Error in deadline notification job:', error);
  }
});

// Route de base
app.get("/", (req, res) => {
  res.send("Project Management Platform Backend");
});

// Initialisation du serveur avec Socket.IO
const http = require('http');
const { initializeSocket } = require('./Socket');
const server = http.createServer(app);
initializeSocket(server);

// Utilisation du port 3000 pour cohérence avec les tests précédents
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});