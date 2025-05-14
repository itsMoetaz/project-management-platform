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

        stage('Debug Environment') {
    steps {
        sh 'node -v'
        sh 'npm -v'
    }
}


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
            // Install dependencies with legacy-peer-deps
            sh 'npm install --legacy-peer-deps'
            
            // Install ESLint v8
            sh 'npm install eslint@8 --save-dev --legacy-peer-deps'
            
            // Remove any conflicting eslint.config.js/mjs file if it exists
            sh 'rm -f eslint.config.js eslint.config.mjs'
            
            // Run ESLint with --use-eslintrc flag
            sh 'npx eslint . --use-eslintrc'
        }
        }}

        stage('Build Frontend') {
            steps {
                dir('Client') {
                    
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


}
