pipeline {
    agent any

    tools {
        nodejs 'NodeJS v18'
    }

    environment {
        // Define environment variables if needed
        NODE_ENV = 'production'
    }

    stages {
        stage('Build Server') {
            steps {
                dir('Server') {
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('Test Server') {
            steps {
                dir('Server') {
                    sh 'npm test'
                }
            }
        }

        stage('Verify Code Quality') {
            steps {
                dir('Server') {
                    // Run linting to ensure code quality
                    sh 'npm run lint'
                }
                dir('Client') {
                    // Run linting for the React frontend
                    sh 'npm run lint'
                }
            }
        }

        stage('Build Frontend') {
            steps {
                dir('Client') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                script {
                    // Build Docker images for the backend and frontend
                    sh 'docker build -t mern-backend ./Server'
                    sh 'docker build -t mern-frontend ./Client'
                }
            }
        }

        stage('Deploy to Docker') {
            steps {
                script {
                    // Run MongoDB container
                    sh 'docker run -d --name mongodb -p 27017:27017 mongo'

                    // Run Backend container
                    sh 'docker run -d --name mern-backend --link mongodb -p 3000:3000 mern-backend'

                    // Run Frontend container
                    sh 'docker run -d --name mern-frontend -p 80:80 mern-frontend'
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning up workspace..."
            cleanWs()
        }
        success {
            echo "✅ Build and deployment completed successfully!"
        }
        failure {
            echo "❌ Build or deployment failed. Check the logs for details."
        }
    }
}