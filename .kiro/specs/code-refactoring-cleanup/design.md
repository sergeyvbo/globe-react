# Design Document

## Overview

Данный документ описывает архитектуру и подход к комплексному рефакторингу кодовой базы проекта GeoQuiz. На основе анализа кода выявлены основные области для улучшения: дублирование логики между quiz компонентами, повторяющиеся паттерны сохранения прогресса, избыточные UI компоненты и возможности для оптимизации типизации.

## Architecture

### Current State Analysis

Проект имеет следующие основные проблемы:

1. **Дублирование логики между Quiz компонентами**: CountryQuiz, FlagQuiz и StateQuiz содержат практически идентичную логику для:
   - Автосохранения прогресса (`autoSaveProgress`)
   - Обработки онлайн/офлайн состояний
   - Управления игровыми сессиями
   - Отображения индикаторов сохранения

2. **Повторяющиеся UI паттерны**: Все quiz компоненты используют одинаковые:
   - Save Status Indicator компоненты
   - OfflineIndicator компоненты
   - Обработчики beforeunload событий

3. **Неоптимальные импорты**: Использование deprecated Grid компонента из MUI
4. **Избыточная типизация**: Некоторые типы можно объединить или упростить

### Target Architecture

Рефакторинг будет основан на следующих принципах:

1. **Создание общих хуков**: Выделение повторяющейся логики в переиспользуемые хуки
2. **Компонентная архитектура**: Создание общих UI компонентов
3. **Базовый Quiz компонент**: Создание абстрактного базового компонента для всех quiz типов
4. **Оптимизация импортов**: Замена deprecated компонентов и оптимизация bundle size

## Components and Interfaces

### 1. Shared Hooks

#### useGameProgress Hook
```typescript
interface UseGameProgressOptions {
  gameType: GameType
  correctScore: number
  wrongScore: number
  isAuthenticated: boolean
  user: User | null
  isOffline: boolean
}

interface UseGameProgressReturn {
  isSaving: boolean
  saveError: string | null
  autoSaveProgress: () => Promise<void>
}
```

Объединяет всю логику автосохранения, включая:
- Периодическое сохранение каждые 30 секунд
- Сохранение при изменении счета
- Обработка онлайн/офлайн состояний
- Миграция временного прогресса при аутентификации

#### useBeforeUnload Hook
```typescript
interface UseBeforeUnloadOptions {
  shouldSave: boolean
  gameSession: GameSession
  isAuthenticated: boolean
  user: User | null
}
```

Обрабатывает сохранение прогресса при закрытии страницы.

### 2. Shared UI Components

#### SaveStatusIndicator Component
```typescript
interface SaveStatusIndicatorProps {
  isSaving: boolean
  saveError: string | null
}
```

Заменяет дублированный код индикатора сохранения во всех quiz компонентах.

#### QuizLayout Component
```typescript
interface QuizLayoutProps {
  children: React.ReactNode
  menuComponent: React.ReactNode
  scoreComponent: React.ReactNode
  showOfflineIndicator?: boolean
  showSaveIndicator?: boolean
  isSaving?: boolean
  saveError?: string | null
}
```

Общий layout для всех quiz компонентов.

### 3. Base Quiz Component

#### BaseQuiz Hook
```typescript
interface BaseQuizState {
  correctScore: number
  wrongScore: number
  disabled: boolean
  gameSession: GameSession
}

interface BaseQuizActions {
  onCorrectAnswer: () => void
  onWrongAnswer: () => void
  resetGame: () => void
  setDisabled: (disabled: boolean) => void
}

interface UseBaseQuizReturn extends BaseQuizState {
  actions: BaseQuizActions
  gameProgress: UseGameProgressReturn
}
```

Базовая логика для всех quiz компонентов.

### 4. Optimized Imports

Замена deprecated и неэффективных импортов:
- `Grid` → `Grid2` из MUI
- Оптимизация импортов из больших библиотек
- Удаление неиспользуемых импортов

## Data Models

### Unified Quiz Configuration
```typescript
interface QuizConfig {
  gameType: GameType
  optionsSize: number
  showFlags: boolean
  dataSource: string // path to JSON data
  getRandomOptions: (data: any[], difficulty?: Difficulty) => any[]
}
```

### Simplified Game Session
```typescript
// Упрощение существующего GameSession интерфейса
interface GameSession {
  gameType: GameType
  correctAnswers: number
  wrongAnswers: number
  sessionStartTime: Date
  sessionEndTime?: Date
}
```

## Error Handling

### Centralized Error Handling
Создание централизованной системы обработки ошибок для:
- Ошибок сохранения прогресса
- Сетевых ошибок
- Ошибок загрузки данных

### Error Boundary Enhancement
Улучшение существующих Error Boundary компонентов для лучшего UX.

## Testing Strategy

### Test Refactoring Approach
1. **Сохранение существующих тестов**: Все текущие тесты должны продолжать работать
2. **Создание тестов для новых хуков**: Покрытие новых shared хуков
3. **Интеграционные тесты**: Тестирование взаимодействия между рефакторенными компонентами
4. **Performance тесты**: Проверка улучшения производительности

### Test Utilities
Создание общих test utilities для:
- Мокирования game progress service
- Симуляции онлайн/офлайн состояний
- Тестирования quiz логики

## Performance Optimizations

### Bundle Size Reduction
1. **Tree-shaking оптимизация**: Импорт только необходимых частей библиотек
2. **Code splitting**: Разделение кода по quiz типам
3. **Lazy loading**: Ленивая загрузка компонентов

### Runtime Performance
1. **React.memo**: Мемоизация компонентов, которые часто перерендериваются
2. **useMemo/useCallback**: Оптимизация вычислений и функций
3. **Debouncing**: Оптимизация частых операций сохранения

### Memory Optimization
1. **Cleanup effects**: Правильная очистка event listeners и intervals
2. **Ref optimization**: Использование refs вместо state где возможно

## Migration Strategy

### Phase 1: Shared Utilities
1. Создание shared hooks (useGameProgress, useBeforeUnload)
2. Создание shared UI components (SaveStatusIndicator, QuizLayout)
3. Тестирование новых компонентов

### Phase 2: Quiz Components Refactoring
1. Рефакторинг CountryQuiz с использованием новых shared компонентов
2. Рефакторинг FlagQuiz
3. Рефакторинг StateQuiz
4. Проверка функциональности и тестов

### Phase 3: Import Optimization
1. Замена deprecated импортов
2. Оптимизация bundle size
3. Удаление неиспользуемого кода

### Phase 4: Type System Enhancement
1. Упрощение и объединение типов
2. Улучшение строгости типизации
3. Создание utility types

## Backward Compatibility

Все изменения должны быть обратно совместимыми:
- Существующие API не изменяются
- Все тесты продолжают работать
- Пользовательский интерфейс остается неизменным
- Функциональность сохраняется полностью

## Success Metrics

1. **Уменьшение размера кода**: Минимум 15% сокращение строк кода
2. **Улучшение bundle size**: Уменьшение размера сборки на 10%
3. **Производительность**: Улучшение времени рендеринга компонентов
4. **Maintainability**: Снижение цикломатической сложности
5. **Test coverage**: Сохранение или улучшение покрытия тестами