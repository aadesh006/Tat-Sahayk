# Tat-Sahayk

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Tat-Sahayk** (तट सहायक - meaning "Coast Helper") is an intelligent ocean hazard reporting and monitoring platform developed for **INCOIS** (Indian National Centre for Ocean Information Services). The platform combines citizen reporting with AI-powered social media monitoring to provide real-time coastal disaster intelligence.

## Overview

Tat-Sahayk addresses critical challenges in coastal disaster management by:
- **Crowdsourcing** real-time hazard reports from coastal communities
- **Monitoring** social media platforms for emerging ocean hazards
- **Analyzing** trends using NLP and machine learning
- **Alerting** authorities with verified, geotagged intelligence

## Key Features

### Citizen Reporting System
- **Mobile-First PWA** - Works on iOS, Android, and desktop browsers
- **Offline-First Architecture** - Reports stored locally, synced when online
- **Rich Media Support** - Upload photos/videos with automatic compression
- **Geolocation** - Automatic GPS tagging with accuracy metadata
- **Multi-Language** - Support for regional Indian languages

### AI-Powered Social Media Intelligence
- **Real-Time Monitoring** - Track Twitter/X, Facebook, YouTube, Reddit, Instagram
- **NLP Analysis** - Sentiment analysis and panic level detection
- **Hazard Classification** - ML models identify tsunami, cyclone, erosion, pollution, flooding
- **Named Entity Recognition** - Extract locations, dates, and event names
- **Trend Detection** - Identify emerging hazards from conversation patterns

### Official Dashboard
- **Interactive GIS Mapping** - Visualize reports with clustering and heatmaps
- **Real-Time Updates** - WebSocket-powered live data streaming
- **Report Verification** - Admin workflow for validating citizen reports
- **Analytics Dashboard** - Trends, hotspots, and historical patterns
- **Alert Management** - Create and broadcast official warnings

