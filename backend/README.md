# GeoQuiz Backend API

## Настройка базы данных

### Локальная разработка

1. **Автоматическая настройка**: При первом запуске приложения база данных SQLite будет создана автоматически с применением всех миграций.

2. **Тестовые данные**: В режиме разработки автоматически создаются тестовые пользователи:
   - `test@example.com` / `password123`
   - `admin@example.com` / `admin123`

### Команды Entity Framework

```bash
# Создать новую миграцию
dotnet ef migrations add <MigrationName>

# Применить миграции
dotnet ef database update

# Откатить к предыдущей миграции
dotnet ef database update <PreviousMigrationName>

# Удалить последнюю миграцию (если не применена)
dotnet ef migrations remove
```

### Структура базы данных

- **Users** - пользователи системы
- **GameSessions** - игровые сессии с результатами
- **RefreshTokens** - токены для обновления JWT

### Файлы базы данных

Файлы SQLite (*.db, *.db-shm, *.db-wal) исключены из Git и создаются локально для каждого разработчика.

## Запуск

```bash
cd backend/GeoQuizApi
dotnet run
```

База данных будет создана автоматически при первом запуске.