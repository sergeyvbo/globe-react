# Design Document

## Overview

Данный дизайн описывает обновление фронтенда для правильной обработки ошибок в формате RFC 9457, которые теперь возвращает backend API. Основная задача - обновить все HTTP клиенты и компоненты обработки ошибок для работы с новым форматом, сохранив при этом совместимость с существующим кодом.

Текущая система использует собственные классы ошибок (`AuthServiceError`, `GameStatsApiError`, `LeaderboardApiError`) и парсит ошибки в старом формате с полями `Error`, `Timestamp`, `Path`. Новый формат RFC 9457 содержит поля `type`, `title`, `status`, `detail`, `instance`, и для ошибок валидации - дополнительное поле `errors`.

## Architecture

### Компоненты системы

1. **RFC9457ErrorParser** - централизованный парсер ошибок RFC 9457
2. **ErrorTypeMapper** - маппер типов ошибок RFC 9457 в существующие `AuthErrorType`
3. **HttpClient** - обновленный базовый HTTP клиент с поддержкой RFC 9457
4. **Обновленные сервисы** - AuthService, GameStatsApiService, LeaderboardService
5. **Обновленные компоненты** - AuthModal и другие компоненты с обработкой ошибок

### Архитектурные принципы

- **Централизация**: Единая точка парсинга ошибок RFC 9457
- **Совместимость**: Сохранение существующих интерфейсов и типов ошибок
- **Расширяемость**: Возможность добавления новых типов ошибок
- **Типизация**: Строгая типизация всех моделей ошибок

## Components and Interfaces

### 1. RFC 9457 Problem Details Types

```typescript
// Базовый интерфейс для RFC 9457 Problem Details
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [key: string]: any // Для дополнительных полей
}

// Расширенный интерфейс для ошибок валидации
export interface ValidationProblemDetails extends ProblemDetails {
  errors?: Record<string, string[]>
}

// Тип для всех возможных ошибок RFC 9457
export type RFC9457Error = ProblemDetails | ValidationProblemDetails
```

### 2. RFC9457ErrorParser

```typescript
export class RFC9457ErrorParser {
  /**
   * Парсит ошибку RFC 9457 из ответа API
   */
  static parseError(errorData: any): RFC9457Error {
    // Проверяем, является ли ошибка RFC 9457 форматом
    if (this.isRFC9457Error(errorData)) {
      return errorData as RFC9457Error
    }
    
    // Fallback для старого формата или неожиданных ошибок
    return this.createFallbackError(errorData)
  }
  
  /**
   * Проверяет, является ли объект ошибкой RFC 9457
   */
  private static isRFC9457Error(data: any): boolean {
    return data && 
           typeof data === 'object' && 
           (data.type !== undefined || 
            data.title !== undefined || 
            data.status !== undefined ||
            data.detail !== undefined)
  }
  
  /**
   * Создает fallback ошибку для неожиданных форматов
   */
  private static createFallbackError(errorData: any): ProblemDetails {
    return {
      type: 'about:blank',
      title: 'Unknown Error',
      status: 500,
      detail: errorData?.message || 'An unexpected error occurred',
      instance: window.location.pathname
    }
  }
  
  /**
   * Извлекает сообщение об ошибке для отображения пользователю
   */
  static getDisplayMessage(error: RFC9457Error): string {
    // Приоритет: detail -> title -> fallback
    return error.detail || error.title || 'An error occurred'
  }
  
  /**
   * Извлекает ошибки валидации из ValidationProblemDetails
   */
  static getValidationErrors(error: RFC9457Error): Record<string, string[]> {
    if ('errors' in error && error.errors) {
      return error.errors
    }
    return {}
  }
}
```

### 3. ErrorTypeMapper