### External Data Integration
- **Ocean Data APIs** - Real-time wave height, sea surface temperature
- **Weather Services** - OpenWeather integration
- **Tsunami Alerts** - International early warning systems
- **Storm Glass** - Marine weather forecasts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tat-Sahayk Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Frontend    │  │   Backend    │  │   ML Service    │   │
│  │  (React PWA)  │◄─┤  (FastAPI)   │◄─┤   (FastAPI)     │   │
│  │               │  │              │  │                 │   │
│  │  • Vite       │  │  • SQLAlchemy│  │  • TensorFlow   │   │
│  │  • TailwindCSS│  │  • PostgreSQL│  │  • Transformers │   │
│  │  • Leaflet.js │  │  • JWT Auth  │  │  • Scikit-learn │   │
│  └───────────────┘  └──────────────┘  └─────────────────┘   │
│         │                  │                    │           │
│         └──────────────────┴────────────────────┘           │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  PostgreSQL DB  │                       │
│                   │                 │                       │
│                   │  • User Data    │                       │
│                   │  • Reports      │                       │
│                   │  • Social Posts │                       │
│                   │  • Analytics    │                       │
│                   └─────────────────┘                       │
│                                                             │
│  External Services:                                         │
│  • Twitter/X API  • OpenWeather  • Tsunami Alerts           │
│  • Facebook Graph • Storm Glass  • Ocean Data APIs          │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
tat-sahayk/
├── backend/                    # FastAPI backend service
│   ├── app/
│   │   ├── api/               # API endpoints
│   │   │   └── v1/endpoints/
│   │   │       ├── auth.py    # Authentication
│   │   │       ├── media.py   # Media uploads
│   │   │       ├── reports.py # Hazard reports
│   │   │       └── social.py  # Social media
│   │   ├── core/              # Config & security
│   │   ├── crud/              # Database operations
│   │   ├── db/                # Database setup
│   │   ├── models/            # SQLAlchemy models
│   │   └── schemas/           # Pydantic schemas
│   └── scripts/
│       └── harvest_social.py  # Social media scraper
│
├── frontend/                   # React PWA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # API & utilities
│   │   └── pages/             # Application pages
│   │       ├── HomePage.jsx   # Landing page
│   │       ├── LoginPage.jsx  # Authentication
│   │       ├── MapPage.jsx    # Interactive map
│   │       └── ReportPage.jsx # Report submission
│   └── public/                # Static assets
│
├── ml-service/                 # Machine Learning microservice
│   ├── config/                # ML configuration
│   │   ├── model_config.py    # Model parameters
│   │   └── social_media_config.py
│   ├── models/                # Trained ML models
│   │   └── text_classifier/   # BERT-based classifier
│   ├── src/
│   │   ├── analytics/         # Analytics engines
│   │   │   ├── credibility_scorer.py
│   │   │   ├── trend_analyzer.py
│   │   │   ├── hotspot_generator.py
│   │   │   └── geospatial_analysis.py
│   │   ├── api/               # ML API endpoints
│   │   ├── data_collection/   # Social media collectors
│   │   │   ├── twitter_collector.py
│   │   │   ├── facebook_collector.py
│   │   │   ├── instagram_collector.py
│   │   │   ├── reddit_collector.py
│   │   │   └── youtube_collector.py
│   │   ├── external/          # External API clients
│   │   │   ├── ocean_data_client.py
│   │   │   ├── openweather_client.py
│   │   │   ├── stormglass_client.py
│   │   │   └── tsunami_alerts.py
│   │   ├── inference/         # ML inference
│   │   │   ├── text_predictor.py
│   │   │   ├── sentiment_predictor.py
│   │   │   └── image_classifier.py
│   │   ├── preprocessing/     # Data preprocessing
│   │   └── training/          # Model training
│   ├── scripts/               # Utility scripts
│   └── tests/                 # Test suite
│
├── docker-compose.yml          # Multi-container orchestration
└── README.md
```

## Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended) OR
- **Python 3.8+**
- **Node.js 18+**
- **PostgreSQL 14+**

### Option 1: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/aadesh006/tat-sahayk.git
cd tat-sahayk

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# ML Service: http://localhost:8001
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

#### ML Service Setup

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your API keys for social media and weather services

# Download pre-trained models (if not included)
python scripts/download_data.py

# Start ML service
uvicorn src.api.routes.main:app --reload --host 0.0.0.0 --port 8001
```

## 🔑 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/tatsahayk
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALGORITHM=HS256

# CORS
FRONTEND_URL=http://localhost:3000

# Media Storage
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=10485760  # 10MB
```

### ML Service (.env)
```env
# Social Media APIs
TWITTER_BEARER_TOKEN=your_token
FACEBOOK_ACCESS_TOKEN=your_token
REDDIT_CLIENT_ID=your_id
REDDIT_CLIENT_SECRET=your_secret
YOUTUBE_API_KEY=your_key

# Weather & Ocean Data
OPENWEATHER_API_KEY=your_key
STORMGLASS_API_KEY=your_key

# Model Configuration
MODEL_PATH=./models/text_classifier
BATCH_SIZE=32
MAX_LENGTH=128
```

## ML Models

### Text Classification Model
- **Architecture**: DistilBERT (distilbert-base-uncased)
- **Task**: Multi-class hazard classification
- **Classes**: Tsunami, Cyclone, Coastal Erosion, Marine Pollution, Flooding, High Waves
- **Accuracy**: ~92% on validation set

### Sentiment Analysis
- **Architecture**: BERT-based sentiment model
- **Task**: Binary classification (positive/negative)
- **Use Case**: Panic level detection in social posts

### Image Classification
- **Architecture**: ResNet50 (transfer learning)
- **Task**: Hazard type detection from images
- **Classes**: Tsunami damage, flooding, erosion, pollution

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login user
POST   /api/v1/auth/refresh      # Refresh token
GET    /api/v1/auth/me           # Get current user
```

