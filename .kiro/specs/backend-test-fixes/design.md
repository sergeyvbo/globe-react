# Design Document

## Overview

Данный дизайн направлен на решение проблем с тестами в backend части приложения GeoQuiz. Основные проблемы включают:

1. **Конфликты данных между тестами** - тесты влияют друг на друга через общие данные в базе
2. **Race conditions** - параллельная вставка данных с одинаковыми временными метками
3. **Недостаточная изоляция** - тесты не имеют полной изоляции друг от друга
4. **Проблемы с очисткой данных** - неправильный порядок удаления данных с учетом foreign key constraints

Решение основано на улучшении существующей архитектуры тестов с использованием in-memory баз данных и добавлении механизмов для обеспечения изоляции и стабильности.

## Architecture

### Current Architecture Issues

Текущая архитектура имеет следующие проблемы:

1. **TestWebApplicationFactory** создает уникальную базу данных для каждого тестового класса, но использует `Guid.NewGuid()` в имени, что может привести к конфликтам
2. **BaseIntegrationTest** имеет метод `ClearDatabaseAsync()`, но он не всегда вызывается корректно
3. **Unit тесты** создают свои собственные in-memory базы данных, но могут иметь проблемы с изоляцией
4. **Race conditions** возникают из-за использования `DateTime.UtcNow` без учета уникальности временных меток

### Improved Architecture

Новая архитектура будет включать:

1. **Enhanced Test Database Isolation** - улучшенная изоляция баз данных для тестов
2. **Deterministic Timestamp Generation** - детерминированная генерация временных меток
3. **Robust Data Cleanup** - надежная система очистки данных
4. **Race Condition Prevention** - предотвращение race conditions

## Components and Interfaces

### 1. Enhanced TestWebApplicationFactory

```csharp
public class TestWebApplicationFactory<TStartup> : WebApplicationFactory<TStartup> where TStartup : class
{
    private static readonly object _lock = new object();
    private static int _databaseCounter = 0;
    
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Создание уникального имени базы данных с использованием счетчика и временной метки
        var databaseName = GenerateUniqueDatabaseName();
        
        // Остальная конфигурация...
    }
    
    private string GenerateUniqueDatabaseName()
    {
        lock (_lock)
        {
            return $"TestDb_{typeof(TStartup).Name}_{++_databaseCounter}_{DateTime.UtcNow.Ticks}";
        }
    }
}
```

### 2. Enhanced BaseIntegrationTest

```csharp
public abstract class BaseIntegrationTest : IClassFixture<TestWebApplicationFactory<Program>>, IAsyncLifetime
{
    protected readonly TestWebApplicationFactory<Program> _factory;
    protected readonly HttpClient _client;
    private readonly SemaphoreSlim _cleanupSemaphore = new SemaphoreSlim(1, 1);

    protected BaseIntegrationTest(TestWebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    public virtual async Task InitializeAsync()
    {
        await ClearDatabaseAsync();
        _client.DefaultRequestHeaders.Authorization = null;
    }

    public virtual Task DisposeAsync()
    {
        return Task.CompletedTask;
    }

    protected async Task ClearDatabaseAsync()
    {
        await _cleanupSemaphore.WaitAsync();
        try
        {
            // Улучшенная логика очистки
        }
        finally
        {
            _cleanupSemaphore.Release();
        }
    }
}
```

### 3. TestDataBuilder Utility

```csharp
public static class TestDataBuilder
{
    private static readonly object _timestampLock = new object();
    private static long _timestampCounter = 0;

    public static DateTime GenerateUniqueTimestamp(DateTime baseTime)
    {
        lock (_timestampLock)
        {
            return baseTime.AddTicks(++_timestampCounter);
        }
    }

    public static string GenerateUniqueEmail(string prefix = "test")
    {
        return $"{prefix}_{Guid.NewGuid():N}@example.com";
    }
}
```

### 4. Enhanced Unit Test Base

