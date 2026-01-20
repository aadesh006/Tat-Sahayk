# Ocean Hazard Reporting Platform - Technical Architecture & Production Guide

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Component Details](#component-details)
4. [Database Design](#database-design)
5. [API Specifications](#api-specifications)
6. [Security Architecture](#security-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Deployment Strategy](#deployment-strategy)
9. [Monitoring & Observability](#monitoring--observability)
---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  Mobile App (iOS/Android)  │  Web Dashboard  │  Admin Panel     │
│  React Native/Flutter      │  React.js       │  React.js        │
└──────────────┬─────────────┴────────┬────────┴──────────────────┘
               │                      │
               │  HTTPS/WSS          │
               ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                   │
│                    (AWS ALB / NGINX)                             │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Authentication   │  Report API    │  Social Media  │  Analytics│
│  Service          │  Service       │  Service       │  Service  │
│  (Node.js)        │  (Node.js)     │  (Python)      │  (Python) │
└────┬──────────────┴────┬───────────┴────┬───────────┴────┬──────┘
     │                   │                │                │
     ▼                   ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                    │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL    │  Redis     │  MongoDB      │  Elasticsearch   │
│  (Primary DB)  │  (Cache)   │  (Social      │  (Search)        │
│  + PostGIS     │            │   Media Data) │                  │
└────────────────┴────────────┴───────────────┴──────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage & Processing                          │
├─────────────────────────────────────────────────────────────────┤
│  AWS S3/GCS    │  Apache Kafka │  ML Model      │  Message      │
│  (Media Files) │  (Streaming)  │  Server        │  Queue        │
│                │               │  (TensorFlow)  │  (RabbitMQ)   │
└────────────────┴───────────────┴────────────────┴───────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Integrations                         │
├─────────────────────────────────────────────────────────────────┤
│  Twitter API   │  Facebook API │  YouTube API  │  INCOIS APIs   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Stack

#### Web Dashboard
```yaml
Framework: React.js with Next.js (SSR/SSG)
State Management: Redux Toolkit / React Query
UI Library: Material-UI or Ant Design
Maps: Leaflet.js or Mapbox GL JS
Charts: Recharts or Chart.js
Real-time: Socket.io-client
Forms: React Hook Form + Yup validation
Styling: Tailwind CSS or Styled Components
Build Tool: Vite or Next.js built-in
Testing: Jest + React Testing Library
```

### Backend Stack

#### API Server
```yaml
Language: Node.js (TypeScript) or Python
Framework: 
  - Node.js: Express.js or NestJS (recommended for structure)
  - Python: FastAPI or Django REST Framework
Authentication: JWT (jsonwebtoken) + OAuth 2.0
Database ORM: 
  - Node.js: Prisma or TypeORM
  - Python: SQLAlchemy or Django ORM
Validation: Joi / Zod (Node.js) or Pydantic (Python)
API Documentation: Swagger/OpenAPI
File Upload: Multer (Node.js) or FastAPI UploadFile
Geospatial: PostGIS queries
Task Queue: Bull (Node.js) or Celery (Python)
```

#### Database & Storage
```yaml
Primary Database: PostgreSQL 14+ with PostGIS extension
Cache: Redis 7+
Search Engine: Elasticsearch 8+
Document Store: MongoDB (for social media data)
Object Storage: AWS S3 or Google Cloud Storage
CDN: CloudFront or Cloudflare
```

### AI/ML Stack

```yaml
Language: Python 3.10+
NLP Libraries:
  - Transformers (Hugging Face)
  - spaCy (for NER and text processing)
  - NLTK (basic preprocessing)
ML Frameworks:
  - PyTorch or TensorFlow
  - scikit-learn (classical ML)
  - XGBoost (for classification)
Computer Vision: OpenCV, PIL, TensorFlow/PyTorch
Model Serving: FastAPI + Uvicorn or TensorFlow Serving
Social Media APIs:
  - Tweepy (Twitter)
  - facebook-sdk
  - google-api-python-client (YouTube)
Data Processing:
  - Pandas, NumPy
  - Apache Spark (for large-scale processing)
Streaming: Apache Kafka or AWS Kinesis
MLOps: MLflow for experiment tracking and model registry
```

### DevOps & Infrastructure

```yaml
Containerization: Docker + Docker Compose
Orchestration: Kubernetes (EKS/GKE) or AWS ECS
CI/CD: GitHub Actions or GitLab CI
Infrastructure as Code: Terraform or AWS CloudFormation
Monitoring: Prometheus + Grafana
Logging: ELK Stack (Elasticsearch, Logstash, Kibana)
APM: New Relic or Datadog
Version Control: Git + GitHub/GitLab
Secret Management: AWS Secrets Manager or HashiCorp Vault
```

---

## Component Details

### 1. Mobile Application Architecture

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── Auth/
│   ├── ReportSubmission/
│   ├── ReportHistory/
│   └── Settings/
├── navigation/         # Navigation configuration
├── services/          # API services
│   ├── api.js
│   ├── location.js
│   ├── storage.js
│   └── sync.js
├── store/            # Redux store
│   ├── slices/
│   └── store.js
├── utils/            # Utility functions
├── config/           # Configuration files
└── App.js
```

**Key Features:**
- Offline-first architecture with background sync
- Automatic retry mechanism for failed uploads
- Image compression before upload
- GPS coordinate capture with accuracy metadata
- Multi-step form with validation
- Local SQLite database for offline reports

### 2. Web Dashboard Architecture

```
src/
├── components/
│   ├── common/        # Shared components
│   ├── Map/          # Map components
│   ├── Dashboard/    # Dashboard widgets
│   └── Reports/      # Report management
├── pages/
│   ├── index.js      # Home/Dashboard
│   ├── reports.js    # Reports list
│   ├── map.js        # Map view
│   ├── analytics.js  # Analytics
│   └── admin.js      # Admin panel
├── services/
│   ├── api/          # API clients
│   └── websocket/    # WebSocket handlers
├── store/            # State management
├── hooks/            # Custom React hooks
├── utils/
└── styles/
```

**Key Features:**
- Real-time updates via WebSocket
- Role-based component rendering
- Dynamic map with clustering
- Export to CSV/PDF functionality
- Responsive design (mobile-friendly)
- Advanced filtering and search

### 3. Backend API Architecture

```
src/
├── controllers/       # Request handlers
│   ├── auth.controller.js
│   ├── report.controller.js
│   ├── user.controller.js
│   └── analytics.controller.js
├── services/         # Business logic
│   ├── auth.service.js
│   ├── report.service.js
│   ├── notification.service.js
│   └── geospatial.service.js
├── models/           # Database models
│   ├── User.js
│   ├── Report.js
│   ├── Media.js
│   └── SocialPost.js
├── routes/           # API routes
├── middleware/       # Custom middleware
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
├── config/           # Configuration
│   ├── database.js
│   ├── redis.js
│   └── aws.js
├── utils/
└── server.js
```

**API Endpoints:**

```
Authentication:
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

Reports:
GET    /api/v1/reports              # List reports with filters
POST   /api/v1/reports              # Create report
GET    /api/v1/reports/:id          # Get report details
PUT    /api/v1/reports/:id          # Update report
DELETE /api/v1/reports/:id          # Delete report
PATCH  /api/v1/reports/:id/verify   # Verify report (admin)

Media:
POST   /api/v1/media/upload         # Upload image/video
GET    /api/v1/media/:id            # Get media file

Social Media:
GET    /api/v1/social/posts         # Get social media posts
GET    /api/v1/social/trends        # Get trending topics
GET    /api/v1/social/sentiment     # Sentiment analysis

Analytics:
GET    /api/v1/analytics/hotspots   # Get hotspot data
GET    /api/v1/analytics/summary    # Dashboard summary
GET    /api/v1/analytics/trends     # Time-series trends

WebSocket Events:
new_report                          # New report submitted
report_verified                     # Report verified by admin
hotspot_alert                       # New hotspot detected
```

### 4. AI/ML Service Architecture

```
ml-service/
├── models/
│   ├── text_classifier/     # Hazard text classifier
│   ├── image_classifier/    # Hazard image classifier
│   ├── sentiment_analyzer/  # Sentiment analysis
│   └── ner_model/          # Named Entity Recognition
├── services/
│   ├── social_monitor.py   # Social media monitoring
│   ├── text_processor.py   # NLP processing
│   ├── hotspot_generator.py # Hotspot algorithm
│   └── model_server.py     # Model serving API
├── pipelines/
│   ├── data_collection.py  # Social media data collection
│   ├── preprocessing.py    # Data preprocessing
│   └── training.py         # Model training
├── utils/
├── config/
└── main.py
```

**ML Models Required:**

1. **Text Classification Model**
   - Input: Social media text / report description
   - Output: Hazard type (tsunami, storm surge, high waves, etc.)
   - Architecture: BERT-based classifier
   - Training data: Labeled historical reports + social media posts

2. **Image Classification Model**
   - Input: User-uploaded images
   - Output: Hazard presence and type
   - Architecture: ResNet or EfficientNet
   - Training data: Labeled images of ocean hazards

3. **Sentiment Analysis**
   - Input: Social media text
   - Output: Sentiment score (panic level, urgency)
   - Architecture: Fine-tuned transformer model

4. **Named Entity Recognition**
   - Input: Text from reports/social media
   - Output: Locations, dates, event names
   - Architecture: spaCy or BERT-NER

---

## Database Design

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    hazard_type VARCHAR(100) NOT NULL,
    description TEXT,
    severity VARCHAR(20),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    credibility_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_reports_location ON reports USING GIST(location);

-- Media table
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Social media posts table (MongoDB alternative in PostgreSQL)
CREATE TABLE social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    post_id VARCHAR(255) UNIQUE NOT NULL,
    author VARCHAR(255),
    content TEXT,
    location GEOGRAPHY(POINT, 4326),
    hashtags TEXT[],
    mentions TEXT[],
    engagement_score INTEGER,
    sentiment_score FLOAT,
    hazard_relevance FLOAT,
    detected_hazards TEXT[],
    posted_at TIMESTAMP,
    collected_at TIMESTAMP DEFAULT NOW()
);

-- Hotspots table
CREATE TABLE hotspots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters INTEGER,
    hazard_type VARCHAR(100),
    severity VARCHAR(20),
    report_count INTEGER,
    threat_level FLOAT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API keys table (for INCOIS integration)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    organization VARCHAR(255),
    permissions TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);
```

### Redis Data Structures

```
# User sessions
session:{user_id} -> {token, expires_at, user_data}

# Cache API responses
cache:reports:list:{filters_hash} -> [report_data]
cache:hotspots:{timestamp} -> [hotspot_data]

# Rate limiting
ratelimit:{ip}:{endpoint} -> counter (expires in 1 hour)

# Real-time metrics
metrics:reports:count:{date} -> counter
metrics:active_users -> set of user_ids

# Task queue (if using Bull)
queue:report-processing -> [job_data]
queue:social-media-fetch -> [job_data]
```

### MongoDB Collections (for social media data)

```javascript
// social_posts collection
{
  _id: ObjectId,
  platform: "twitter",
  post_id: "1234567890",
  author: {
    id: "user123",
    username: "johndoe",
    followers: 1000
  },
  content: "Huge waves hitting the coast...",
  location: {
    type: "Point",
    coordinates: [lon, lat]
  },
  metadata: {
    hashtags: ["#tsunami", "#alert"],
    mentions: ["@incois"],
    urls: []
  },
  engagement: {
    likes: 100,
    shares: 50,
    comments: 20
  },
  ml_analysis: {
    hazard_detected: true,
    hazard_type: "high_waves",
    confidence: 0.85,
    sentiment: "panic",
    urgency_level: "high"
  },
  posted_at: ISODate,
  collected_at: ISODate
}
```

---

## API Specifications

### Authentication Flow

```
1. User Registration
   POST /api/v1/auth/register
   Body: { email, password, phone, full_name }
   Response: { user, token, refresh_token }

2. Login
   POST /api/v1/auth/login
   Body: { email, password }
   Response: { user, token, refresh_token }

3. Token Refresh
   POST /api/v1/auth/refresh
   Body: { refresh_token }
   Response: { token, refresh_token }

4. Protected Request
   Headers: { Authorization: "Bearer {token}" }
```

### Report Submission Flow

```
1. Upload Media (Optional)
   POST /api/v1/media/upload
   Headers: { Authorization, Content-Type: multipart/form-data }
   Body: FormData with image/video
   Response: { media_id, url }

2. Submit Report
   POST /api/v1/reports
   Headers: { Authorization }
   Body: {
     hazard_type: "tsunami",
     description: "Water receding rapidly",
     severity: "high",
     location: { lat: 12.9716, lon: 77.5946 },
     media_ids: ["media_id_1", "media_id_2"]
   }
   Response: { report_id, status: "pending" }

3. Background Processing
   - Geocode address from coordinates
   - Analyze images with ML model
   - Calculate credibility score
   - Trigger hotspot recalculation
   - Send notifications to nearby users
```

### WebSocket Events

```javascript
// Client subscribes to events
socket.on('connect', () => {
  socket.emit('subscribe', { 
    type: 'reports',
    filters: { location: { lat, lon, radius: 50000 } }
  });
});

// Server pushes updates
socket.on('new_report', (data) => {
  // Display new report on map
});

socket.on('hotspot_alert', (data) => {
  // Show alert notification
});
```

---

## Security Architecture

### Security Layers

1. **Network Security**
   - HTTPS/TLS 1.3 for all communications
   - API Gateway with WAF (Web Application Firewall)
   - DDoS protection (Cloudflare or AWS Shield)
   - Rate limiting at API Gateway level

2. **Authentication & Authorization**
   - JWT with short expiration (15 minutes)
   - Refresh tokens with longer expiration (7 days)
   - Role-based access control (RBAC)
   - Multi-factor authentication (optional)
   - Password requirements: min 8 chars, complexity

3. **Data Security**
   - Database encryption at rest (AES-256)
   - Encryption in transit (TLS)
   - Sensitive data hashing (bcrypt for passwords)
   - API key encryption in database
   - Media files with signed URLs (expire in 1 hour)

4. **Application Security**
   - Input validation on all endpoints
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize user input)
   - CSRF protection for web app
   - Content Security Policy (CSP) headers
   - CORS configuration (whitelist domains)

5. **API Security**
   - API key authentication for INCOIS integration
   - Rate limiting: 100 req/min per user, 10 req/min per IP
   - Request size limits (10MB for media uploads)
   - API versioning for backward compatibility
   - Audit logging for all write operations

6. **Privacy & Compliance**
   - GDPR-compliant data handling
   - User consent for location tracking
   - Data retention policies (delete after 2 years)
   - Right to erasure (delete user data on request)
   - Anonymization of old reports

---

## Scalability & Performance

### Scaling Strategy

#### Horizontal Scaling
```
Application Servers:
  - Containerized microservices
  - Auto-scaling based on CPU/memory (2-20 instances)
  - Load balancer distributes traffic
  - Stateless design (session in Redis)

Database Scaling:
  - Read replicas for PostgreSQL (3 replicas)
  - Write to primary, read from replicas
  - Connection pooling (PgBouncer)
  - Partition large tables by date

Cache Scaling:
  - Redis Cluster for high availability
  - Cache-aside pattern
  - TTL for all cached data (5-60 minutes)
```

#### Vertical Scaling
```
Database:
  - Start: db.t3.medium (2 vCPU, 4GB RAM)
  - Scale to: db.r5.xlarge (4 vCPU, 32GB RAM)

Application:
  - Start: t3.medium (2 vCPU, 4GB RAM)
  - Scale to: c5.2xlarge (8 vCPU, 16GB RAM)
```

### Performance Optimization

1. **Database Optimization**
   ```sql
   -- Create indexes on frequently queried columns
   CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
   CREATE INDEX idx_reports_status ON reports(status);
   CREATE INDEX idx_reports_user_id ON reports(user_id);
   
   -- Spatial index for geospatial queries
   CREATE INDEX idx_reports_location ON reports USING GIST(location);
   
   -- Composite index for filtered queries
   CREATE INDEX idx_reports_status_created ON reports(status, created_at DESC);
   ```

2. **API Optimization**
   - Response compression (gzip)
   - Pagination (50 items per page)
   - Field filtering (return only requested fields)
   - ETags for caching
   - GraphQL for complex queries (reduces over-fetching)

3. **Frontend Optimization**
   - Code splitting and lazy loading
   - Image optimization (WebP format, lazy loading)
   - CDN for static assets
   - Service Worker for offline caching
   - Debouncing for search inputs

4. **Caching Strategy**
   ```
   Level 1: Browser cache (static assets)
   Level 2: CDN cache (images, videos)
   Level 3: Redis cache (API responses)
   Level 4: Database query cache
   ```

### Performance Targets

```yaml
API Response Time:
  - 95th percentile: < 200ms
  - 99th percentile: < 500ms

Database Queries:
  - Simple queries: < 10ms
  - Complex queries: < 100ms
  - Geospatial queries: < 50ms

Mobile App:
  - App launch: < 2 seconds
  - Screen transitions: < 300ms
  - Report submission: < 3 seconds

Web Dashboard:
  - Initial load: < 3 seconds
  - Map rendering: < 1 second
  - Real-time updates: < 100ms latency
```

---

## Deployment Strategy

### Development Environment

```yaml
Local Development:
  - Docker Compose for all services
  - Hot reload for development
  - Mock social media APIs
  - Local PostgreSQL + Redis

Development Server:
  - Automatic deployment on push to dev branch
  - Test data seeding
  - Debug logging enabled
```

### Staging Environment

```yaml
Infrastructure:
  - Mirror of production
  - Smaller instance sizes
  - Test with production-like data
  - Integration testing

Purpose:
  - QA testing
  - Performance testing
  - Security testing
  - User acceptance testing (UAT)
```

### Production Environment

#### AWS Architecture (Recommended)

```yaml
Compute:
  - ECS Fargate or EKS for containers
  - Application Load Balancer (ALB)
  - Auto Scaling Groups

Database:
  - RDS PostgreSQL Multi-AZ
  - ElastiCache for Redis
  - DocumentDB for MongoDB (optional)

Storage:
  - S3 for media files
  - CloudFront CDN

Networking:
  - VPC with public and private subnets
  - NAT Gateway for outbound traffic
  - Route 53 for DNS

Security:
  - AWS WAF
  - AWS Shield (DDoS protection)
  - Secrets Manager
  - CloudTrail for audit logs

Monitoring:
  - CloudWatch for metrics and logs
  - X-Ray for distributed tracing
  - SNS for alerts
```

#### Deployment Pipeline

```yaml
1. Code Commit (GitHub)
   ↓
2. CI Pipeline (GitHub Actions)
   - Run tests (unit, integration)
   - Code quality checks
   - Security scanning
   - Build Docker images
   ↓
3. Push to Container Registry (ECR)
   ↓
4. Deploy to Staging
   - Run smoke tests
   - Performance tests
   ↓
5. Manual Approval
   ↓
6. Deploy to Production
   - Blue-green deployment
   - Health checks
   - Rollback if needed
```

### Docker Configuration

**docker-compose.yml**
```yaml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@postgres:5432/oceandb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1

  postgres:
    image: postgis/postgis:14-3.2
    environment:
      - POSTGRES_DB=oceandb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
  redis_data:
```

### Kubernetes Deployment (For Scale)

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ocean-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ocean-api
  template:
    metadata:
      labels:
        app: ocean-api
    spec:
      containers:
      - name: api
        image: your-registry/ocean-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## Monitoring & Observability

### Monitoring Stack

```yaml
Metrics:
  - Prometheus for metrics collection
  - Grafana for visualization
  - Custom dashboards for:
    * API performance
    * Database performance
    * User activity
    * Report submission rates
    * ML model accuracy

Logging:
  - ELK Stack (Elasticsearch, Logstash, Kibana)
  - Structured logging (JSON format)
  - Log levels: ERROR, WARN, INFO, DEBUG
  - Centralized logging from all services

APM (Application Performance Monitoring):
  - New Relic or Datadog
  - Transaction tracing
  - Error tracking
  - Real user monitoring (RUM)

Alerting:
  - PagerDuty for on-call rotation
  - Slack for team notifications
  - Email for non-critical alerts
```

### Key Metrics to Monitor

```yaml
Application Metrics:
  - Request rate (requests per minute)
  - Error rate (% of failed requests)
  - Response time (p50, p95, p99)
  - Concurrent users
  - API endpoint usage

Business Metrics:
  - Reports submitted per hour
  - Active users (daily/monthly)
  - Report verification rate
  - Hotspot detection accuracy
  - Social media posts analyzed

Infrastructure Metrics:
  - CPU utilization
  - Memory usage
  - Disk I/O
  - Network throughput
  - Database connections

ML Metrics:
  - Model inference time
  - Model accuracy
  - False positive rate
  - Data processing lag
```

### Alerts Configuration

```yaml
Critical Alerts (Page on-call):
  - API error rate > 5%
  - Database CPU > 90%
  - Service down
  - Critical security event

Warning Alerts (Slack notification):
  - API response time > 1s
  - Database connections > 80%
  - Disk usage > 85%
  - Unusual traffic patterns

Info Alerts (Email):
  - Deployment completed
  - Scheduled maintenance
  - Daily summary reports
```

---

## Testing Strategy

### Testing Pyramid

```yaml
Unit Tests (70%):
  - Test individual functions
  - Mock external dependencies
  - Fast execution
  - Tools: Jest, PyTest

Integration Tests (20%):
  - Test API endpoints
  - Test database operations
  - Test service interactions
  - Tools: Supertest, Pytest

E2E Tests (10%):
  - Test user flows
  - Test mobile app
  - Test web dashboard
  - Tools: Cypress, Detox

Performance Tests:
  - Load testing with k6 or JMeter
  - Database query performance
  - API response times
  - Concurrent user simulation

Security Tests:
  - OWASP ZAP for vulnerability scanning
  - Penetration testing
  - Dependency vulnerability checks
  - API security testing

```

---

## Additional Considerations

### Accessibility

```yaml
Mobile App:
  - Screen reader support
  - High contrast mode
  - Font size adjustment
  - Voice input for reports

Web Dashboard:
  - WCAG 2.1 AA compliance
  - Keyboard navigation
  - ARIA labels
  - Color contrast ratios
```

### Disaster Recovery

```yaml
Backup Strategy:
  - Daily automated backups of database
  - 30-day retention policy
  - Geo-redundant storage
  - Point-in-time recovery

Recovery Time Objective (RTO): 4 hours
Recovery Point Objective (RPO): 1 hour

Disaster Recovery Plan:
  - Multi-region deployment (optional)
  - Database replication
  - Regular disaster recovery drills
  - Documented recovery procedures
```

### Compliance & Privacy

```yaml
Data Protection:
  - GDPR compliance (if applicable)
  - User consent management
  - Data anonymization for research
  - Right to be forgotten

Legal Requirements:
  - Terms of Service
  - Privacy Policy
  - Cookie Policy
  - Data Processing Agreement
```

---

