# Design Document

## Overview

Данный дизайн описывает реализацию стандартизированного формата ошибок в соответствии с RFC 9457 "Problem Details for HTTP APIs" для GeoQuiz backend API, используя встроенные возможности ASP.NET Core. ASP.NET Core предоставляет встроенную поддержку RFC 9457 через класс `Microsoft.AspNetCore.Mvc.ProblemDetails` и связанные сервисы.

Текущая система использует собственный формат ошибок через `ErrorHandlingMiddleware`, который возвращает объекты типа `ErrorResponse` с полями `Error`, `Timestamp`, `Path`. Необходимо заменить этот формат на стандартный ASP.NET Core `ProblemDetails`, сохранив при этом функциональность логирования и обработки различных типов исключений.

## Architecture

### Компоненты системы

1. **Microsoft.AspNetCore.Mvc.ProblemDetails** - встроенная модель ASP.NET Core для RFC 9457
2. **Microsoft.AspNetCore.Http.IProblemDetailsService** - встроенный сервис для создания ProblemDetails
3. **Rfc9457ErrorHandlingMiddleware** - обновленный middleware для обработки исключений
4. **ProblemTypeRegistry** - реестр типов проблем с их URI и описаниями
5. **Microsoft.AspNetCore.Mvc.ValidationProblemDetails** - встроенная модель для ошибок валидации

### Архитектурные принципы

- **Централизация**: Вся обработка ошибок происходит через единый middleware
- **Типизация**: Строгая типизация всех моделей ошибок
- **Расширяемость**: Возможность добавления новых типов ошибок без изменения базовой логики
- **Совместимость**: Поддержка всех существующих HTTP статус кодов
- **Логирование**: Сохранение текущей функциональности логирования

## Components and Interfaces

### 1. Использование встроенного ProblemDetails

ASP.NET Core предоставляет встроенный класс `Microsoft.AspNetCore.Mvc.ProblemDetails`, который полностью соответствует RFC 9457:

```csharp
// Встроенный класс ASP.NET Core
public class ProblemDetails
{
    public string? Type { get; set; }
    public string? Title { get; set; }
    public int? Status { get; set; }
    public string? Detail { get; set; }
    public string? Instance { get; set; }
    public IDictionary<string, object?> Extensions { get; set; }
}
```

### 2. Использование встроенного ValidationProblemDetails

Для ошибок валидации используется встроенный класс `Microsoft.AspNetCore.Mvc.ValidationProblemDetails`:

```csharp
// Встроенный класс ASP.NET Core
public class ValidationProblemDetails : ProblemDetails
{
    public IDictionary<string, string[]> Errors { get; set; }
    
    public ValidationProblemDetails()
    {
        Title = "One or more validation errors occurred.";
        Type = "https://tools.ietf.org/html/rfc7231#section-6.5.1";
    }
}
```

### 3. ProblemTypes Registry

```csharp
public static class ProblemTypes
{
    public const string BaseUri = "https://geoquiz.api/problems/";
    
    public const string ValidationError = BaseUri + "validation-error";
    public const string AuthenticationError = BaseUri + "authentication-error";
    public const string AuthorizationError = BaseUri + "authorization-error";
    public const string NotFoundError = BaseUri + "not-found-error";
    public const string ConflictError = BaseUri + "conflict-error";
    public const string InternalServerError = BaseUri + "internal-server-error";
    public const string BadRequestError = BaseUri + "bad-request-error";
}
```

### 4. Использование встроенного IProblemDetailsService

ASP.NET Core предоставляет встроенный сервис `IProblemDetailsService` для создания ProblemDetails:

```csharp
// Встроенный интерфейс ASP.NET Core
public interface IProblemDetailsService
{
    bool TryWriteAsync(ProblemDetailsContext context);
}

// Кастомная обертка для удобства использования
public interface ICustomProblemDetailsService
{
    ProblemDetails CreateProblemDetails(Exception exception, HttpContext context);
    ValidationProblemDetails CreateValidationProblemDetails(ValidationException exception, HttpContext context);
}

public class CustomProblemDetailsService : ICustomProblemDetailsService
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly IWebHostEnvironment _environment;
    
    public CustomProblemDetailsService(
        IProblemDetailsService problemDetailsService,
        IWebHostEnvironment environment)
    {
        _problemDetailsService = problemDetailsService;
        _environment = environment;
    }
    
    // Implementation methods...
}
```

### 5. Rfc9457ErrorHandlingMiddleware

```csharp
public class Rfc9457ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<Rfc9457ErrorHandlingMiddleware> _logger;
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ICustomProblemDetailsService _customProblemDetailsService;

    public Rfc9457ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<Rfc9457ErrorHandlingMiddleware> logger,
        IProblemDetailsService problemDetailsService,
        ICustomProblemDetailsService customProblemDetailsService)
    {
        _next = next;
        _logger = logger;
        _problemDetailsService = problemDetailsService;
        _customProblemDetailsService = customProblemDetailsService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var problemDetails = _customProblemDetailsService.CreateProblemDetails(exception, context);
        
        var problemDetailsContext = new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = problemDetails
        };

        // Используем встроенный сервис для записи ответа
        if (!await _problemDetailsService.TryWriteAsync(problemDetailsContext))
        {
            // Fallback если встроенный сервис не смог обработать
            context.Response.StatusCode = problemDetails.Status ?? 500;
            context.Response.ContentType = "application/problem+json";
            
            await context.Response.WriteAsJsonAsync(problemDetails);
        }
    }
}
```

## Data Models

### RFC 9457 Problem Details Format

Стандартный формат ответа об ошибке согласно RFC 9457 с использованием встроенных классов ASP.NET Core:

