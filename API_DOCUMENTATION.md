# GeoQuiz API Documentation

## Overview

The GeoQuiz API is a RESTful web service built with .NET 8 that provides authentication, game statistics tracking, and leaderboard functionality for the GeoQuiz geography learning application.

**Base URL**: `http://localhost:5000/api` (development) | `http://your-domain/api` (production)

**Authentication**: JWT Bearer tokens with refresh token rotation

**Content Type**: `application/json`

## Authentication

All protected endpoints require a valid JWT access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Token Lifecycle
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Automatic Refresh**: Client automatically refreshes tokens when needed

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": null,
    "avatar": null,
    "provider": "local",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-15T10:30:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200a1b2c3d4e5f6...",
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: User already exists

---

#### POST /api/auth/login

Authenticate user and obtain tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "provider": "local",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-15T12:45:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200a1b2c3d4e5f6...",
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid credentials

---

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "def50200a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "provider": "local",
    "createdAt": "2024-01-15T10:30:00Z",
    "lastLoginAt": "2024-01-15T12:45:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "abc12345def67890...",
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Invalid refresh token
- `401 Unauthorized`: Refresh token expired or revoked

---

#### GET /api/auth/me

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "avatar": "https://example.com/avatar.jpg",
  "provider": "local",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2024-01-15T12:45:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

#### PUT /api/auth/profile

Update user profile information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Smith",
  "avatar": "https://example.com/new-avatar.jpg",
  "provider": "local",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastLoginAt": "2024-01-15T12:45:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid or expired token

---

#### PUT /api/auth/change-password

Change user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data or current password incorrect
- `401 Unauthorized`: Invalid or expired token

---

#### POST /api/auth/logout

Logout user and revoke refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### Game Statistics Endpoints

#### POST /api/game-stats

