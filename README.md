#  Tat-Sahayk - Ocean Hazard Detection & Early Warning System

> **Protecting India's 7,500km coastline with AI-powered real-time intelligence**

Tat-Sahayk is an intelligent ocean hazard detection platform that combines **crowdsourced reports**, **social media monitoring**, and **AI/ML analysis** to provide real-time alerts for coastal communities across India.

[![Python](https://img.shields.io/badge/Python-3.10-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

##  **Key Features**

-  **Real-Time AI Detection** - Analyzes hazard reports in <100ms with 85% accuracy
-  **Geospatial Hotspot Detection** - DBSCAN clustering with 1000x faster processing
-  **Citizen Reporting** - One-tap hazard submission with photo upload
-  **Multi-Modal Analysis** - Text + Image + Real ocean data verification
-  **Admin Dashboard** - Real-time monitoring with interactive maps
-  **Smart Alerts** - Push notifications to communities in danger zones
-  **Social Feed** - Automated RSS harvesting from trusted news sources

---

##  **Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  React + Tailwind CSS + Leaflet Maps + PWA                  │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                        BACKEND                              │
│  FastAPI + PostgreSQL + PostGIS + Redis + APScheduler       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      ML SERVICE                             │
│  PyTorch + Transformers + spaCy + scikit-learn              │
│  - DistilBERT Text Classification (7 hazard types)          │
│  - CNN Image Classification                                 │
│  - VADER Sentiment Analysis                                 │
│  - Geospatial Analysis (Optimized KD-Tree)                  │
└─────────────────────────────────────────────────────────────┘
```

---

##  **Quick Start**

### **Prerequisites**

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Docker & Docker Compose (optional)

### **Option 1: Docker Setup (Recommended)**

```bash
# Clone the repository
git clone https://github.com/yourusername/tat-sahayk.git
cd tat-sahayk

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# ML Service: http://localhost:8001
# API Docs: http://localhost:8000/docs
```

### **Option 2: Manual Setup**

#### **1. Backend Setup**

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

#### **2. ML Service Setup**

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download required models
python -m spacy download en_core_web_sm
python scripts/download_models.py

# Configure environment
cp .env.example .env
# Add your API keys (OpenWeatherMap, StormGlass)

# Start the service
uvicorn src.api.routes.main:app --reload --port 8001
```

#### **3. Frontend Setup**

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Update API endpoints

# Start development server
npm start
```

---

##  **Project Structure**

```
tat-sahayk/
├── backend/                # FastAPI backend service
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, security
│   │   ├── crud/          # Database operations
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── scripts/           # Utility scripts
│   └── requirements.txt
│
├── ml-service/            # ML/AI service
│   ├── src/
│   │   ├── analytics/     # Geospatial, hotspot detection
│   │   ├── inference/     # Text & image classifiers
│   │   ├── models/        # ML model classes
│   │   └── api/           # FastAPI ML endpoints
│   ├── config/            # Settings
│   ├── tests/             # Unit & integration tests
│   └── requirements.txt
│
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API clients
│   │   └── utils/         # Helper functions
│   └── package.json
│
└── docker-compose.yml     # Docker orchestration
```

---

##  **Configuration**

### **Backend `.env`**

```env
PROJECT_NAME=Tat-Sahayk
DATABASE_URL=postgresql://user:password@localhost:5432/tat_sahayk
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### **ML Service `.env`**

```env
# API Keys for external services
OPENWEATHER_API_KEY=your-openweather-key
STORMGLASS_API_KEY=your-stormglass-key

# Model settings
TEXT_MODEL_NAME=distilbert-base-uncased
BATCH_SIZE=32
MAX_SEQUENCE_LENGTH=512
```

---

##  **Testing**

### **Backend Tests**

```bash
cd backend
pytest tests/ -v
```

### **ML Service Tests**

```bash
cd ml-service
pytest tests/ -v --cov=src

# Run specific test suites
pytest tests/test_analytics.py -v
pytest tests/test_api_endpoints.py -v
```

### **Integration Tests**

```bash
cd ml-service
pytest tests/test_integration.py -v
```

---

##  **API Documentation**

Once the services are running, access the interactive API documentation:

- **Backend API**: http://localhost:8000/docs
- **ML Service API**: http://localhost:8001/docs

### **Key Endpoints**

#### **Backend**
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/reports/` - Create hazard report
- `GET /api/v1/reports/` - List reports with filters
- `GET /api/v1/social/` - Get social media feed

#### **ML Service**
- `POST /api/v1/analyze/text` - Analyze text for hazards
- `POST /api/v1/analyze/multimodal` - Text + Image analysis
- `POST /api/v1/hotspots/detect` - Detect geographic hotspots
- `POST /api/v1/verify/report` - Verify with real ocean data

---

##  **ML Models**

### **Text Classification**
- **Model**: DistilBERT (distilbert-base-uncased)
- **Classes**: 7 hazard types (tsunami, cyclone, high_waves, storm_surge, coastal_erosion, flood, none)
- **Accuracy**: ~85%
- **Inference Time**: <100ms

### **Image Classification**
- **Model**: CNN-based classifier
- **Input**: Coastal hazard images
- **Output**: Hazard type + confidence score

### **Geospatial Analysis**
- **Algorithm**: DBSCAN clustering with KD-Tree optimization
- **Performance**: 1000x faster than traditional methods
- **Use Case**: Real-time hotspot detection

### **Sentiment Analysis**
- **Model**: VADER + custom panic detection
- **Features**: Urgency scoring, emotion analysis

---

##  **Key Technologies**

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React, Tailwind CSS, Leaflet, Axios, React Router |
| **Backend** | FastAPI, PostgreSQL, PostGIS, Redis, SQLAlchemy |
| **ML/AI** | PyTorch, Transformers, spaCy, scikit-learn, NumPy |
| **DevOps** | Docker, Docker Compose, Nginx |
| **External APIs** | OpenWeatherMap, StormGlass, GDACS, Cloudinary |

---

##  **Performance**

- **Response Time**: <100ms per text analysis
- **Throughput**: 1000+ reports per hour
- **Geospatial Processing**: 1000x faster with KD-Tree
- **Database Queries**: Optimized with PostGIS spatial indexing
- **API Latency**: p95 < 200ms

---

##  **Use Cases**

1. **Citizen Reporting** - Fishermen and coastal residents report hazards instantly
2. **Government Monitoring** - Officials track threats via admin dashboard
3. **Early Warning** - Automated alerts to communities in danger zones
4. **Research & Analysis** - Historical data for disaster management studies
5. **Media Intelligence** - Automated social media monitoring for emerging threats

---

##  **Development**

### **Running Tests with Coverage**

```bash
# ML Service tests with coverage
cd ml-service
pytest --cov=src --cov-report=html
open htmlcov/index.html

# Backend tests
cd backend
pytest --cov=app --cov-report=html
```

### **Code Formatting**

```bash
# Python (using black)
black backend/ ml-service/

# JavaScript (using prettier)
cd frontend
npm run format
```

### **Database Migrations**

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

##  **Deployment**

### **Production Checklist**

- [ ] Set `DEBUG=False` in environment variables
- [ ] Use strong `SECRET_KEY` (generate with `openssl rand -hex 32`)
- [ ] Configure CORS origins to specific domains
- [ ] Set up SSL/TLS certificates
- [ ] Enable PostgreSQL connection pooling
- [ ] Configure Redis persistence
- [ ] Set up automated backups
- [ ] Configure logging and monitoring
- [ ] Set up CI/CD pipeline

### **Docker Production Build**

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

---

##  **Contributing**

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Coding Standards**

- **Python**: Follow PEP 8, use type hints
- **JavaScript**: Use ESLint config, Prettier formatting
- **Git Commits**: Use conventional commits (feat, fix, docs, etc.)
- **Tests**: Write tests for new features

---

##  **License**

This project is licensed under the MIT License 

---

##  **Team**

Built with  by the Tat-Sahayk team for India's coastal communities.

- **ML- Service**: Hardik Gupta
- **Backend Developer**: Aadesh Chaudhari
- **Frontend Developer**: Priyal Khandal

---

##  **Acknowledgments**

- **INCOIS** - Indian National Centre for Ocean Information Services
- **NDMA** - National Disaster Management Authority
- **Coastal Communities** - For invaluable feedback and testing
- **Open Source Community** - For amazing tools and libraries

---

<p align="center">
  <strong> Every Second Counts. Every Life Matters. </strong>
</p>

<p align="center">
  Made with  for India's Coastal Communities
</p>
