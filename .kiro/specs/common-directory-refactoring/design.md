# Документ проектирования рефакторинга директории Common

## Обзор

Данный документ описывает проектирование рефакторинга директории `src/Common` для улучшения организации кода путем разделения файлов по функциональным областям. Цель - создать четкую структуру директорий, которая упростит навигацию и поддержку кода, сохранив при этом все существующие функциональности.

## Архитектура

### Текущая структура
```
src/Common/
├── GeoData/           # Географические данные (сохраняется)
├── LOD/               # Level of Detail данные (сохраняется)
├── AuthContext.tsx    # Контекст аутентификации
├── AuthService.ts     # Сервис аутентификации
├── OAuth2Service.ts   # OAuth2 сервис
├── AuthModal.tsx      # Модальное окно аутентификации
├── ProtectedRoute.tsx # Защищенные маршруты
├── UserProfile.tsx    # Профиль пользователя
├── GameProgressService.ts # Сервис прогресса игр
├── SessionDemo.tsx    # Демо сессий
├── types.ts           # Общие типы
├── utils.ts           # Общие утилиты
├── defaults.ts        # Константы по умолчанию
└── [тестовые файлы]
```

### Новая структура
```
src/Common/
├── Auth/              # Модуль аутентификации
│   ├── index.ts       # Публичный API
│   ├── AuthContext.tsx
│   ├── AuthService.ts
│   ├── OAuth2Service.ts
│   ├── AuthModal.tsx
│   ├── ProtectedRoute.tsx
│   ├── OAuth2CallbackHandler.tsx
│   ├── useOAuth2.ts
│   └── [тестовые файлы]
├── UserProfile/       # Модуль профиля пользователя
│   ├── index.ts
│   ├── UserProfile.tsx
│   └── [тестовые файлы]
├── GameProgress/      # Модуль прогресса игр
│   ├── index.ts
│   ├── GameProgressService.ts
│   └── [тестовые файлы]
├── Session/           # Модуль управления сессиями
│   ├── index.ts
│   ├── SessionDemo.tsx
│   └── [тестовые файлы]
├── GeoData/           # Географические данные (без изменений)
├── LOD/               # Level of Detail данные (без изменений)
├── types.ts           # Общие типы (остается в корне)
├── utils.ts           # Общие утилиты (остается в корне)
└── defaults.ts        # Константы по умолчанию (остается в корне)
```

## Компоненты и интерфейсы

### Модуль Auth
**Назначение:** Управление аутентификацией пользователей, включая OAuth2 и обычную аутентификацию.

**Публичный API (`Auth/index.ts`):**
```typescript
export { AuthProvider, useAuth } from './AuthContext'
export { AuthModal } from './AuthModal'
export { ProtectedRoute } from './ProtectedRoute'
export { OAuth2CallbackHandler } from './OAuth2CallbackHandler'
export { useOAuth2 } from './useOAuth2'
export { authService } from './AuthService'
```

**Внутренние зависимости:**
- `AuthContext.tsx` → `AuthService.ts`, `GameProgressService.ts`
- `AuthService.ts` → `OAuth2Service.ts`
- `AuthModal.tsx` → `AuthContext.tsx`

### Модуль UserProfile
**Назначение:** Управление профилем пользователя.

**Публичный API (`UserProfile/index.ts`):**
```typescript
export { UserProfile } from './UserProfile'
```

### Модуль GameProgress
**Назначение:** Отслеживание и управление прогрессом игр.

**Публичный API (`GameProgress/index.ts`):**
```typescript
export { gameProgressService, GameSession } from './GameProgressService'
```

### Модуль Session
**Назначение:** Демонстрация и управление сессиями.

**Публичный API (`Session/index.ts`):**
```typescript
export { SessionDemo } from './SessionDemo'
```

## Модели данных

Все типы данных остаются в файле `src/Common/types.ts` без изменений, так как они используются во всех модулях:

- `User` - модель пользователя
- `AuthContextType` - тип контекста аутентификации
- `AuthResponse` - ответ аутентификации
- `GameProgress` - прогресс игры
- `CountryQuizSettings` - настройки викторины
- И другие общие типы

## Обработка ошибок

Обработка ошибок остается без изменений в каждом модуле. Каждый модуль сохраняет свою логику обработки ошибок:

- `AuthService` - обработка ошибок аутентификации
- `GameProgressService` - обработка ошибок сохранения прогресса
- Компоненты React - обработка ошибок UI

## Стратегия тестирования

Все существующие тесты перемещаются вместе с соответствующими файлами в новые директории:

1. **Тесты Auth модуля:**
   - `AuthContext.test.tsx`
   - `AuthService.test.ts`
   - `OAuth2Service.test.ts`
   - `AuthModal.test.tsx`

2. **Тесты UserProfile модуля:**
   - `UserProfile.test.tsx`

3. **Тесты GameProgress модуля:**
   - `GameProgressService.test.ts`

4. **Тесты Session модуля:**
   - `SessionManagement.test.tsx`

Все тесты должны продолжать работать без изменений после обновления путей импорта.

## Миграция импортов

### Текущие импорты (примеры):
```typescript
import { useAuth } from '../Common/AuthContext'
import { AuthModal } from '../Common/AuthModal'
import { gameProgressService } from '../Common/GameProgressService'
import { UserProfile } from '../Common/UserProfile'
```

### Новые импорты:
```typescript
import { useAuth, AuthModal } from '../Common/Auth'
import { gameProgressService } from '../Common/GameProgress'
import { UserProfile } from '../Common/UserProfile'
```

### Общие файлы остаются без изменений:
```typescript
import { getSettings } from '../Common/utils'
import { CountryOption } from '../Common/types'
```

## Обратная совместимость

Для обеспечения плавной миграции можно создать временные реэкспорты в корне `src/Common/index.ts`:

```typescript
// Временные реэкспорты для обратной совместимости
export * from './Auth'
export * from './UserProfile'
export * from './GameProgress'
export * from './Session'
export * from './types'
export * from './utils'
export * from './defaults'
```

Это позволит существующим импортам продолжать работать во время постепенной миграции.