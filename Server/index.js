const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());

connectDB();

const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const projectRoutes = require('./routes/projectRoutes');
const workspaceRoutes = require('./routes/WorkspaceRoutes');

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRoutes)


app.get('/', (req, res) => {
  res.send('Project Management Platform Backend');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});