```json
{
  "type": "https://geoquiz.api/problems/validation-error",
  "title": "One or more validation errors occurred",
  "status": 422,
  "detail": "The request contains invalid data",
  "instance": "/api/auth/register",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters long"]
  }
}
```

### Mapping от текущего формата к ASP.NET Core ProblemDetails

| Текущее поле | ProblemDetails поле | Описание |
|--------------|---------------------|----------|
| `Error.Type` | `Type` | URI идентификатор типа проблемы |
| `Error.Message` | `Title` | Краткое описание типа проблемы |
| `Path` | `Instance` | URI конкретного случая проблемы |
| `Timestamp` | `Extensions["timestamp"]` | Время возникновения (дополнительное поле) |
| `Error.Details` | `Errors` | Детали валидации (для ValidationProblemDetails) |
| HTTP Status Code | `Status` | HTTP статус код |
| - | `Detail` | Подробное описание конкретного случая |

### Типы ошибок и их маппинг

| Exception Type | HTTP Status | Problem Type URI | Title |
|----------------|-------------|------------------|-------|
| `ValidationException` | 422 | `validation-error` | "One or more validation errors occurred." |
| `UnauthorizedAccessException` | 401 | `authentication-error` | "Authentication required" |
| `ForbiddenException` | 403 | `authorization-error` | "Access denied" |
| `KeyNotFoundException` | 404 | `not-found-error` | "Resource not found" |
| `InvalidOperationException` (conflict) | 409 | `conflict-error` | "Resource conflict" |
| `ArgumentException` | 400 | `bad-request-error` | "Invalid request" |
| `Exception` (general) | 500 | `internal-server-error` | "An error occurred while processing your request." |

## Error Handling

### Exception Processing Flow

1. **Exception Capture**: Middleware перехватывает все необработанные исключения
2. **Exception Classification**: Определяется тип исключения и соответствующий Problem Type
3. **Problem Details Creation**: Создается объект RFC9457ProblemDetails с соответствующими полями
4. **Response Formatting**: Объект сериализуется в JSON с правильным Content-Type
5. **Logging**: Исключение логируется с соответствующим уровнем важности

### Environment-Specific Behavior

**Development Environment:**
- Включение stack trace в поле `extensions.stackTrace`
- Подробные сообщения об ошибках в поле `detail`
- Информация о внутренних исключениях в `extensions.innerException`

**Production Environment:**
- Скрытие технических деталей для внутренних ошибок сервера
- Общие сообщения об ошибках для безопасности
- Полное логирование для диагностики

### Content-Type Headers

- **Primary**: `application/problem+json` (RFC 9457 стандарт)
- **Fallback**: `application/json` (для совместимости)

## Testing Strategy

### Unit Tests

1. **CustomProblemDetailsService Tests**
   - Тестирование создания различных типов Problem Details
   - Проверка правильности маппинга исключений
   - Валидация полей RFC 9457

2. **Middleware Tests**
   - Тестирование обработки различных типов исключений
   - Проверка правильности HTTP статус кодов
   - Валидация Content-Type headers

3. **Model Tests**
   - Тестирование сериализации/десериализации
   - Проверка JSON property names
   - Валидация расширений

### Integration Tests

1. **Controller Error Tests**
   - Тестирование ошибок через HTTP запросы
   - Проверка полного цикла обработки ошибок
   - Валидация ответов клиентами

2. **Validation Error Tests**
   - Тестирование ошибок валидации с множественными полями
   - Проверка формата ValidationProblemDetails
   - Тестирование локализации сообщений

3. **Authentication/Authorization Tests**
   - Тестирование ошибок аутентификации
   - Проверка ошибок авторизации
   - Валидация JWT token errors

### Test Migration Strategy

1. **Existing Test Updates**
   - Обновление assertions для проверки RFC 9457 полей
   - Замена проверок `ErrorResponse` на `ProblemDetails`
   - Обновление JSON parsing логики

2. **New Test Categories**
   - RFC 9457 compliance tests
   - Problem type URI validation tests
   - Content-Type header validation tests

### Backward Compatibility Testing

1. **API Contract Tests**
   - Проверка соответствия OpenAPI спецификации
   - Валидация изменений в API контрактах
   - Тестирование версионирования API

## ASP.NET Core Configuration

### Регистрация сервисов

```csharp
// В Program.cs или Startup.cs
builder.Services.AddProblemDetails(options =>
{
    // Настройка кастомизации ProblemDetails
    options.CustomizeProblemDetails = (context) =>
    {
        // Добавление дополнительных полей
        context.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
        context.ProblemDetails.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
        
        // Установка instance на основе текущего пути
        context.ProblemDetails.Instance = context.HttpContext.Request.Path;
    };
});

// Регистрация кастомного сервиса
builder.Services.AddScoped<ICustomProblemDetailsService, CustomProblemDetailsService>();
```

### Middleware Configuration

```csharp
// В Program.cs
var app = builder.Build();

// Использование встроенного Exception Handler middleware (опционально)
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler();
}

// Или использование кастомного middleware
app.UseMiddleware<Rfc9457ErrorHandlingMiddleware>();

// Включение ProblemDetails для статус кодов
app.UseStatusCodePages();
```

## Implementation Considerations

### Performance Impact

- Минимальное влияние на производительность за счет использования существующей архитектуры middleware
- Эффективная сериализация JSON с помощью System.Text.Json
- Кэширование Problem Type URI для часто используемых типов ошибок

### Security Considerations

- Скрытие внутренних деталей системы в production
- Валидация и санитизация пользовательских данных в сообщениях об ошибках
- Предотвращение утечки конфиденциальной информации через stack traces

### Monitoring and Observability

- Сохранение существующей функциональности логирования
- Добавление метрик для различных типов ошибок
- Интеграция с системами мониторинга через structured logging