Save a completed game session.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "gameType": "CountryQuiz",
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "sessionStartTime": "2024-01-15T14:00:00Z",
  "sessionEndTime": "2024-01-15T14:05:30Z"
}
```

**Response (201 Created):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "gameType": "CountryQuiz",
  "correctAnswers": 8,
  "wrongAnswers": 2,
  "accuracy": 80.0,
  "sessionStartTime": "2024-01-15T14:00:00Z",
  "sessionEndTime": "2024-01-15T14:05:30Z",
  "sessionDurationMs": 330000,
  "createdAt": "2024-01-15T14:05:30Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid or expired token

---

#### GET /api/game-stats/me

Get user's overall game statistics.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "totalGames": 25,
  "totalCorrectAnswers": 180,
  "totalWrongAnswers": 70,
  "bestStreak": 12,
  "averageAccuracy": 72.0,
  "lastPlayedAt": "2024-01-15T14:05:30Z",
  "gameTypeStats": {
    "CountryQuiz": {
      "games": 10,
      "correctAnswers": 75,
      "wrongAnswers": 25,
      "accuracy": 75.0,
      "bestStreak": 8
    },
    "FlagQuiz": {
      "games": 8,
      "correctAnswers": 60,
      "wrongAnswers": 20,
      "accuracy": 75.0,
      "bestStreak": 6
    },
    "StateQuiz": {
      "games": 7,
      "correctAnswers": 45,
      "wrongAnswers": 25,
      "accuracy": 64.3,
      "bestStreak": 5
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired token

---

#### GET /api/game-stats/me/history

Get user's game session history with pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)
- `gameType` (optional): Filter by game type

**Example Request:**
```
GET /api/game-stats/me/history?page=1&pageSize=10&gameType=CountryQuiz
```

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "gameType": "CountryQuiz",
      "correctAnswers": 8,
      "wrongAnswers": 2,
      "accuracy": 80.0,
      "sessionStartTime": "2024-01-15T14:00:00Z",
      "sessionEndTime": "2024-01-15T14:05:30Z",
      "sessionDurationMs": 330000,
      "createdAt": "2024-01-15T14:05:30Z"
    }
  ],
  "totalCount": 25,
  "page": 1,
  "pageSize": 10,
  "hasNextPage": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters
- `401 Unauthorized`: Invalid or expired token

---

#### POST /api/game-stats/migrate

Migrate anonymous game progress to authenticated user account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "sessions": [
    {
      "gameType": "CountryQuiz",
      "correctAnswers": 5,
      "wrongAnswers": 3,
      "sessionStartTime": "2024-01-15T13:00:00Z",
      "sessionEndTime": "2024-01-15T13:04:00Z"
    },
    {
      "gameType": "FlagQuiz",
      "correctAnswers": 7,
      "wrongAnswers": 1,
      "sessionStartTime": "2024-01-15T13:10:00Z",
      "sessionEndTime": "2024-01-15T13:13:30Z"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "message": "Anonymous progress migrated successfully",
  "migratedSessions": 2
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid or expired token

### Leaderboard Endpoints

#### GET /api/leaderboard

Get global leaderboard with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50, max: 100)

**Example Request:**
```
GET /api/leaderboard?page=1&pageSize=20
```

**Response (200 OK):**
```json
{
  "players": [
    {
      "rank": 1,
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "userName": "TopPlayer",
      "userAvatar": "https://example.com/avatar1.jpg",
      "totalScore": 2500,
      "accuracy": 85.5,
      "gamesPlayed": 50,
      "isCurrentUser": false
    },
    {
      "rank": 2,
      "userId": "789e0123-e89b-12d3-a456-426614174002",
      "userName": "GeoMaster",
      "userAvatar": null,
      "totalScore": 2350,
      "accuracy": 82.3,
      "gamesPlayed": 45,
      "isCurrentUser": true
    }
  ],
  "totalPlayers": 1250,
  "page": 1,
  "pageSize": 20,
  "hasNextPage": true,
  "currentUserRank": 2
}
```

**Error Responses:**
- `400 Bad Request`: Invalid query parameters

---

#### GET /api/leaderboard/game-type/{gameType}

Get leaderboard filtered by specific game type.

**Path Parameters:**
- `gameType`: Game type (CountryQuiz, FlagQuiz, StateQuiz)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50, max: 100)

**Example Request:**
```
GET /api/leaderboard/game-type/CountryQuiz?page=1&pageSize=10
```

**Response (200 OK):**
```json
{
  "players": [
    {
      "rank": 1,
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "userName": "CountryExpert",
      "userAvatar": "https://example.com/avatar1.jpg",
      "totalScore": 1200,
      "accuracy": 90.0,
      "gamesPlayed": 25,
      "isCurrentUser": false
    }
  ],
  "totalPlayers": 800,
  "page": 1,
  "pageSize": 10,
  "hasNextPage": true,
  "currentUserRank": 15
}
```

**Error Responses:**
- `400 Bad Request`: Invalid game type or query parameters

---

#### GET /api/leaderboard/period/{period}

Get leaderboard filtered by time period.

**Path Parameters:**
- `period`: Time period (daily, weekly, monthly, yearly)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 50, max: 100)

**Example Request:**
```
GET /api/leaderboard/period/weekly?page=1&pageSize=10
```

**Response (200 OK):**
```json
{
  "players": [
    {
      "rank": 1,
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "userName": "WeeklyChamp",
      "userAvatar": "https://example.com/avatar1.jpg",
      "totalScore": 450,
      "accuracy": 88.0,
      "gamesPlayed": 12,
      "isCurrentUser": false
    }
  ],
  "totalPlayers": 320,
  "page": 1,
  "pageSize": 10,
  "hasNextPage": true,
  "currentUserRank": 8
}
```

**Error Responses:**
- `400 Bad Request`: Invalid period or query parameters

## Data Models

### User Model
```typescript
interface User {
  id: string                    // UUID
  email: string                 // User email address
  name?: string                 // Display name (optional)
  avatar?: string               // Avatar URL (optional)
  provider: string              // Authentication provider (local, google, etc.)
  createdAt: string             // ISO 8601 timestamp
  lastLoginAt?: string          // ISO 8601 timestamp (optional)
}
```

### AuthResponse Model
```typescript
interface AuthResponse {
  user: User                    // User information
  accessToken: string           // JWT access token
  refreshToken: string          // Refresh token
  expiresIn: number             // Token expiration in seconds
}
```

### GameSession Model
```typescript
interface GameSessionRequest {
  gameType: string              // Type of game (CountryQuiz, FlagQuiz, StateQuiz)
  correctAnswers: number        // Number of correct answers
  wrongAnswers: number          // Number of wrong answers
  sessionStartTime: string      // ISO 8601 timestamp
  sessionEndTime: string        // ISO 8601 timestamp
}

interface GameSessionDto {
  id: string                    // UUID
  gameType: string              // Type of game
  correctAnswers: number        // Number of correct answers
  wrongAnswers: number          // Number of wrong answers
  accuracy: number              // Accuracy percentage (0-100)
  sessionStartTime: string      // ISO 8601 timestamp
  sessionEndTime: string        // ISO 8601 timestamp
  sessionDurationMs: number     // Session duration in milliseconds
  createdAt: string             // ISO 8601 timestamp
}
```

### GameStats Model
```typescript
interface GameStatsResponse {
  totalGames: number                              // Total number of games played
  totalCorrectAnswers: number                     // Total correct answers across all games
  totalWrongAnswers: number                       // Total wrong answers across all games
  bestStreak: number                              // Best consecutive correct answers
  averageAccuracy: number                         // Average accuracy percentage
  lastPlayedAt?: string                           // ISO 8601 timestamp (optional)
  gameTypeStats: Record<string, GameTypeStatsDto> // Statistics by game type
}

