# Tat-Sahayk - Design Document

## System Architecture

### High-Level Architecture

Tat-Sahayk follows a microservices architecture with three main components:

```
┌─────────────────┐
│   Frontend      │ (React + Vite)
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend API   │ (FastAPI)
│   (Port 8000)   │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│PostGIS │ │Redis │ │Cloudry │ │ML Service│
│  DB    │ │Cache │ │Storage │ │(Port 8001│
└────────┘ └──────┘ └────────┘ └──────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 19.2
- **Build Tool**: Vite 7.2
- **Routing**: React Router 7.13
- **State Management**: Zustand 5.0
- **HTTP Client**: Axios 1.13
- **UI Framework**: TailwindCSS 3.4 + DaisyUI 4.12
- **Maps**: Leaflet 1.9 + React-Leaflet 5.0
- **Icons**: Lucide React 0.563
- **Notifications**: React Hot Toast 2.6
- **Data Fetching**: TanStack Query 5.90

#### Backend
- **Framework**: FastAPI 0.109
- **Server**: Uvicorn 0.27
- **ORM**: SQLAlchemy 2.0
- **Database Driver**: psycopg2-binary 2.9
- **Migrations**: Alembic 1.13
- **Validation**: Pydantic 2.5
- **Authentication**: python-jose (JWT)
- **Password Hashing**: passlib + bcrypt
- **Geospatial**: GeoAlchemy2 0.14
- **HTTP Client**: httpx 0.26
- **Scheduler**: APScheduler

#### ML Service
- **Framework**: FastAPI 0.104
- **ML Framework**: PyTorch 2.1
- **NLP**: Transformers 4.38 (HuggingFace)
- **Text Processing**: spaCy 3.7, NLTK 3.8, TextBlob 0.17
- **Embeddings**: Sentence-Transformers 2.5
- **Data Processing**: Pandas 2.1, NumPy 1.24
- **ML Algorithms**: scikit-learn 1.3
- **Geospatial**: geopy 2.4
- **Visualization**: Matplotlib 3.8, Seaborn 0.13, Plotly 5.18

#### Infrastructure
- **Database**: PostgreSQL 14 + PostGIS 3.2
- **Cache**: Redis 7
- **Containerization**: Docker + Docker Compose
- **Cloud Storage**: Cloudinary

## Component Design

### 1. Frontend Architecture

#### Directory Structure
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   └── SideBar.jsx
│   ├── pages/          # Route-level components
│   │   ├── HomePage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── MapPage.jsx
│   │   └── ReportPage.jsx
│   ├── hooks/          # Custom React hooks
│   │   └── useAuthUser.js
│   ├── lib/            # Utilities and configurations
│   │   ├── api.js      # API client functions
│   │   └── axios.js    # Axios instance
│   ├── services/       # Business logic
│   │   └── storage.js  # Local storage utilities
│   ├── App.jsx         # Root component with routing
│   ├── main.jsx        # Application entry point
│   └── index.css       # Global styles
├── public/             # Static assets
└── vite.config.js      # Build configuration
```

#### Component Hierarchy
```
App
├── LoginPage (unauthenticated)
└── Layout (authenticated)
    ├── Navbar
    ├── SideBar
    └── Page Content
        ├── HomePage (reports + news feed)
        ├── MapPage (geospatial visualization)
        └── ReportPage (report management)
```

#### State Management Strategy
- **Authentication State**: Zustand store for user session
- **Server State**: TanStack Query for API data caching
- **Local State**: React hooks (useState, useReducer)
- **Form State**: Controlled components

#### Routing Design
- `/` - Home page (reports feed + news)
- `/login` - Authentication page
- `/map` - Interactive hazard map
- `/reports` - Report management dashboard
- Protected routes redirect to `/login` if unauthenticated

### 2. Backend Architecture

