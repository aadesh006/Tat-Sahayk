# Tat-Sahayk - Requirements Document

## Project Overview

Tat-Sahayk is a disaster management and hazard reporting platform that combines citizen reporting, social media monitoring, machine learning analytics, and geospatial visualization to provide real-time situational awareness during natural disasters and emergencies.

## System Purpose

The system enables:
- Citizens to report hazards and disasters with location and media evidence
- Officials to verify, monitor, and respond to hazard reports
- Automated collection and analysis of social media posts about disasters
- ML-powered credibility scoring, trend analysis, and hotspot detection
- Real-time geospatial visualization of hazards and affected areas

## Stakeholders

### Primary Users
- **Citizens**: Report hazards, view disaster information, access safety resources
- **Officials/Administrators**: Verify reports, monitor dashboard, coordinate response
- **Emergency Responders**: Access verified hazard data for response planning

### System Administrators
- Manage user accounts and permissions
- Configure ML models and analytics parameters
- Monitor system health and performance

## Functional Requirements

### 1. User Management & Authentication

#### 1.1 User Registration
- Users can sign up with email and password
- User profiles include: email, full name, role (citizen/official/admin)
- Password hashing using bcrypt for security

#### 1.2 Authentication
- JWT-based authentication with configurable token expiration
- OAuth2 password flow for login
- Role-based access control (RBAC)

#### 1.3 User Roles
- **Citizen**: Can create reports, view map, access news feed
- **Official**: Can verify reports, access admin dashboard, view statistics
- **Admin**: Full system access including user management

### 2. Hazard Reporting

#### 2.1 Report Creation
- Citizens can submit hazard reports with:
  - Hazard type (flood, earthquake, fire, etc.)
  - Description (text)
  - Severity level (low, medium, high, critical)
  - Geographic location (latitude/longitude)
  - Media attachments (images/videos)
  - Timestamp (auto-generated)

#### 2.2 Media Upload
- Support for image and video uploads
- Cloud storage integration (Cloudinary)
- Secure HTTPS URLs for media access
- File type validation

#### 2.3 Report Status
- **Pending**: Newly submitted, awaiting verification
- **Verified**: Confirmed by officials as legitimate
- **False**: Marked as false report or spam

### 3. Report Management (Officials)

#### 3.1 Report Dashboard
- View all reports with filtering options:
  - Filter by status (pending/verified/false)
  - Filter by severity (low/medium/high/critical)
  - Sort by date (newest first)
- Pagination support for large datasets

#### 3.2 Report Verification
- Officials can change report status
- Update verification flag (is_verified)
- Add verification notes or comments

#### 3.3 Statistics Dashboard
- Total reports count
- Pending review count
- Verified hazards count
- Critical alerts count
- Real-time updates

### 4. Social Media Monitoring

#### 4.1 Automated Harvesting
- Background scheduler runs every 15 minutes
- Collects posts from social media sources
- Stores: source, author, content, URL, timestamp

#### 4.2 Social Feed Display
- Display recent social media posts (last 20)
- Show source, author, and content
- Link to original posts
- Chronological ordering

### 5. Machine Learning Analytics

#### 5.1 Text Classification
- Hazard type detection from text
- Sentiment analysis (positive/negative/neutral)
- Panic level prediction (low/medium/high/critical)
- Urgency detection
- Named entity recognition (locations, dates, times)

#### 5.2 Credibility Scoring
- Multi-factor credibility assessment:
  - Location specificity (15%)
  - Media presence (20%)
  - Engagement metrics (15%)
  - Author reputation (15%)
  - Text quality (15%)
  - Consistency checks (10%)
  - Other factors (10%)
- Credibility categories: high (≥0.7), medium (≥0.5), low (<0.5)

#### 5.3 Trend Analysis
- Temporal pattern detection
- Spike detection (unusual activity)
- Trend classification (increasing/decreasing/stable)
- Hourly and daily distribution analysis

#### 5.4 Geospatial Analysis
- Hotspot detection using clustering algorithms
- Density mapping of reports
- Radius-based proximity analysis
- Geographic clustering of related incidents

#### 5.5 Engagement Tracking
- Track likes, shares, comments
- Calculate engagement rates
- Identify viral content
- Monitor information spread

### 6. Geospatial Visualization

#### 6.1 Interactive Map
- Display hazards on interactive map (Leaflet)
- Color-coded markers by severity/type
- Circular overlays for affected areas
- Zoom and pan controls
- Dark mode map tiles

#### 6.2 Map Features
- Click markers for report details
- Filter by hazard type
- Filter by time range
- Layer controls for different data types
- Heatmap visualization option

### 7. News Feed Integration

#### 7.1 News Display
- Curated news feed from multiple sources
- Display: source, title, summary, timestamp
- Link to full articles
- Relevance-based ordering

## Non-Functional Requirements

### 1. Performance

#### 1.1 Response Time
- API responses < 200ms for simple queries
- Map loading < 2 seconds
- Report submission < 1 second
- ML inference < 500ms per report

