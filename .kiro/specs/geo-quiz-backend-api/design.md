# Design Document

## Overview

Backend API для географической викторины построен на ASP.NET Core 8.0 с использованием SQLite в качестве базы данных. API предоставляет RESTful endpoints для аутентификации пользователей, управления профилями, сохранения игровой статистики и формирования списков лидеров. Система поддерживает как аутентифицированных пользователей, так и анонимную игру с локальным хранением результатов.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   React Client  │ ◄──────────────► │   ASP.NET Core  │
│   (Frontend)    │                  │   Web API       │
└─────────────────┘                  └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │   SQLite DB     │
                                     │   (Local File)  │
                                     └─────────────────┘
```

### Technology Stack

- **Framework**: ASP.NET Core 8.0
- **Database**: SQLite with Entity Framework Core
- **Authentication**: JWT Bearer tokens
- **Password Hashing**: BCrypt.Net
- **Logging**: Serilog
- **API Documentation**: Scalar/OpenAPI
- **CORS**: Configured for React frontend

### Project Structure

```
GeoQuizApi/
├── Controllers/
│   ├── AuthController.cs
│   ├── GameStatsController.cs
│   └── LeaderboardController.cs
├── Models/
│   ├── Entities/
│   │   ├── User.cs
│   │   ├── GameSession.cs
│   │   └── RefreshToken.cs
│   ├── DTOs/
│   │   ├── Auth/
│   │   ├── GameStats/
│   │   └── Leaderboard/
│   └── Requests/
├── Services/
│   ├── IAuthService.cs
│   ├── AuthService.cs
│   ├── IGameStatsService.cs
│   ├── GameStatsService.cs
│   ├── ILeaderboardService.cs
│   └── LeaderboardService.cs
├── Data/
│   ├── GeoQuizDbContext.cs
│   └── Migrations/
├── Middleware/
│   ├── ErrorHandlingMiddleware.cs
│   └── RequestLoggingMiddleware.cs
├── Configuration/
│   ├── JwtSettings.cs
│   └── DatabaseSettings.cs
└── Program.cs
```

## Components and Interfaces

### 1. Authentication System

#### JWT Configuration
- **Access Token**: 15 минут жизни, содержит user claims
- **Refresh Token**: 7 дней жизни, хранится в БД с возможностью отзыва
- **Token Rotation**: При обновлении выдается новая пара токенов

#### Auth Controller Endpoints
```csharp
[Route("api/auth")]
public class AuthController : ControllerBase
{
    [HttpPost("register")]
    [HttpPost("login")]
    [HttpPost("refresh")]
    [HttpPost("logout")]
    [HttpGet("me")]
    [HttpPut("profile")]
    [HttpPut("change-password")]
}
```

### 2. Game Statistics System

#### Game Stats Controller Endpoints
```csharp
[Route("api/game-stats")]
public class GameStatsController : ControllerBase
{
    [HttpPost]                    // Save game session
    [HttpGet("me")]              // Get user's aggregated stats
    [HttpGet("me/history")]      // Get user's game history
    [HttpPost("migrate")]        // Migrate anonymous progress
}
```

### 3. Leaderboard System

#### Leaderboard Controller Endpoints
```csharp
[Route("api/leaderboard")]
public class LeaderboardController : ControllerBase
{
    [HttpGet]                    // Get global leaderboard
    [HttpGet("game-type/{type}")]// Get leaderboard by game type
    [HttpGet("period/{period}")] // Get leaderboard by time period
}
```

## Data Models

### Database Entities

#### User Entity
```csharp
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public string? Name { get; set; }
    public string? Avatar { get; set; }
    public string Provider { get; set; } = "email";
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    
    // User Preferences (JSON column)
    public string? PreferencesJson { get; set; }
    
    // Navigation properties
    public ICollection<GameSession> GameSessions { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; }
}
```

#### GameSession Entity
```csharp
public class GameSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string GameType { get; set; } // countries, flags, states
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public DateTime SessionStartTime { get; set; }
    public DateTime? SessionEndTime { get; set; }
    public int? SessionDurationMs { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; }
}
```

#### RefreshToken Entity
```csharp
public class RefreshToken
{
    public Guid Id { get; set; }
    public string Token { get; set; }
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsRevoked { get; set; }
    
    // Navigation properties
    public User User { get; set; }
}
```

### DTOs (Data Transfer Objects)

#### Authentication DTOs
```csharp
public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class RegisterRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class AuthResponse
{
    public UserDto User { get; set; }
    public string AccessToken { get; set; }
    public string RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
}