#### Directory Structure
```
backend/
├── app/
│   ├── api/
│   │   ├── api.py              # API router aggregation
│   │   ├── deps.py             # Dependency injection
│   │   └── v1/
│   │       └── endpoints/
│   │           ├── auth.py     # Authentication endpoints
│   │           ├── reports.py  # Report CRUD
│   │           ├── social.py   # Social feed
│   │           └── media.py    # File uploads
│   ├── core/
│   │   ├── config.py           # Application settings
│   │   └── security.py         # Auth utilities
│   ├── crud/
│   │   ├── user.py             # User operations
│   │   └── report.py           # Report operations
│   ├── db/
│   │   ├── base.py             # Base model imports
│   │   └── session.py          # Database connection
│   ├── models/
│   │   ├── user.py             # User model
│   │   ├── report.py           # Report model
│   │   ├── social.py           # SocialPost model
│   │   └── media.py            # Media model
│   ├── schemas/
│   │   ├── user.py             # User Pydantic schemas
│   │   └── report.py           # Report Pydantic schemas
│   └── main.py                 # Application entry point
├── scripts/
│   └── harvest_social.py       # Social media scraper
├── uploads/                    # Local file storage (dev)
└── requirements.txt
```

#### API Design

##### Authentication Endpoints
```
POST /api/v1/auth/signup
  Request: { email, password, full_name }
  Response: { id, email, full_name, role, created_at }

POST /api/v1/auth/login
  Request: { username (email), password }
  Response: { access_token, token_type }
```

##### Report Endpoints
```
POST /api/v1/reports/
  Headers: Authorization: Bearer <token>
  Request: { hazard_type, description, severity, latitude, longitude }
  Response: Report object

GET /api/v1/reports/
  Query: ?status=pending&severity=high&skip=0&limit=100
  Response: [Report objects]

GET /api/v1/reports/stats
  Response: { total_reports, pending_review, verified_hazards, critical_alerts }

PATCH /api/v1/reports/{id}/verify
  Request: { status: "verified" | "false" | "pending" }
  Response: Updated Report object
```

##### Social Media Endpoints
```
GET /api/v1/social/
  Response: [SocialPost objects] (last 20)
```

##### Media Endpoints
```
POST /api/v1/media/upload
  Request: multipart/form-data with file
  Response: { filename, file_path (Cloudinary URL) }
```

#### Database Schema

##### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    hashed_password VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'citizen',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
```

##### Reports Table
```sql
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    hazard_type VARCHAR NOT NULL,
    description TEXT,
    severity VARCHAR,
    location GEOMETRY(POINT, 4326),
    is_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
CREATE INDEX idx_reports_location ON reports USING GIST(location);
```

##### Media Table
```sql
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    file_path VARCHAR NOT NULL,
    file_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_media_report ON media(report_id);