```typescript
export class ErrorTypeMapper {
  /**
   * Сопоставляет тип ошибки RFC 9457 с AuthErrorType
   */
  static mapToAuthErrorType(error: RFC9457Error): AuthErrorType {
    const problemType = error.type?.toLowerCase() || ''
    const status = error.status || 500
    
    // Маппинг на основе типа проблемы (независимо от базового URL)
    if (problemType.includes('validation-error')) {
      return AuthErrorType.VALIDATION_ERROR
    }
    
    if (problemType.includes('authentication-error')) {
      // Различаем по статус коду
      return status === 401 ? AuthErrorType.TOKEN_EXPIRED : AuthErrorType.INVALID_CREDENTIALS
    }
    
    if (problemType.includes('conflict-error')) {
      return AuthErrorType.USER_EXISTS
    }
    
    if (problemType.includes('authorization-error')) {
      return AuthErrorType.TOKEN_EXPIRED
    }
    
    // Маппинг на основе HTTP статус кода
    switch (status) {
      case 401:
        return AuthErrorType.TOKEN_EXPIRED
      case 409:
        return AuthErrorType.USER_EXISTS
      case 422:
        return AuthErrorType.VALIDATION_ERROR
      default:
        return AuthErrorType.NETWORK_ERROR
    }
  }
  
  /**
   * Создает детали ошибки для совместимости с существующим кодом
   */
  static createErrorDetails(error: RFC9457Error): any {
    const details: any = {
      status: error.status,
      type: error.type,
      title: error.title,
      detail: error.detail,
      instance: error.instance
    }
    
    // Добавляем ошибки валидации если есть
    const validationErrors = RFC9457ErrorParser.getValidationErrors(error)
    if (Object.keys(validationErrors).length > 0) {
      details.errors = validationErrors
    }
    
    return details
  }
}
```

### 4. Обновленный HttpClient

```typescript
class HttpClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/problem+json, application/json', // Поддержка RFC 9457
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }
    
    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        // Парсим ошибку в формате RFC 9457
        const errorData = await response.json().catch(() => ({}))
        const rfc9457Error = RFC9457ErrorParser.parseError(errorData)
        
        throw this.createServiceError(rfc9457Error, response.status)
      }
      
      return await response.json()
    } catch (error) {
      if (error instanceof AuthServiceError || 
          error instanceof GameStatsApiError || 
          error instanceof LeaderboardApiError) {
        throw error
      }
      
      // Network или другие ошибки
      const networkError: ProblemDetails = {
        type: 'about:blank',
        title: 'Network Error',
        status: 0,
        detail: 'Network error occurred. Please check your connection.',
        instance: endpoint
      }
      
      throw this.createServiceError(networkError, 0)
    }
  }
  
  /**
   * Создает соответствующий тип ошибки сервиса
   */
  private static createServiceError(
    rfc9457Error: RFC9457Error, 
    status: number
  ): AuthServiceError | GameStatsApiError | LeaderboardApiError {
    const authErrorType = ErrorTypeMapper.mapToAuthErrorType(rfc9457Error)
    const message = RFC9457ErrorParser.getDisplayMessage(rfc9457Error)
    const details = ErrorTypeMapper.createErrorDetails(rfc9457Error)
    
    // Определяем тип ошибки по контексту (можно передать как параметр)
    // Для простоты используем AuthServiceError как базовый
    return new AuthServiceError({
      type: authErrorType,
      message,
      details
    })
  }
}
```

### 5. Обновленные классы ошибок

Существующие классы ошибок остаются без изменений для совместимости:

```typescript
// AuthServiceError, GameStatsApiError, LeaderboardApiError остаются как есть
// Только обновляется логика их создания в HttpClient
```

## Data Models

### RFC 9457 Error Response Format

Новый формат ответа об ошибке от backend:

