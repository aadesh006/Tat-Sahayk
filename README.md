# Tat-Sahayk: Ocean Hazard Reporting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-green.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-teal.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**Tat-Sahayk** (meaning "Coast Helper" in Hindi) is an intelligent coastal disaster management platform developed for **INCOIS** (Indian National Centre for Ocean Information Services). The platform combines crowdsourced citizen reports with AI-powered social media monitoring to enable real-time emergency response during coastal hazards.

## Key Features

### Citizen Reporting
- **Mobile-First PWA** - Works seamlessly on iOS and Android devices
- **Geotagged Reports** - Automatic GPS coordinate capture with accuracy metadata
- **Rich Media Support** - Photo and video upload with automatic compression
- **Offline-First Architecture** - Reports stored locally and synced when online
- **Multi-Step Forms** - Guided hazard reporting with real-time validation

### AI-Powered Social Media Intelligence
- **Real-Time Monitoring** - Track Twitter/X, Facebook, Instagram, Reddit, and YouTube
- **NLP Analysis** - Sentiment analysis and panic level detection
- **Trend Detection** - Identify emerging hazards from social conversations
- **Named Entity Recognition** - Extract locations, dates, and event names
- **Credibility Scoring** - Rate source reliability and information accuracy

### Official Dashboard
- **Interactive GIS Map** - Visualize reports and hotspots with clustering
- **Real-Time Updates** - WebSocket-powered live data streaming
- **Report Verification** - Admin workflow for validating citizen reports
- **Analytics Dashboard** - Trend analysis and hotspot identification
- **Export Capabilities** - Generate reports in PDF, CSV, and KML formats

### External Data Integration
- **Ocean Data APIs** - Real-time wave height, current, and temperature data
- **Weather Integration** - OpenWeather API for meteorological conditions
- **Tsunami Alerts** - Integration with warning systems
- **Storm Glass API** - Marine weather forecasting

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React Frontend (Vite + TailwindCSS)                            │
│  - Citizen Reporting Interface                                  │
│  - Admin Dashboard                                              │
│  - Interactive Map (Leaflet)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI Backend                                                │
│  - REST API Endpoints                                           │
│  - WebSocket Real-Time Streaming                                │
│  - JWT Authentication                                           │
│  - Rate Limiting & CORS                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                   MACHINE LEARNING LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  ML Service (FastAPI)                                           │
│  - Text Classification (BERT-based)                             │
│  - Image Classification (ResNet/EfficientNet)                   │
│  - Sentiment Analysis                                           │
│  - Named Entity Recognition                                     │
│  - Trend Analysis & Hotspot Detection                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                   DATA COLLECTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Social Media Collectors                                        │
│  - Twitter/X API Integration                                    │
│  - Facebook Graph API                                           │
│  - Instagram API                                                │
│  - Reddit PRAW                                                  │
│  - YouTube Data API                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                            │
│  - User Management                                              │
│  - Report Storage                                               │
│  - Social Media Posts                                           │
│  - Analytics & Metrics                                          │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
tat-sahayk/
├── backend/                      # FastAPI Backend Service
│   ├── app/
│   │   ├── api/                 # API Routes
│   │   │   └── v1/endpoints/
│   │   │       ├── auth.py      # Authentication endpoints
│   │   │       ├── media.py     # Media upload handling
│   │   │       ├── reports.py   # Report CRUD operations
│   │   │       └── social.py    # Social media endpoints
│   │   ├── core/                # Core functionality
│   │   │   ├── config.py        # Configuration management
│   │   │   └── security.py      # JWT & password hashing
│   │   ├── crud/                # Database operations
│   │   ├── db/                  # Database setup
│   │   ├── models/              # SQLAlchemy models
│   │   └── schemas/             # Pydantic schemas
│   └── requirements.txt
│
├── frontend/                     # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Main layout wrapper
│   │   │   ├── Navbar.jsx       # Navigation bar
│   │   │   └── SideBar.jsx      # Admin sidebar
│   │   ├── pages/
│   │   │   ├── HomePage.jsx     # Landing page
│   │   │   ├── LoginPage.jsx    # Authentication
│   │   │   ├── MapPage.jsx      # Interactive GIS map
│   │   │   └── ReportPage.jsx   # Report submission
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # API utilities
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── ml-service/                   # Machine Learning Service
│   ├── config/                  # ML Configuration
│   ├── models/                  # Trained Models
│   │   └── text_classifier/     # BERT-based classifier
│   ├── src/
│   │   ├── analytics/           # Analytics Engines
│   │   │   ├── credibility_scorer.py
│   │   │   ├── engagement_tracker.py
│   │   │   ├── geospatial_analysis.py
│   │   │   ├── hotspot_generator.py
│   │   │   └── trend_analyzer.py
│   │   ├── data_collection/     # Social Media Scrapers
│   │   │   ├── twitter_collector.py
│   │   │   ├── facebook_collector.py
│   │   │   ├── instagram_collector.py
│   │   │   ├── reddit_collector.py
│   │   │   └── youtube_collector.py
│   │   ├── external/            # External APIs
│   │   │   ├── ocean_data_client.py
│   │   │   ├── openweather_client.py
│   │   │   └── tsunami_alerts.py
│   │   ├── inference/           # ML Inference
│   │   ├── models/              # Model Definitions
│   │   ├── preprocessing/       # Data Processing
│   │   └── training/            # Model Training
│   ├── scripts/                 # Utility Scripts
│   └── tests/                   # Test Suite
│
└── docker-compose.yml           # Multi-container orchestration
```

## Quick Start

### Prerequisites

- **Docker** & **Docker Compose** (recommended)
- **Python 3.8+** (for local development)
- **Node.js 16+** & **npm** (for frontend)
- **PostgreSQL 13+** (if running without Docker)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/aadesh006/tat-sahayk.git
cd tat-sahayk

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Services will be available at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- ML Service: http://localhost:8001
- API Documentation: http://localhost:8000/docs

### Option 2: Local Development

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
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env

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

# Set environment variables
cp .env.example .env

# Start ML service
uvicorn src.api.routes.main:app --reload --port 8001
```

## Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/tatsahayk

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:5173

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

#### ML Service (.env)
```env
# API Keys
TWITTER_API_KEY=your_twitter_api_key
FACEBOOK_ACCESS_TOKEN=your_facebook_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
REDDIT_CLIENT_ID=your_reddit_client_id
YOUTUBE_API_KEY=your_youtube_api_key

# Weather APIs
OPENWEATHER_API_KEY=your_openweather_key
STORMGLASS_API_KEY=your_stormglass_key

# Model Configuration
MODEL_DIR=./models
DATA_DIR=./data
```

## Database Schema

### Core Tables

**users**
- `id` (UUID, PK)
- `email` (String, Unique)
- `hashed_password` (String)
- `full_name` (String)
- `role` (Enum: citizen, official, admin)
- `is_active` (Boolean)
- `created_at` (DateTime)

**reports**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `hazard_type` (Enum: tsunami, storm_surge, high_waves, etc.)
- `description` (Text)
- `latitude` (Float)
- `longitude` (Float)
- `severity` (Enum: low, medium, high, critical)
- `status` (Enum: pending, verified, investigating, resolved)
- `has_media` (Boolean)
- `created_at` (DateTime)

**social_posts**
- `id` (UUID, PK)
- `platform` (Enum: twitter, facebook, instagram, reddit, youtube)
- `content` (Text)
- `author_username` (String)
- `is_hazard` (Boolean)
- `hazard_type` (String, nullable)
- `sentiment` (Enum: positive, neutral, negative)
- `panic_level` (Enum: low, medium, high)
- `credibility_score` (Float)
- `posted_at` (DateTime)

## API Documentation

### Authentication

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe"
}
```

### Reports

```http
GET /api/v1/reports?hazard_type=tsunami&status=verified
Authorization: Bearer <token>
```

```http
POST /api/v1/reports
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "hazard_type": "tsunami",
  "description": "Large waves observed",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "severity": "high",
  "media": [<files>]
}
```

### ML Inference

```http
POST /ml/predict/text
Content-Type: application/json

{
  "text": "Tsunami warning issued for coastal areas",
  "include_sentiment": true
}
```

## Machine Learning Models

### Text Classification
- **Model**: DistilBERT fine-tuned classifier
- **Task**: Hazard detection from text
- **Accuracy**: ~92% on validation set

### Image Classification
- **Model**: EfficientNet-B3
- **Task**: Hazard detection from images
- **Accuracy**: ~89% on validation set

### Sentiment Analysis
- **Model**: RoBERTa-base fine-tuned
- **Output**: Sentiment + Panic level (0-1)

## Testing

```bash
# Backend tests
cd backend
pytest --cov=app

# ML service tests
cd ml-service
pytest tests/

# Frontend tests
cd frontend
npm test
```

## Deployment

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

## Author

**Aadesh Chaudhari**  
GitHub: [@aadesh006](https://github.com/aadesh006)

**Hardik Gupta**  
GitHub: [@Hardikgupta1709](https://github.com/Hardikgupta1709)

**Priyal Khandal**  
GitHub: [@Priyal-2905](https://github.com/Priyal-2905)

## Acknowledgments

- **INCOIS** - Indian National Centre for Ocean Information Services
- **Open Source Community** - For amazing tools and libraries

---
⭐ **Star this repository** if you find it helpful!