```

##### Social Posts Table
```sql
CREATE TABLE social_posts (
    id SERIAL PRIMARY KEY,
    source VARCHAR,
    author VARCHAR,
    content TEXT,
    url VARCHAR,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_social_published ON social_posts(published_at);
```

#### Authentication Flow

1. **Registration**:
   - User submits email, password, full_name
   - Backend validates email uniqueness
   - Password hashed with bcrypt
   - User record created with role='citizen'

2. **Login**:
   - User submits email (as username) and password
   - Backend verifies credentials
   - JWT token generated with email as subject
   - Token expires after configured duration (default: 30 minutes)

3. **Protected Routes**:
   - Client includes token in Authorization header
   - Backend validates token signature and expiration
   - User object retrieved from database
   - Request proceeds with current_user dependency

#### Background Tasks

##### Social Media Harvester
- **Scheduler**: APScheduler BackgroundScheduler
- **Frequency**: Every 15 minutes
- **Function**: `harvest()` in `scripts/harvest_social.py`
- **Lifecycle**: Starts on app startup, stops on shutdown
- **Purpose**: Collect disaster-related posts from social media

### 3. ML Service Architecture

#### Directory Structure
```
ml-service/
├── config/
│   ├── settings.py              # Configuration
│   ├── model_config.py          # Model parameters
│   ├── logging_config.py        # Logging setup
│   └── social_media_config.py   # Social API configs
├── src/
│   ├── analytics/
│   │   ├── credibility_scorer.py    # Credibility scoring
│   │   ├── trend_analyzer.py        # Trend detection
│   │   ├── geospatial_analysis.py   # Spatial clustering
│   │   ├── hotspot_generator.py     # Hotspot detection
│   │   └── engagement_tracker.py    # Engagement metrics
│   ├── api/
│   │   ├── routes/              # API endpoints
│   │   ├── models/              # Request/response schemas
│   │   └── dependencies.py      # Shared dependencies
│   └── models/                  # ML model implementations
├── models/
│   └── text_classifier/         # Trained model artifacts
├── data/                        # Training data and outputs
├── scripts/
│   ├── train_all_models.py      # Model training
│   ├── evaluate_models.py       # Model evaluation
│   ├── download_data.py         # Data acquisition
│   └── run_analytics.py         # Analytics pipeline
└── requirements.txt
```

#### ML Models

##### Text Classification Model
- **Base Model**: DistilBERT (distilbert-base-uncased)
- **Task**: Multi-label classification
- **Labels**: Hazard types, sentiment, panic level
- **Max Sequence Length**: 128 tokens
- **Training**: Fine-tuned on disaster-related text
- **Framework**: HuggingFace Transformers + PyTorch

##### Named Entity Recognition
- **Library**: spaCy 3.7
- **Entities**: Locations, dates, times, organizations
- **Purpose**: Extract structured information from text

##### Sentiment Analysis
- **Library**: TextBlob 0.17
- **Output**: Polarity (-1 to 1), Subjectivity (0 to 1)
- **Purpose**: Assess emotional tone of reports

##### Language Detection
- **Library**: langdetect 1.0
- **Purpose**: Identify report language for processing

#### Analytics Components

##### Credibility Scorer
**Algorithm**: Weighted multi-factor scoring

**Factors**:
- Location specificity (15%): Has coordinates, named locations
- Media presence (20%): Has images/videos, media count
- Engagement (15%): Likes, shares, comments, viral potential
- Author reputation (15%): Follower count, verified status
- Text quality (15%): Word count, detail level, grammar
- Consistency (10%): Sentiment-hazard match, urgency alignment
- Other factors (10%): Timestamps, metadata

**Output**:
- Credibility score: 0.0 to 1.0
- Category: high (≥0.7), medium (≥0.5), low (<0.5)

**Implementation**:
```python
class CredibilityScorer:
    def score_report(self, report: pd.Series) -> float:
        score = 0.0
        score += self.score_location(report)
        score += self.score_media(report)
        score += self.score_engagement(report)
        score += self.score_author(report)
        score += self.score_text_quality(report)
        score += self.score_consistency(report)
        return max(0.0, min(1.0, score))
```

##### Trend Analyzer
**Capabilities**:
- Temporal pattern detection (hourly, daily)
- Spike detection (threshold: 2 standard deviations)
- Trend classification (increasing/decreasing/stable)
- Window-based analysis (default: 6 hours)

**Algorithm**:
```python
def calculate_trend(df, window_hours=6):
    recent_rate = count_recent / window_hours
    previous_rate = count_previous / window_hours
    change = (recent_rate - previous_rate) / previous_rate
    
    if change > 0.2: return 'increasing'
    elif change < -0.2: return 'decreasing'
    else: return 'stable'
```

##### Geospatial Analyzer
**Capabilities**:
- Hotspot detection using DBSCAN clustering
- Density mapping with configurable radius
- Distance calculations using Haversine formula
- Geographic clustering of related incidents

**Parameters**:
- Default radius: 10 km
- Minimum reports for hotspot: 3
- Density radius: 20 km

##### Engagement Tracker
**Metrics**:
- Total engagement (likes + shares + comments)
- Engagement rate (engagement / followers)
- Share ratio (shares / total engagement)
- Viral coefficient (shares per view)

#### ML Service API Design

```
POST /api/v1/predict/hazard
  Request: { text, location?, media_urls? }
  Response: { hazard_type, confidence, severity }

POST /api/v1/analyze/credibility
  Request: { report_data }
  Response: { credibility_score, category, breakdown }

POST /api/v1/analyze/trends
  Request: { reports[], time_window }
  Response: { trend, spikes[], patterns }

POST /api/v1/analyze/hotspots
  Request: { reports[], radius_km }
  Response: { hotspots[], density_map }

POST /api/v1/analyze/batch
  Request: { reports[] }
  Response: { analyzed_reports[] }
```

### 4. Data Flow

#### Report Submission Flow
```
1. User fills report form (frontend)
2. Upload media to Cloudinary (if any)
3. POST /api/v1/reports/ with report data + media URLs
4. Backend validates data and auth token
5. Create Report record with PostGIS POINT geometry
6. Create Media records linked to report
7. Return report object to frontend
8. Frontend shows success notification
9. Background: ML service analyzes report (async)
```

#### Report Verification Flow
```
1. Official views reports dashboard
2. GET /api/v1/reports/?status=pending
3. Official reviews report details
4. PATCH /api/v1/reports/{id}/verify with status
5. Backend updates report status and is_verified flag
6. Database transaction committed
7. Frontend refreshes report list
8. Updated report appears in verified section
```

#### Social Media Harvesting Flow
```
1. APScheduler triggers harvest() every 15 minutes
2. Script connects to social media APIs
3. Search for disaster-related keywords
4. Parse and normalize post data
5. Insert new posts into social_posts table
6. Background: ML service analyzes posts
7. Credibility scores calculated
8. High-credibility posts flagged for review
```

#### ML Analysis Pipeline
```
1. New report/post received
2. Text preprocessing (tokenization, cleaning)
3. Named entity extraction (locations, dates)
4. Hazard classification (DistilBERT)
5. Sentiment analysis (TextBlob)
6. Credibility scoring (multi-factor)
7. Geospatial clustering (if location available)
8. Trend analysis (temporal patterns)
9. Results stored in database
10. Alerts generated for high-priority items
```

## Security Design

### Authentication Security
- **Password Storage**: bcrypt hashing with salt
- **Token Security**: JWT with HS256 algorithm
- **Token Expiration**: Configurable (default: 30 minutes)
- **Token Refresh**: Not implemented (future enhancement)

### API Security
- **CORS**: Configured allowed origins
- **Rate Limiting**: Not implemented (future enhancement)
- **Input Validation**: Pydantic schemas
- **SQL Injection**: Prevented by SQLAlchemy ORM
- **XSS Protection**: React auto-escaping

### Data Security
- **Database**: PostgreSQL with authentication
- **Passwords**: Never logged or exposed
- **Media Files**: Cloudinary secure URLs
- **Environment Variables**: .env files (not committed)

### Network Security
- **HTTPS**: Required in production
- **API Keys**: Stored in environment variables
- **Database Connection**: Internal network only
- **Redis**: No authentication (internal only)

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Vite automatic chunking
- **Lazy Loading**: Route-based code splitting
- **Image Optimization**: Cloudinary transformations
- **Caching**: TanStack Query cache
- **Bundle Size**: Tree shaking, minification

### Backend Optimization
- **Database Indexing**: On frequently queried columns
- **Connection Pooling**: SQLAlchemy pool
- **Query Optimization**: Eager loading, select specific columns
- **Caching**: Redis for frequently accessed data
- **Async Operations**: FastAPI async endpoints

### ML Service Optimization
- **Batch Processing**: Process multiple reports together
- **Model Caching**: Load models once at startup
- **GPU Acceleration**: CUDA support for PyTorch
- **Quantization**: Model compression (future)
- **Async Inference**: Non-blocking predictions

### Database Optimization
- **Spatial Indexing**: GIST index on location column
- **Partitioning**: Time-based partitioning (future)
- **Vacuum**: Regular maintenance
- **Query Planning**: EXPLAIN ANALYZE for slow queries

## Deployment Design

### Docker Compose Architecture
```yaml
services:
  postgres:
    image: postgis/postgis:14-3.2
    ports: ["5432:5432"]
    volumes: [postgres_data]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [postgres, redis]
    environment: [DATABASE_URL, REDIS_URL]
    
  ml-service:
    build: ./ml-service
    ports: ["8001:8001"]
    depends_on: [postgres]
    
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

### Environment Configuration
- **Development**: Local Docker Compose
- **Staging**: Cloud deployment with test data
- **Production**: Kubernetes or cloud services

### Scaling Strategy
- **Horizontal Scaling**: Multiple backend/ML service instances
- **Load Balancing**: Nginx or cloud load balancer
- **Database**: Read replicas for queries
- **Caching**: Redis cluster for distributed cache

## Monitoring and Logging

### Application Logging
- **Backend**: Python logging module
- **ML Service**: Structured JSON logs
- **Frontend**: Console errors, Sentry (future)
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL

### Metrics
- **API Metrics**: Request count, latency, errors
- **ML Metrics**: Inference time, accuracy, throughput
- **Database Metrics**: Query time, connection pool
- **System Metrics**: CPU, memory, disk usage

### Alerting
- **Critical Errors**: Immediate notification
- **Performance Degradation**: Threshold alerts
- **ML Model Drift**: Accuracy monitoring
- **System Health**: Uptime checks

## Error Handling

### Frontend Error Handling
- **Network Errors**: Retry with exponential backoff
- **Validation Errors**: Display field-level errors
- **Auth Errors**: Redirect to login
- **Unknown Errors**: Generic error message + log

### Backend Error Handling
- **HTTP Exceptions**: FastAPI HTTPException
- **Database Errors**: Rollback transaction, log error
- **Validation Errors**: Pydantic ValidationError
- **Auth Errors**: 401 Unauthorized response

### ML Service Error Handling
- **Model Loading Errors**: Fail fast on startup
- **Inference Errors**: Return error response, log details
- **Data Errors**: Validate input, return 400 Bad Request
- **Timeout Errors**: Configurable timeout, graceful failure

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Component testing with Jest/Vitest
- **Integration Tests**: API integration tests
- **E2E Tests**: Cypress or Playwright (future)
- **Manual Testing**: Cross-browser testing

### Backend Testing
- **Unit Tests**: pytest for individual functions
- **Integration Tests**: API endpoint tests
- **Database Tests**: Test database with fixtures
- **Load Tests**: Locust or k6 (future)

### ML Service Testing
- **Unit Tests**: pytest for analytics functions
- **Model Tests**: Accuracy, precision, recall metrics
- **Integration Tests**: API endpoint tests
- **Performance Tests**: Inference time benchmarks

## Future Architecture Considerations

### Microservices Evolution
- **Notification Service**: Push notifications, SMS, email
- **Analytics Service**: Separate from ML service
- **Search Service**: Elasticsearch for full-text search
- **Streaming Service**: Kafka for real-time events

### Data Pipeline
- **ETL Pipeline**: Airflow for data processing
- **Data Lake**: S3 for raw data storage
- **Data Warehouse**: BigQuery or Redshift for analytics
- **Real-time Processing**: Kafka Streams or Flink

### Advanced ML
- **Model Registry**: MLflow for model versioning
- **Feature Store**: Feast for feature management
- **AutoML**: Automated model training and selection
- **Federated Learning**: Privacy-preserving ML

### Infrastructure
- **Kubernetes**: Container orchestration
- **Service Mesh**: Istio for microservices
- **API Gateway**: Kong or AWS API Gateway
- **CDN**: CloudFlare for static assets
