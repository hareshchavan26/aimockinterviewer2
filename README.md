# Reporting Service

The Reporting Service is responsible for generating comprehensive performance reports for interview sessions in the AI Mock Interview Platform. It analyzes interview data and provides detailed feedback, improvement recommendations, and progress tracking.

## Features

- **Performance Report Generation**: Creates detailed reports with scoring across multiple categories
- **Category Scoring**: Evaluates communication, technical accuracy, confidence, clarity, structure, and relevance
- **Improvement Plans**: Generates personalized recommendations and practice exercises
- **Benchmark Comparisons**: Compares performance against industry and role averages
- **Annotated Transcripts**: Creates color-coded transcripts with highlights and insights
- **Progress Tracking**: Tracks improvement over multiple sessions
- **Data Export**: Supports PDF, JSON, and CSV export formats

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Reports
- `POST /api/reports/generate` - Generate a new performance report
- `GET /api/reports/:reportId` - Get a specific report by ID
- `GET /api/reports/user/:userId` - Get all reports for a user
- `GET /api/reports/session/:sessionId` - Get report for a specific session
- `DELETE /api/reports/:reportId` - Delete a report

## Environment Variables

```env
# Service Configuration
NODE_ENV=development
REPORTING_PORT=3005

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_interview_platform
DB_USER=postgres
DB_PASSWORD=password
DB_SSL=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
INTERVIEW_SERVICE_URL=http://localhost:3003
ANALYSIS_SERVICE_URL=http://localhost:3006

# Report Configuration
REPORT_CACHE_EXPIRATION=60
MAX_REPORTS_PER_USER=100
REPORT_RETENTION_DAYS=90

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## Database Schema

The service uses the following PostgreSQL tables:

- `performance_reports` - Main report records
- `report_category_scores` - Category-wise scoring data
- `report_improvement_plans` - Improvement recommendations and exercises
- `report_benchmark_comparisons` - Performance benchmarking data
- `report_transcripts` - Annotated transcript data

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Setup
```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker
```bash
# Build image
docker build -t ai-interview-reporting .

# Run container
docker run -p 3005:3005 ai-interview-reporting
```

## Report Generation Process

1. **Data Collection**: Fetches interview session data and analysis results
2. **Score Calculation**: Computes category scores from individual response analyses
3. **Improvement Analysis**: Identifies priority areas and generates recommendations
4. **Benchmark Comparison**: Compares performance against industry standards
5. **Transcript Generation**: Creates annotated transcript with highlights
6. **Report Assembly**: Combines all components into a comprehensive report
7. **Storage**: Persists report to database with proper indexing

## Performance Scoring

Reports include scoring across six key categories:

- **Communication** (0-1): Based on speech clarity and delivery
- **Technical Accuracy** (0-1): Evaluates correctness of technical responses
- **Confidence** (0-1): Measures confidence levels from voice and behavior
- **Clarity** (0-1): Assesses clarity of verbal and written responses
- **Structure** (0-1): Evaluates response organization and flow
- **Relevance** (0-1): Measures relevance to questions and role requirements

## Improvement Recommendations

The service generates personalized improvement plans including:

- **Priority Areas**: Categories scoring below 0.7 threshold
- **Action Items**: Specific steps to improve performance
- **Practice Exercises**: Targeted exercises for skill development
- **Resources**: Links to helpful articles, courses, and materials
- **Time Estimates**: Realistic timelines for improvement

## Testing

The service includes comprehensive test coverage:

- **Unit Tests**: Test individual components and business logic
- **Integration Tests**: Test API endpoints and service integration
- **Property-Based Tests**: Validate correctness properties using fast-check

Run tests with:
```bash
npm test
npm run test:watch
```

## Monitoring and Logging

The service includes:

- **Structured Logging**: JSON-formatted logs with Winston
- **Health Checks**: Built-in health monitoring endpoints
- **Error Tracking**: Comprehensive error handling and reporting
- **Performance Metrics**: Request timing and database query monitoring

## Security

- **Input Validation**: All API inputs validated with express-validator
- **SQL Injection Protection**: Parameterized queries with pg
- **Rate Limiting**: Built-in rate limiting for API endpoints
- **CORS Configuration**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers

## Deployment

The service is designed for containerized deployment:

- **Docker Support**: Multi-stage Dockerfile for optimized images
- **Health Checks**: Built-in Docker health check commands
- **Graceful Shutdown**: Proper cleanup of database connections
- **Environment Configuration**: 12-factor app configuration principles