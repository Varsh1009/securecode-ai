# 🛡️ SecureCode AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.108-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)

Real-time code vulnerability detection IDE plugin with ML-powered analysis and runtime telemetry.

##  Features

-  Real-time vulnerability detection as you type
- ML-powered analysis using fine-tuned CodeBERT
-  Natural language explanations of vulnerabilities
-  Runtime telemetry and performance monitoring
- VS Code extension with inline suggestions
- Web dashboard for security analytics
-  CI/CD integration

## 🏗️ Architecture
```
VS Code Extension → FastAPI Gateway → Redis Streams/RabbitMQ
                                    → ML Models (Python + Rust)
                                    → PostgreSQL + Vector DB
                                    → OpenTelemetry Stack
```

## 🛠️ Tech Stack

**Frontend:** TypeScript, VS Code Extension API, React  
**Backend:** Python (FastAPI), Rust (pattern matching)  
**ML:** PyTorch, HuggingFace Transformers, CodeBERT  
**Streaming:** Redis Streams, RabbitMQ  
**Databases:** PostgreSQL, ChromaDB (vector)  
**Observability:** OpenTelemetry, Prometheus, Grafana, Jaeger  
**Deployment:** Docker, Kubernetes, Azure

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- VS Code

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/securecode-ai.git
cd securecode-ai
```

### 2. Start infrastructure services
```bash
cd infrastructure/docker
docker-compose up -d
```

### 3. Verify services are running
```bash
docker-compose ps
```

### 4. Access services
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)
- **Grafana:** http://localhost:3000 (admin/admin)
- **Prometheus:** http://localhost:9090
- **Jaeger UI:** http://localhost:16686
- **pgAdmin:** http://localhost:5050

## 👤 Author

**Shrivarshini Narayanan**  
[LinkedIn](https://linkedin.com/in/shrivarshini-narayanan) | [GitHub](https://github.com/Varsh1009)