```json
{
  "type": "http://localhost:5000/problems/validation-error",
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

### Mapping от RFC 9457 к существующим типам

| RFC 9457 Type Pattern | HTTP Status | AuthErrorType | Описание |
|----------------------|-------------|---------------|----------|
| `*validation-error*` | 422 | `VALIDATION_ERROR` | Ошибки валидации |
| `*authentication-error*` | 401 | `TOKEN_EXPIRED` | Истек токен |
| `*authentication-error*` | 400 | `INVALID_CREDENTIALS` | Неверные учетные данные |
| `*conflict-error*` | 409 | `USER_EXISTS` | Пользователь уже существует |
| `*authorization-error*` | 403 | `TOKEN_EXPIRED` | Нет доступа |
| `*not-found-error*` | 404 | `NETWORK_ERROR` | Ресурс не найден |
| Любой другой | * | `NETWORK_ERROR` | Fallback |

### Обработка ошибок валидации

Для ошибок валидации RFC 9457 предоставляет структурированные данные:

```typescript
// Пример обработки в AuthModal
const handleValidationError = (error: AuthServiceError) => {
  if (error.type === AuthErrorType.VALIDATION_ERROR && error.details?.errors) {
    const validationErrors: ValidationErrors = {}
    
    // Преобразуем RFC 9457 errors в формат для UI
    Object.entries(error.details.errors).forEach(([field, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        validationErrors[field] = messages[0] // Берем первое сообщение
      }
    })
    
    setValidationErrors(validationErrors)
  }
}
```

## Error Handling

### Централизованная обработка ошибок

1. **HTTP Response Processing**: Все HTTP ответы проходят через `RFC9457ErrorParser`
2. **Error Type Mapping**: `ErrorTypeMapper` сопоставляет типы ошибок
3. **Service Error Creation**: Создаются соответствующие классы ошибок сервисов
4. **Component Error Handling**: Компоненты обрабатывают ошибки как раньше

### Обратная совместимость

- Существующие классы ошибок (`AuthServiceError`, etc.) остаются неизменными
- Существующие компоненты продолжают работать с теми же интерфейсами
- Добавляется поддержка новых полей в `details` для расширенной информации

### Content-Type Headers

- **Primary**: `application/problem+json` (RFC 9457 стандарт)
- **Fallback**: `application/json` (для совместимости)
- **Accept Header**: `application/problem+json, application/json`

## Testing Strategy

### Unit Tests

1. **RFC9457ErrorParser Tests**
   - Тестирование парсинга различных форматов ошибок
   - Проверка fallback логики для неожиданных форматов
   - Валидация извлечения сообщений и ошибок валидации

2. **ErrorTypeMapper Tests**
   - Тестирование маппинга всех типов ошибок RFC 9457
   - Проверка fallback логики для неизвестных типов
   - Валидация создания деталей ошибок

3. **HttpClient Tests**
   - Тестирование обработки ответов RFC 9457
   - Проверка создания правильных типов ошибок
   - Валидация заголовков Accept

### Integration Tests

1. **Service Tests**
   - Обновление моков для возврата ошибок RFC 9457
   - Тестирование полного цикла обработки ошибок
   - Проверка совместимости с существующими тестами

2. **Component Tests**
   - Тестирование отображения ошибок валидации
   - Проверка обработки различных типов ошибок
   - Валидация пользовательских сообщений

### Test Migration Strategy

1. **Mock Updates**
   - Обновление моков API для возврата RFC 9457 формата
   - Сохранение существующих тестовых сценариев
   - Добавление новых тестов для RFC 9457 специфичных случаев

2. **Assertion Updates**
   - Минимальные изменения в существующих тестах
   - Фокус на тестировании новой функциональности
   - Обеспечение обратной совместимости

## Implementation Considerations

### Performance Impact

- Минимальное влияние на производительность
- Дополнительный парсинг только для ошибок
- Кэширование маппинга типов ошибок

### Security Considerations

- Валидация входящих данных ошибок
- Предотвращение XSS через сообщения об ошибках
- Санитизация пользовательских данных в ошибках

### Monitoring and Observability

- Логирование ошибок RFC 9457 для отладки
- Метрики для различных типов ошибок
- Отслеживание fallback случаев

### Migration Path

1. **Phase 1**: Добавление поддержки RFC 9457 с fallback
2. **Phase 2**: Обновление тестов и компонентов
3. **Phase 3**: Удаление fallback логики (опционально)

Этот подход обеспечивает плавный переход с минимальными изменениями в существующем коде, сохраняя при этом полную функциональность и совместимость.