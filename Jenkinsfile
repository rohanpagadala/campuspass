pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        // Override via Jenkins job/global config with your real Docker Hub
        // username - this is just a placeholder so the pipeline is runnable
        // out of the box for anyone who forks the repo.
        DOCKERHUB_NAMESPACE = "${env.DOCKERHUB_NAMESPACE ?: 'yourdockerhubuser'}"
        BACKEND_IMAGE = "${DOCKERHUB_NAMESPACE}/campuspass-backend"
        FRONTEND_IMAGE = "${DOCKERHUB_NAMESPACE}/campuspass-frontend"
    }

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend: install + pytest') {
            steps {
                sh '''
                    python3 -m venv .venv
                    . .venv/bin/activate
                    pip install --no-cache-dir -r requirements-dev.txt
                    pytest tests/ -v --junitxml=backend-test-results.xml
                '''
            }
            post {
                always {
                    junit 'backend-test-results.xml'
                }
            }
        }

        stage('Frontend: install + test + build') {
            steps {
                dir('frontend') {
                    sh '''
                        npm ci
                        npm run test
                        npm run build
                    '''
                }
            }
        }

        stage('Docker: build images') {
            steps {
                sh """
                    docker build -t ${BACKEND_IMAGE}:${BUILD_NUMBER} -t ${BACKEND_IMAGE}:latest .
                    docker build -t ${FRONTEND_IMAGE}:${BUILD_NUMBER} -t ${FRONTEND_IMAGE}:latest ./frontend
                """
            }
        }

        stage('Docker: push to Docker Hub') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: "${DOCKERHUB_CREDENTIALS}",
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_PASS'
                )]) {
                    sh '''
                        echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin
                    '''
                }
                sh """
                    docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}
                    docker push ${BACKEND_IMAGE}:latest
                    docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}
                    docker push ${FRONTEND_IMAGE}:latest
                """
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                // --- CHOOSE ONE: Kubernetes (kubectl) or Ansible, whichever
                // this pipeline's target environment actually uses. Both are
                // shown; the unused one is commented out. Neither runs
                // automatically here without a real target cluster/hosts
                // reachable from the Jenkins agent and the relevant
                // kubeconfig / SSH credentials configured in Jenkins.

                // -- Kubernetes --
                sh """
                    kubectl apply -f k8s/
                    kubectl set image deployment/campuspass-backend campuspass-backend=${BACKEND_IMAGE}:${BUILD_NUMBER} -n campuspass
                    kubectl set image deployment/campuspass-frontend campuspass-frontend=${FRONTEND_IMAGE}:${BUILD_NUMBER} -n campuspass
                    kubectl rollout status deployment/campuspass-backend -n campuspass
                    kubectl rollout status deployment/campuspass-frontend -n campuspass
                """

                // -- Ansible (alternative to the kubectl block above) --
                // sh """
                //     ansible-playbook -i ansible/inventory/hosts.ini ansible/playbook.yml \\
                //         --extra-vars "backend_image=${BACKEND_IMAGE}:${BUILD_NUMBER} frontend_image=${FRONTEND_IMAGE}:${BUILD_NUMBER}"
                // """
            }
        }

        stage('Deploy: trigger Render') {
            when {
                branch 'main'
            }
            steps {
                // RENDER_DEPLOY_HOOK_BACKEND / _FRONTEND are Jenkins secret
                // text credentials holding each service's deploy hook URL
                // (Render dashboard -> service -> Settings -> Deploy Hook).
                withCredentials([
                    string(credentialsId: 'render-deploy-hook-backend', variable: 'RENDER_HOOK_BACKEND'),
                    string(credentialsId: 'render-deploy-hook-frontend', variable: 'RENDER_HOOK_FRONTEND')
                ]) {
                    sh '''
                        curl -fsS -X POST "$RENDER_HOOK_BACKEND"
                        curl -fsS -X POST "$RENDER_HOOK_FRONTEND"
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        failure {
            echo 'Pipeline failed - see stage logs above.'
        }
    }
}