```csharp
public abstract class BaseUnitTest : IDisposable
{
    protected readonly GeoQuizDbContext _context;
    private static readonly object _dbLock = new object();
    private static int _dbCounter = 0;

    protected BaseUnitTest()
    {
        var databaseName = GenerateUniqueDatabaseName();
        var options = new DbContextOptionsBuilder<GeoQuizDbContext>()
            .UseInMemoryDatabase(databaseName: databaseName)
            .EnableSensitiveDataLogging()
            .Options;
        
        _context = new GeoQuizDbContext(options);
    }

    private string GenerateUniqueDatabaseName()
    {
        lock (_dbLock)
        {
            return $"UnitTestDb_{GetType().Name}_{++_dbCounter}_{DateTime.UtcNow.Ticks}";
        }
    }

    public virtual void Dispose()
    {
        _context?.Dispose();
    }
}
```

## Data Models

### Database Cleanup Strategy

Порядок очистки данных с учетом foreign key constraints:

1. **GameSessions** (зависит от Users)
2. **RefreshTokens** (зависит от Users)  
3. **Users** (основная таблица)

### Timestamp Management

Для предотвращения race conditions с временными метками:

```csharp
public class TimestampManager
{
    private static readonly object _lock = new object();
    private static DateTime _lastTimestamp = DateTime.MinValue;

    public static DateTime GetUniqueTimestamp()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            if (now <= _lastTimestamp)
            {
                _lastTimestamp = _lastTimestamp.AddTicks(1);
                return _lastTimestamp;
            }
            _lastTimestamp = now;
            return now;
        }
    }
}
```

## Error Handling

### Database Cleanup Error Handling

```csharp
protected async Task ClearDatabaseAsync()
{
    using var scope = _factory.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<GeoQuizDbContext>();
    
    try
    {
        // Попытка очистки в правильном порядке
        await ClearTablesInOrder(context);
    }
    catch (Exception ex)
    {
        _logger.LogWarning(ex, "Failed to clear database tables, attempting full recreation");
        
        try
        {
            // Полное пересоздание базы данных
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
        }
        catch (Exception recreateEx)
        {
            _logger.LogError(recreateEx, "Failed to recreate database");
            // Продолжаем выполнение тестов
        }
    }
}
```

### Race Condition Detection and Prevention

Для выявления потенциальных race conditions в продакшене:

1. **Анализ кода** - поиск мест одновременной вставки данных с временными метками
2. **Логирование** - добавление логов для отслеживания проблем
3. **Уникальные индексы** - использование составных индексов для предотвращения дубликатов

## Testing Strategy

### Unit Tests Improvements

1. **Изоляция** - каждый тест получает свою уникальную базу данных
2. **Детерминированные данные** - использование фиксированных временных меток для предсказуемости
3. **Мокирование внешних зависимостей** - полная изоляция от внешних сервисов

### Integration Tests Improvements

1. **Уникальные пользователи** - каждый тест создает пользователей с уникальными email
2. **Временная изоляция** - использование базового времени с инкрементами
3. **Очистка состояния** - автоматическая очистка между тестами
4. **Синхронизация** - использование семафоров для предотвращения конфликтов

### Test Data Management

```csharp
public class TestDataManager
{
    private readonly DateTime _baseTime;
    private int _userCounter = 0;
    private int _sessionCounter = 0;

    public TestDataManager()
    {
        _baseTime = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    public string CreateUniqueEmail() => $"test_{++_userCounter}_{Guid.NewGuid():N}@example.com";
    
    public DateTime CreateUniqueTimestamp() => _baseTime.AddMinutes(++_sessionCounter);
}
```

### Performance Considerations

1. **Параллельное выполнение** - тесты могут выполняться параллельно без конфликтов
2. **Минимальные задержки** - устранение необходимости в `Task.Delay`
3. **Эффективная очистка** - быстрая очистка данных без полного пересоздания базы

### Monitoring and Diagnostics

1. **Детальное логирование** - логирование всех операций с базой данных в тестах
2. **Метрики производительности** - отслеживание времени выполнения тестов
3. **Диагностика ошибок** - подробная информация об ошибках для быстрого исправления

## Production Race Condition Analysis

### Potential Issues in Production

1. **Concurrent User Registration** - одновременная регистрация пользователей с одинаковыми email
2. **Simultaneous Game Sessions** - создание игровых сессий с одинаковыми временными метками
3. **Token Refresh Conflicts** - конфликты при обновлении refresh токенов

### Recommended Solutions

1. **Database Constraints** - уникальные индексы на критичные поля
2. **Application-Level Locking** - использование семафоров для критичных операций
3. **Optimistic Concurrency** - использование версионирования для предотвращения конфликтов
4. **Retry Mechanisms** - автоматические повторы при конфликтах