public class UserDto
{
    public string Id { get; set; }
    public string Email { get; set; }
    public string? Name { get; set; }
    public string? Avatar { get; set; }
    public string Provider { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public UserPreferencesDto? Preferences { get; set; }
}
```

#### Game Statistics DTOs
```csharp
public class GameSessionRequest
{
    public string GameType { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public DateTime SessionStartTime { get; set; }
    public DateTime? SessionEndTime { get; set; }
}

public class GameStatsResponse
{
    public int TotalGames { get; set; }
    public int TotalCorrectAnswers { get; set; }
    public int TotalWrongAnswers { get; set; }
    public int BestStreak { get; set; }
    public double AverageAccuracy { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public Dictionary<string, GameTypeStats> GameTypeStats { get; set; }
}

public class GameTypeStats
{
    public int Games { get; set; }
    public int CorrectAnswers { get; set; }
    public int WrongAnswers { get; set; }
    public double Accuracy { get; set; }
    public int BestStreak { get; set; }
}
```

#### Leaderboard DTOs
```csharp
public class LeaderboardEntry
{
    public string? UserId { get; set; }
    public string DisplayName { get; set; }
    public int TotalScore { get; set; }
    public int TotalGames { get; set; }
    public double Accuracy { get; set; }
    public int BestStreak { get; set; }
    public DateTime? LastPlayedAt { get; set; }
    public int Rank { get; set; }
}

public class LeaderboardResponse
{
    public List<LeaderboardEntry> Entries { get; set; }
    public int TotalPlayers { get; set; }
    public LeaderboardEntry? CurrentUserEntry { get; set; }
}
```

## Error Handling

### Global Error Handling Middleware
```csharp
public class ErrorHandlingMiddleware
{
    // Handles all unhandled exceptions
    // Returns consistent error response format
    // Logs errors with appropriate level
}
```

### Error Response Format
```json
{
  "error": {
    "type": "ValidationError",
    "message": "Validation failed",
    "details": {
      "email": "Email is required",
      "password": "Password must be at least 8 characters"
    }
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "path": "/api/auth/register"
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created (registration, game session saved)
- **400**: Bad Request (invalid data format)
- **401**: Unauthorized (invalid credentials, expired token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (user not found)
- **409**: Conflict (email already exists)
- **422**: Unprocessable Entity (validation errors)
- **500**: Internal Server Error

## Testing Strategy

### Unit Tests
- **Services**: Business logic testing with mocked dependencies
- **Controllers**: HTTP endpoint testing with mocked services
- **Repositories**: Data access testing with in-memory database

### Integration Tests
- **API Endpoints**: Full request/response cycle testing
- **Database**: Entity Framework migrations and queries
- **Authentication**: JWT token generation and validation

### Test Structure
```
GeoQuizApi.Tests/
├── Unit/
│   ├── Services/
│   ├── Controllers/
│   └── Utilities/
├── Integration/
│   ├── Controllers/
│   ├── Database/
│   └── Authentication/
└── TestUtilities/
    ├── TestDbContext.cs
    ├── MockServices.cs
    └── TestDataBuilder.cs
```

### Test Data Management
- **In-Memory Database**: SQLite in-memory для тестов
- **Test Fixtures**: Предустановленные данные для тестов
- **Data Builders**: Fluent API для создания тестовых данных

## Security Considerations

### Password Security
- **Hashing**: BCrypt с автоматической солью
- **Validation**: Минимум 8 символов, буквы и цифры
- **Rate Limiting**: Ограничение попыток входа

### JWT Security
- **Short-lived Access Tokens**: 15 минут
- **Secure Refresh Tokens**: Хранение в БД с возможностью отзыва
- **Token Rotation**: Новые токены при каждом обновлении

### API Security
- **HTTPS Only**: В production окружении
- **CORS**: Настроенный для конкретных доменов
- **Input Validation**: Валидация всех входящих данных
- **SQL Injection Protection**: Entity Framework параметризованные запросы

## Performance Considerations

### Database Optimization
- **Indexes**: На часто запрашиваемые поля (email, userId, gameType)
- **Connection Pooling**: Настроенный пул соединений
- **Query Optimization**: Efficient LINQ queries

### Caching Strategy
- **In-Memory Caching**: Для списков лидеров (5 минут TTL)
- **Response Caching**: Для статических данных
- **Database Query Caching**: EF Core query caching

### Scalability
- **Stateless Design**: Все состояние в JWT токенах или БД
- **Horizontal Scaling**: Готовность к масштабированию
- **Database Migrations**: Автоматические миграции при развертывании