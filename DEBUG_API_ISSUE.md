# Диагностика проблемы с пустым ответом API

## Проблема
Бэкенд успешно обрабатывает запрос логина (статус 200), но возвращает пустой ответ (`ContentLength: null`).

## Внесенные изменения для диагностики

### 1. Настройки JSON сериализации
Добавлены настройки JSON в `Program.cs`:
```csharp
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.WriteIndented = false;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });
```

### 2. Временно отключен RequestLoggingMiddleware
Закомментирован в `Program.cs`:
```csharp
// app.UseMiddleware<RequestLoggingMiddleware>();
```

### 3. Добавлен тестовый эндпоинт
В `AuthController.cs`:
```csharp
[HttpGet("test")]
public ActionResult<object> Test()
{
    return Ok(new { message = "API is working", timestamp = DateTime.UtcNow });
}
```

### 4. Добавлено дополнительное логирование
В метод `Login` добавлены логи для диагностики.

### 5. Обновлен порт в HTTP файле
Изменен с 5051 на 5000 в `GeoQuizApi.http`.

### 6. Создан API тестер
Файл `src/Common/utils/apiTest.ts` для тестирования API из фронтенда.

## Шаги для диагностики

### 1. Перезапустите бэкенд
```bash
cd backend/GeoQuizApi
dotnet run
```

### 2. Протестируйте тестовый эндпоинт
```bash
curl http://localhost:5000/api/auth/test
```
Должен вернуть:
```json
{"message":"API is working","timestamp":"2025-01-20T..."}
```

### 3. Протестируйте логин через HTTP файл
Откройте `backend/GeoQuizApi/GeoQuizApi.http` и выполните:
- Тест 0: GET /api/auth/test
- Тест 2: POST /api/auth/login

### 4. Протестируйте из фронтенда
В консоли браузера:
```javascript
// Импортируйте тестер
import { ApiTester } from './src/Common/utils'

// Запустите тесты
ApiTester.runAllTests()

// Или отдельные тесты
ApiTester.testConnectivity()
ApiTester.testLogin('testhttp@example.com', 'TestPassword123')
```

## Возможные причины проблемы

1. **Middleware конфликт** - RequestLoggingMiddleware может перехватывать ответ
2. **JSON сериализация** - Проблемы с System.Text.Json
3. **CORS** - Хотя CORS работает, могут быть проблемы с заголовками
4. **Модель данных** - Проблемы с сериализацией AuthResponse или UserDto

## Следующие шаги

Если тестовый эндпоинт работает, но логин все еще возвращает пустой ответ:

1. Проверить, что JWT токены генерируются корректно
2. Проверить модели AuthResponse и UserDto на наличие проблем сериализации
3. Добавить больше логирования в контроллер
4. Проверить ErrorHandlingMiddleware на предмет перехвата исключений

## Временное решение

Если проблема критична, можно:
1. Вернуть простой объект вместо AuthResponse
2. Использовать Newtonsoft.Json вместо System.Text.Json
3. Упростить структуру ответа