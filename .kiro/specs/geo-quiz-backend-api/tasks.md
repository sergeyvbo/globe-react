# Implementation Plan

- [x] 1. Создать базовую структуру ASP.NET Core проекта






  - Создать папку `backend` в корне проекта (на том же уровне что и `src`)
  - Создать новый ASP.NET Core Web API проект с именем GeoQuizApi в папке `backend/GeoQuizApi`
  - Настроить базовую структуру папок (Controllers, Models, Services, Data)
  - Добавить необходимые NuGet пакеты (Entity Framework, JWT, BCrypt, Serilog)
  - Настроить базовую конфигурацию в Program.cs
  - _Requirements: 6.1, 7.3_

- [x] 2. Настроить Entity Framework и модели данных





  - [x] 2.1 Создать DbContext и настроить подключение к SQLite


    - Создать GeoQuizDbContext класс с настройкой SQLite
    - Настроить connection string в appsettings.json
    - Добавить DbContext в DI контейнер
    - _Requirements: 6.1, 6.2_

  - [x] 2.2 Создать entity модели для базы данных


    - Создать User entity с необходимыми свойствами и навигацией
    - Создать GameSession entity для хранения игровых сессий
    - Создать RefreshToken entity для управления токенами
    - Настроить relationships между entities в DbContext
    - _Requirements: 2.1, 4.1, 3.1_

  - [x] 2.3 Создать и применить первоначальные миграции


    - Создать initial migration для всех entities
    - Настроить автоматическое применение миграций при запуске
    - Добавить seed data для тестирования (опционально)
    - _Requirements: 6.1, 6.3_

- [x] 3. Реализовать систему аутентификации





  - [x] 3.1 Создать JWT конфигурацию и сервисы


    - Создать JwtSettings класс для конфигурации токенов
    - Реализовать JWT token generation и validation логику
    - Настроить JWT authentication middleware в Program.cs
    - _Requirements: 1.1, 1.2, 3.1_

  - [x] 3.2 Реализовать AuthService для бизнес-логики аутентификации


    - Создать IAuthService интерфейс с методами регистрации и входа
    - Реализовать AuthService с password hashing через BCrypt
    - Добавить методы для работы с refresh токенами
    - Реализовать валидацию email и password
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.4_

  - [x] 3.3 Создать AuthController с endpoints для аутентификации


    - Реализовать POST /api/auth/register endpoint
    - Реализовать POST /api/auth/login endpoint
    - Реализовать POST /api/auth/refresh endpoint для обновления токенов
    - Реализовать POST /api/auth/logout endpoint
    - Добавить валидацию входящих данных с помощью Data Annotations
    - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_