interface GameTypeStatsDto {
  games: number                 // Number of games played for this type
  correctAnswers: number        // Correct answers for this type
  wrongAnswers: number          // Wrong answers for this type
  accuracy: number              // Accuracy percentage for this type
  bestStreak: number            // Best streak for this type
}
```

### Leaderboard Models
```typescript
interface LeaderboardResponse {
  players: LeaderboardEntryDto[]  // Array of leaderboard entries
  totalPlayers: number            // Total number of players
  page: number                    // Current page number
  pageSize: number                // Number of items per page
  hasNextPage: boolean            // Whether there are more pages
  currentUserRank?: number        // Current user's rank (if authenticated)
}

interface LeaderboardEntryDto {
  rank: number                    // Player's rank position
  userId: string                  // User UUID
  userName: string                // User display name
  userAvatar?: string             // User avatar URL (optional)
  totalScore: number              // Total score/points
  accuracy: number                // Overall accuracy percentage
  gamesPlayed: number             // Total number of games played
  isCurrentUser: boolean          // Whether this entry is the current user
}
```

## Error Handling

### Error Response Format
```json
{
  "message": "Error description",
  "details": {
    "field": "Specific field error",
    "code": "ERROR_CODE"
  },
  "timestamp": "2024-01-15T14:05:30Z"
}
```

### Common HTTP Status Codes
- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

### Error Types
- **Validation Errors**: Invalid input data format or constraints
- **Authentication Errors**: Invalid credentials or expired tokens
- **Authorization Errors**: Insufficient permissions
- **Not Found Errors**: Requested resource doesn't exist
- **Conflict Errors**: Resource already exists (e.g., duplicate email)
- **Server Errors**: Internal server issues

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authentication endpoints**: 5 requests per minute per IP
- **Game statistics endpoints**: 100 requests per minute per user
- **Leaderboard endpoints**: 60 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Security Considerations

### Authentication Security
- JWT tokens are signed with a secure secret key
- Refresh tokens are stored securely and rotated on each use
- Passwords are hashed using bcrypt with salt
- Token expiration times are kept short for access tokens

### API Security
- CORS is configured to allow only trusted origins
- Input validation is performed on all endpoints
- SQL injection protection through parameterized queries
- Rate limiting prevents brute force attacks

### Data Privacy
- User passwords are never returned in API responses
- Personal information is only accessible to the authenticated user
- Game statistics are private to each user
- Leaderboards only show public information (username, scores)

## SDK and Client Libraries

### TypeScript/JavaScript Client
The frontend includes a comprehensive TypeScript client with:
- Automatic token management and refresh
- Type-safe API calls
- Error handling and retry logic
- Offline support with local storage fallback

Example usage:
```typescript
import { authService, gameStatsService } from './services'

// Login
const authResponse = await authService.login('user@example.com', 'password')

// Save game session
await gameStatsService.saveGameSession({
  gameType: 'CountryQuiz',
  correctAnswers: 8,
  wrongAnswers: 2,
  sessionStartTime: new Date().toISOString(),
  sessionEndTime: new Date().toISOString()
})

// Get user statistics
const stats = await gameStatsService.getUserStats()
```

## Deployment

### Environment URLs

#### Development
- **API Base URL**: `http://localhost:5000/api`
- **Frontend URL**: `http://localhost:3000`
- **Database**: PostgreSQL in Docker container

#### Staging
- **API Base URL**: `http://localhost:5001/api`
- **Frontend URL**: `http://localhost:6666`
- **Database**: PostgreSQL staging database

#### Production
- **API Base URL**: `http://10.66.66.64:5000/api`
- **Frontend URL**: `http://10.66.66.64:6666`
- **Database**: PostgreSQL production database

### Docker Deployment

The API is deployed using Docker containers with the following services:

- **Backend**: .NET 8 Web API in Docker container
- **Database**: PostgreSQL 16 with persistent volumes
- **Frontend**: React app served by Nginx
- **Reverse Proxy**: Nginx for load balancing and SSL termination

### Health Checks

All environments include health check endpoints:

- **API Health**: `GET /health` - Returns API status
- **Database Health**: Automatic health checks in Docker Compose
- **Service Discovery**: Internal container communication

### Environment Configuration

Each environment uses specific configuration:

```bash
# Staging deployment
cd deployment/docker
./docker-compose.sh staging up -d

# Production deployment
./docker-compose.sh production up -d

# View logs
./docker-compose.sh staging logs backend
```

## Changelog

### Version 1.0.0 (Current)
- Initial API implementation
- Authentication with JWT tokens
- Game statistics tracking
- Global and filtered leaderboards
- User profile management
- Anonymous progress migration
- Docker-based deployment system
- Multi-environment support (dev/staging/prod)

### Planned Features
- Social features (friend lists, challenges)
- Achievement system
- Advanced analytics and insights
- Mobile app API extensions
- Real-time multiplayer support
- Kubernetes deployment support
- API versioning system