### Reports
```
GET    /api/v1/reports           # List all reports
POST   /api/v1/reports           # Create new report
GET    /api/v1/reports/{id}      # Get report details
PUT    /api/v1/reports/{id}      # Update report
DELETE /api/v1/reports/{id}      # Delete report
POST   /api/v1/reports/{id}/verify  # Verify report
```

### Social Media
```
GET    /api/v1/social/posts      # List social posts
GET    /api/v1/social/trends     # Get trending hazards
GET    /api/v1/social/hotspots   # Get geographic hotspots
```

### Media
```
POST   /api/v1/media/upload      # Upload media file
GET    /api/v1/media/{id}        # Get media file
DELETE /api/v1/media/{id}        # Delete media
```

### ML Service
```
POST   /ml/predict/text          # Classify text hazard
POST   /ml/predict/sentiment     # Analyze sentiment
POST   /ml/predict/image         # Classify image
GET    /ml/analytics/trends      # Get trend analytics
GET    /ml/analytics/hotspots    # Get geographic analysis
```

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v --cov=app
```

### ML Service Tests
```bash
cd ml-service
pytest tests/ -v --cov=src
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Tests
```bash
# Start all services first
docker-compose up -d

# Run integration tests
cd ml-service
pytest tests/test_integration.py -v
```

## Monitoring & Analytics

### Available Analytics

1. **Trend Analysis**
   - Temporal patterns in hazard reports
   - Seasonal variations
   - Emerging threat detection

2. **Hotspot Generation**
   - Geographic clustering of reports
   - High-risk zone identification
   - Heatmap visualization

3. **Credibility Scoring**
   - Report verification confidence
   - User reputation tracking
   - Cross-source validation

4. **Engagement Tracking**
   - Social media reach
   - Report response times
   - User participation metrics

### Accessing Analytics

```python
# Via Python API
from ml_service.analytics import TrendAnalyzer, HotspotGenerator

analyzer = TrendAnalyzer()
trends = analyzer.analyze_trends(timeframe='7d')

hotspot_gen = HotspotGenerator()
hotspots = hotspot_gen.generate_hotspots(radius_km=50)
```

## Development

### Adding a New Social Media Platform

1. **Create collector class** in `ml-service/src/data_collection/`
```python
from .base_collector import BaseCollector

class NewPlatformCollector(BaseCollector):
    def collect_posts(self, keywords, limit=100):
        # Implement collection logic
        pass
```

2. **Update configuration** in `ml-service/config/social_media_config.py`

3. **Add platform to routes** in `ml-service/src/api/routes/main.py`

### Training Custom Models

```bash
cd ml-service

# Generate training data
python scripts/download_data.py

# Train text classifier
python src/training/train_text_classifier.py

# Evaluate model
python scripts/evaluate_models.py

# Deploy model
python scripts/deploy_models.py
```

## Deployment

### Production Deployment with Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose logs -f
```

### Environment-Specific Configs

- **Development**: `docker-compose.yml`
- **Staging**: `docker-compose.staging.yml`
- **Production**: `docker-compose.prod.yml`

### Scaling

```bash
# Scale ML service for high load
docker-compose up -d --scale ml-service=3

# Scale backend API
docker-compose up -d --scale backend=2
```

## Security

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt with salt
- **CORS Protection** - Configured allowed origins
- **Rate Limiting** - API throttling to prevent abuse
- **Input Validation** - Pydantic schemas for all inputs
- **SQL Injection Prevention** - SQLAlchemy ORM
- **XSS Protection** - Content sanitization

---

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Write/update tests
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---
### Contributors
**Aadesh Chaudhari**  
GitHub: [@aadesh006](https://github.com/aadesh006)

**Hardik Gupta**  
GitHub: [@aadesh006](https://github.com/Hardikgupta1709)

**Priyal Khandal**  
GitHub: [@aadesh006](https://github.com/Priyal-2905)