- [x] 4. Реализовать управление профилем пользователя





  - [x] 4.1 Добавить endpoints для работы с профилем в AuthController



    - Реализовать GET /api/auth/me endpoint для получения текущего пользователя
    - Реализовать PUT /api/auth/profile endpoint для обновления профиля
    - Реализовать PUT /api/auth/change-password endpoint для смены пароля
    - Добавить authorization middleware для защищенных endpoints
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Создать DTOs для запросов и ответов аутентификации


    - Создать LoginRequest, RegisterRequest DTOs
    - Создать AuthResponse, UserDto DTOs
    - Создать UpdateProfileRequest, ChangePasswordRequest DTOs
    - Настроить автоматический mapping между entities и DTOs
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [ ] 5. Реализовать систему игровой статистики
  - [ ] 5.1 Создать GameStatsService для бизнес-логики статистики
    - Создать IGameStatsService интерфейс с методами сохранения и получения статистики
    - Реализовать GameStatsService с логикой агрегации данных
    - Добавить методы для расчета accuracy, streaks и других метрик
    - Реализовать логику миграции анонимного прогресса
    - _Requirements: 4.1, 4.2, 4.3, 8.4_

  - [ ] 5.2 Создать GameStatsController с endpoints для статистики
    - Реализовать POST /api/game-stats endpoint для сохранения игровой сессии
    - Реализовать GET /api/game-stats/me endpoint для получения агрегированной статистики
    - Реализовать GET /api/game-stats/me/history endpoint для истории игр
    - Реализовать POST /api/game-stats/migrate endpoint для миграции анонимного прогресса
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 5.3 Создать DTOs для игровой статистики
    - Создать GameSessionRequest DTO для сохранения игровых сессий
    - Создать GameStatsResponse DTO для агрегированной статистики
    - Создать GameHistoryResponse DTO для истории игр
    - Создать MigrateProgressRequest DTO для миграции анонимного прогресса
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Реализовать систему списка лидеров
  - [ ] 6.1 Создать LeaderboardService для бизнес-логики рейтингов
    - Создать ILeaderboardService интерфейс с методами получения рейтингов
    - Реализовать LeaderboardService с логикой формирования топов
    - Добавить поддержку фильтрации по типу игры и периоду времени
    - Реализовать кэширование результатов рейтинга
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Создать LeaderboardController с endpoints для рейтингов
    - Реализовать GET /api/leaderboard endpoint для глобального рейтинга
    - Реализовать GET /api/leaderboard/game-type/{type} endpoint для рейтинга по типу игры
    - Реализовать GET /api/leaderboard/period/{period} endpoint для рейтинга по периоду
    - Добавить поддержку pagination для больших списков
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.3 Создать DTOs для системы лидеров
    - Создать LeaderboardEntry DTO для записи в рейтинге
    - Создать LeaderboardResponse DTO для ответа с рейтингом
    - Добавить поддержку отображения позиции текущего пользователя
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Настроить обработку ошибок и логирование
  - [ ] 7.1 Создать middleware для обработки ошибок
    - Создать ErrorHandlingMiddleware для глобальной обработки исключений
    - Настроить стандартизированный формат ответов об ошибках
    - Добавить логирование ошибок с соответствующими уровнями
    - Настроить различное поведение для development и production
    - _Requirements: 6.2, 7.1, 7.2_

  - [ ] 7.2 Настроить Serilog для логирования
    - Настроить Serilog с выводом в консоль и файлы
    - Создать RequestLoggingMiddleware для логирования HTTP запросов
    - Настроить структурированное логирование с контекстом
    - Добавить логирование операций аутентификации (без паролей)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 8. Настроить CORS и безопасность
  - [ ] 8.1 Настроить CORS для React приложения
    - Настроить CORS policy для development и production окружений
    - Добавить поддержку preflight OPTIONS запросов
    - Настроить разрешенные headers и methods для API
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 8.2 Добавить дополнительные меры безопасности
    - Настроить HTTPS redirect middleware для production
    - Добавить security headers (HSTS, X-Frame-Options, etc.)
    - Настроить rate limiting для authentication endpoints
    - Добавить input validation и sanitization
    - _Requirements: 6.4, 1.3, 1.4, 1.5_

- [ ] 9. Создать конфигурацию и документацию API
  - [ ] 9.1 Настроить Swagger/OpenAPI документацию
    - Добавить Swagger генерацию для всех endpoints
    - Настроить JWT authentication в Swagger UI
    - Добавить описания и примеры для всех DTOs
    - Настроить группировку endpoints по контроллерам
    - _Requirements: 1.1, 2.1, 4.1, 5.1_

  - [ ] 9.2 Создать конфигурационные файлы для разных окружений
    - Настроить appsettings.json для development
    - Создать appsettings.Production.json для production
    - Добавить environment variables для sensitive данных
    - Настроить database connection strings для разных окружений
    - _Requirements: 6.1, 7.3, 9.3, 9.4_

- [ ] 10. Написать unit и integration тесты
  - [ ] 10.1 Создать unit тесты для сервисов
    - Написать тесты для AuthService с моками зависимостей
    - Написать тесты для GameStatsService с проверкой бизнес-логики
    - Написать тесты для LeaderboardService с различными сценариями
    - Настроить test fixtures и mock данные
    - _Requirements: 1.1, 1.2, 4.1, 5.1_

  - [ ] 10.2 Создать integration тесты для API endpoints
    - Написать тесты для AuthController endpoints с реальной БД
    - Написать тесты для GameStatsController с проверкой сохранения данных
    - Написать тесты для LeaderboardController с проверкой рейтингов
    - Настроить in-memory database для тестов
    - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [ ] 11. Подготовить проект к развертыванию
  - [ ] 11.1 Создать Docker конфигурацию
    - Создать Dockerfile для контейнеризации приложения
    - Создать docker-compose.yml для локальной разработки
    - Настроить multi-stage build для оптимизации размера образа
    - _Requirements: 6.1, 7.3_

  - [ ] 11.2 Создать скрипты развертывания и миграций
    - Создать скрипт для автоматического применения миграций
    - Настроить health check endpoints для мониторинга
    - Создать README с инструкциями по запуску и развертыванию
    - _Requirements: 6.1, 6.3, 7.3_