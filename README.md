# Planify - Project Management Platform

<div align="center">
  
![Planify Logo](./logo.png)

</div>

## 📋 Overview

Planify is a comprehensive full-stack project management platform designed to streamline the organization of projects, tasks, teams, and deadlines. It combines intuitive user interfaces with AI-powered analytics to help teams prioritize work intelligently and forecast performance trends.

## ✨ Key Features

- **Authentication & Authorization**
  - Secure JWT & OAuth integration
  - Role-based access control system
  
- **Project Management**
  - Multiple project workspace support
  - Task creation and assignment
  - Custom workflow pipelines
  - Timeline visualization with Gantt charts
  
- **Team Collaboration**
  - Real-time updates and notifications
  - Commenting and discussion threads
  - File sharing and version control
  - Team member role management
  
- **Analytics & Reporting**
  - Interactive performance dashboards
  - AI-powered productivity insights
  - Customizable report generation
  - Resource allocation visualization
  
- **History & Tracking**
  - Comprehensive activity logs
  - Time tracking functionality
  - Audit trails for compliance

## 💻 Technology Stack

### Frontend
- **React.js** - Component-based UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Redux** - State management
- **Chart.js** - Data visualization

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Socket.IO** - Real-time communication

### AI & Machine Learning
- **Python** - ML infrastructure
- **TensorFlow** - Neural network framework
- **Pandas** - Data manipulation and analysis

### DevOps & Infrastructure
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **AWS/Azure** - Cloud hosting

## 📂 Project Structure

```
planify/
├── client/                 # React frontend
│   ├── public/             # Static files
│   ├── src/                # Source code
│   ├── package.json        # Dependencies
│   └── README.md           # Frontend documentation
│
├── server/                 # Express backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Custom middleware
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Helper functions
│   ├── app.js              # Express application
│   ├── package.json        # Dependencies
│   └── README.md           # Backend documentation
│
├── ai/                     # AI modules
│   ├── models/             # ML model definitions
│   ├── data/               # Training datasets
│   ├── notebooks/          # Jupyter notebooks
│   ├── scripts/            # Training scripts
│   ├── requirements.txt    # Python dependencies
│   └── README.md           # AI documentation
│
├── docker-compose.yml      # Docker orchestration
├── .github/                # GitHub configuration
├── .gitignore              # Git ignore rules
├── LICENSE                 # License information
└── README.md               # Main documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB (v5+)
- Docker & Docker Compose (for containerized setup)
- Python 3.8+ (for AI modules)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/planify.git
   cd planify
   ```

2. **Set up environment variables**
   ```bash
   # Create .env files from examples
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   ```

3. **Install dependencies**
   ```bash
   # Backend dependencies
   cd server
   npm install

   # Frontend dependencies
   cd ../client
   npm install

   # AI module dependencies (optional)
   cd ../ai
   pip install -r requirements.txt
   ```

### Running the Application

#### Development Mode

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```

2. **Start the frontend client**
   ```bash
   cd client
   npm start
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

#### Using Docker

```bash
# Start all services
docker-compose up

# Rebuild containers when needed
docker-compose up --build
```

## 📝 API Documentation

API documentation is available at `http://localhost:5000/api-docs` when the server is running.

## 🧪 Testing

```bash
# Run backend tests
cd server
npm test

# Run frontend tests
cd client
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