#### 1.2 Scalability
- Support 10,000+ concurrent users
- Handle 1,000+ reports per hour
- Process social media feeds continuously
- Horizontal scaling capability

#### 1.3 Throughput
- ML batch processing: 32 reports per batch
- Social harvester: runs every 15 minutes
- Database query optimization with indexing

### 2. Reliability

#### 2.1 Availability
- 99.5% uptime target
- Graceful degradation if ML service unavailable
- Database connection pooling
- Automatic retry mechanisms

#### 2.2 Data Integrity
- ACID compliance for database transactions
- Data validation at API layer
- Referential integrity constraints
- Backup and recovery procedures

### 3. Security

#### 3.1 Authentication & Authorization
- JWT tokens with expiration
- Password hashing (bcrypt)
- Role-based access control
- Secure session management

#### 3.2 Data Protection
- HTTPS for all communications
- SQL injection prevention (ORM)
- XSS protection
- CSRF protection
- Input validation and sanitization

#### 3.3 Privacy
- PII protection
- User data encryption at rest
- Secure media storage
- GDPR compliance considerations

### 4. Usability

#### 4.1 User Interface
- Responsive design (mobile, tablet, desktop)
- Intuitive navigation
- Accessibility compliance
- Clear error messages
- Loading indicators

#### 4.2 User Experience
- Simple report submission flow
- Visual feedback for actions
- Toast notifications for success/errors
- Consistent design language

### 5. Maintainability

#### 5.1 Code Quality
- Modular architecture
- Clear separation of concerns
- Comprehensive logging
- Error handling
- Code documentation

#### 5.2 Monitoring
- Application performance monitoring
- Error tracking and alerting
- Resource utilization metrics
- ML model performance tracking

### 6. Compatibility

#### 6.1 Browser Support
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

#### 6.2 Platform Support
- Web application (primary)
- Mobile-responsive design
- API for future mobile apps

### 7. Deployment

#### 7.1 Containerization
- Docker containers for all services
- Docker Compose for orchestration
- Environment-based configuration

#### 7.2 Infrastructure
- PostgreSQL with PostGIS extension
- Redis for caching
- Cloud storage (Cloudinary)
- Separate ML service container

## Data Requirements

### 1. Data Storage

#### 1.1 Database
- PostgreSQL 14+ with PostGIS 3.2+
- Geospatial data support (POINT geometry)
- SRID 4326 (WGS 84) coordinate system

#### 1.2 Data Retention
- Reports: indefinite retention
- Social posts: 90 days
- Media files: linked to reports
- Logs: 30 days

### 2. Data Models

#### 2.1 User
- id, email, full_name, hashed_password
- role, is_active, created_at

#### 2.2 Report
- id, user_id, hazard_type, description
- severity, location (PostGIS POINT)
- is_verified, status, created_at

#### 2.3 Media
- id, report_id, file_path, file_type
- created_at

#### 2.4 SocialPost
- id, source, author, content
- url, published_at

### 3. Data Quality

#### 3.1 Validation
- Required field enforcement
- Data type validation
- Geographic coordinate validation
- File size and type restrictions

#### 3.2 Consistency
- Foreign key constraints
- Cascade delete rules
- Transaction management

## Integration Requirements

### 1. External Services

#### 1.1 Cloud Storage
- Cloudinary for media hosting
- API key authentication
- Secure upload and retrieval

#### 1.2 Social Media APIs
- Twitter/X API integration
- Facebook/Meta API integration
- Rate limiting compliance
- OAuth authentication

#### 1.3 Weather APIs (Optional)
- OpenWeather API
- StormGlass API
- Real-time weather data

### 2. Internal Services

#### 2.1 Backend API
- RESTful API design
- JSON request/response format
- Versioned endpoints (/api/v1)
- OpenAPI/Swagger documentation

#### 2.2 ML Service
- Separate microservice
- HTTP API for predictions
- Batch processing support
- Model versioning

## Constraints

### 1. Technical Constraints
- Python 3.9+ for backend and ML service
- Node.js 18+ for frontend
- PostgreSQL 14+ with PostGIS
- Docker for deployment

### 2. Business Constraints
- Open-source dependencies only
- Cloud storage within budget limits
- API rate limits for external services

### 3. Regulatory Constraints
- Data privacy regulations (GDPR, local laws)
- Emergency communication standards
- Accessibility requirements (WCAG 2.1)

## Future Enhancements

### Phase 2 Features
- Mobile native applications (iOS/Android)
- Push notifications for critical alerts
- SMS/WhatsApp integration
- Multi-language support
- Offline mode for reports

### Phase 3 Features
- Predictive analytics for disaster forecasting
- Integration with government emergency systems
- Volunteer coordination features
- Resource allocation optimization
- Advanced image recognition for damage assessment

### Phase 4 Features
- Blockchain for report verification
- Drone integration for aerial imagery
- IoT sensor integration
- AR visualization for emergency responders
- AI-powered chatbot for citizen assistance
