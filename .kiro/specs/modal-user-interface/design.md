# Design Document

## Overview

Данный дизайн преобразует существующие страничные компоненты профиля пользователя, статистики и таблицы лидеров в модальные окна. Это улучшит пользовательский опыт, позволив игрокам быстро получать доступ к информации без прерывания игрового процесса.

Основная идея заключается в создании переиспользуемых модальных компонентов, которые обертывают существующие компоненты и управляют их отображением через состояние приложения.

## Architecture

### Component Structure

```
src/Common/Modals/
├── BaseModal.tsx              # Базовый модальный компонент
├── UserProfileModal.tsx       # Модальное окно профиля
├── StatisticsModal.tsx        # Модальное окно статистики  
├── LeaderboardModal.tsx       # Модальное окно таблицы лидеров
├── ModalProvider.tsx          # Context provider для управления модалами
├── useModal.ts               # Hook для работы с модалами
└── index.ts                  # Экспорты модуля
```

### State Management

Используется React Context API для централизованного управления состоянием модальных окон:

```typescript
interface ModalState {
  userProfile: boolean
  statistics: boolean
  leaderboard: boolean
}

interface ModalContextType {
  modals: ModalState
  openModal: (modalName: keyof ModalState) => void
  closeModal: (modalName: keyof ModalState) => void
  closeAllModals: () => void
}
```

### Integration Points

1. **MainMenu Component**: Обновление обработчиков кликов для открытия модалов вместо навигации
2. **App Component**: Добавление ModalProvider и модальных компонентов
3. **Routing**: Сохранение существующих маршрутов для прямых ссылок и SEO

## Components and Interfaces

### BaseModal Component

Базовый компонент для всех модальных окон с общей функциональностью:

```typescript
interface BaseModalProps {
  open: boolean
  onClose: () => void
  title: string
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  children: React.ReactNode
  disableEscapeKeyDown?: boolean
  disableBackdropClick?: boolean
}
```

**Features:**
- Адаптивный дизайн для разных размеров экранов
- Управление фокусом и доступностью
- Анимации открытия/закрытия
- Обработка клавиатурных событий (Escape, Tab)

### UserProfileModal Component

Модальное окно для отображения профиля пользователя:

```typescript
interface UserProfileModalProps {
  open: boolean
  onClose: () => void
}
```

**Features:**
- Обертывает существующий UserProfile компонент
- Адаптирует стили для модального отображения
- Сохраняет всю функциональность смены пароля
- Обрабатывает состояния загрузки и ошибок

### StatisticsModal Component

Модальное окно для отображения статистики:

```typescript
interface StatisticsModalProps {
  open: boolean
  onClose: () => void
  initialTab?: number
}
```

**Features:**
- Обертывает UserStats и GameHistory компоненты
- Поддерживает переключение между вкладками
- Сохраняет состояние активной вкладки
- Оптимизирует загрузку данных

### LeaderboardModal Component

Модальное окно для таблицы лидеров:

```typescript
interface LeaderboardModalProps {
  open: boolean
  onClose: () => void
}
```

**Features:**
- Обертывает существующий Leaderboard компонент
- Сохраняет функциональность фильтрации и пагинации
- Адаптирует размеры для модального отображения

### ModalProvider Component

Context provider для управления состоянием модалов:

```typescript
interface ModalProviderProps {
  children: React.ReactNode
}
```

**Features:**
- Централизованное управление состоянием всех модалов
- Предотвращение одновременного открытия нескольких модалов
- Обработка глобальных событий (например, Escape)

### useModal Hook

Пользовательский хук для работы с модалами:

```typescript
interface UseModalReturn {
  modals: ModalState
  openModal: (modalName: keyof ModalState) => void
  closeModal: (modalName: keyof ModalState) => void
  closeAllModals: () => void
  isAnyModalOpen: boolean
}
```

## Data Models

### Modal State Types

```typescript
type ModalName = 'userProfile' | 'statistics' | 'leaderboard'

interface ModalState {
  userProfile: boolean
  statistics: boolean
  leaderboard: boolean
}

interface ModalConfig {
  maxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth: boolean
  disableEscapeKeyDown: boolean
  disableBackdropClick: boolean
}
```

### Component Props Interfaces

```typescript
interface ModalComponentProps {
  open: boolean
  onClose: () => void
}

interface StatisticsModalProps extends ModalComponentProps {
  initialTab?: number
}
```

## Error Handling

### Modal-Specific Error Handling

1. **Loading States**: Каждый модал показывает индикатор загрузки при получении данных
2. **Error States**: Ошибки отображаются внутри модального окна без его закрытия
3. **Network Errors**: Автоматическое повторное подключение и уведомления пользователя
4. **Validation Errors**: Отображение ошибок валидации в соответствующих полях

### Error Boundaries

```typescript
interface ModalErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ModalErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ModalErrorBoundaryState
>
```

## Testing Strategy

### Unit Tests

1. **BaseModal Component**:
   - Тестирование открытия/закрытия
   - Проверка обработки клавиатурных событий
   - Тестирование адаптивности

2. **Modal Components**:
   - Тестирование рендеринга содержимого
   - Проверка передачи пропсов
   - Тестирование состояний загрузки и ошибок

3. **ModalProvider**:
   - Тестирование управления состоянием
   - Проверка предотвращения множественного открытия
   - Тестирование глобальных обработчиков

4. **useModal Hook**:
   - Тестирование всех методов хука
   - Проверка корректности состояния
   - Тестирование побочных эффектов

### Integration Tests

1. **MainMenu Integration**:
   - Тестирование открытия модалов по клику
   - Проверка корректности навигации
   - Тестирование состояния аутентификации

2. **Modal Interactions**:
   - Тестирование взаимодействия между модалами
   - Проверка сохранения состояния при переключении
   - Тестирование закрытия по внешним событиям

### E2E Tests

1. **User Workflows**:
   - Полный цикл открытия/закрытия модалов
   - Тестирование функциональности внутри модалов
   - Проверка адаптивности на разных устройствах

2. **Accessibility Tests**:
   - Тестирование навигации с клавиатуры
   - Проверка фокуса и ARIA атрибутов
   - Тестирование с screen readers

## Responsive Design

### Breakpoints

```typescript
const modalBreakpoints = {
  xs: '(max-width: 599px)',
  sm: '(min-width: 600px) and (max-width: 959px)',
  md: '(min-width: 960px) and (max-width: 1279px)',
  lg: '(min-width: 1280px) and (max-width: 1919px)',
  xl: '(min-width: 1920px)'
}
```

### Modal Sizing Strategy

1. **Mobile (xs)**: Полноэкранные модалы с минимальными отступами
2. **Tablet (sm)**: Модалы занимают 90% ширины экрана
3. **Desktop (md+)**: Фиксированная максимальная ширина с центрированием

### Content Adaptation

1. **UserProfile Modal**: 
   - Mobile: Вертикальная компоновка всех элементов
   - Desktop: Двухколоночная компоновка для статистики

2. **Statistics Modal**:
   - Mobile: Стекинг карточек статистики
   - Desktop: Сетка для отображения метрик

3. **Leaderboard Modal**:
   - Mobile: Упрощенная таблица с основными колонками
   - Desktop: Полная таблица со всеми данными

## Performance Considerations

### Lazy Loading

```typescript
const UserProfileModal = React.lazy(() => import('./UserProfileModal'))
const StatisticsModal = React.lazy(() => import('./StatisticsModal'))
const LeaderboardModal = React.lazy(() => import('./LeaderboardModal'))
```

### Data Caching

1. **Statistics Data**: Кэширование на 5 минут
2. **Leaderboard Data**: Кэширование на 2 минуты
3. **User Profile**: Кэширование до изменения данных

### Memory Management

1. **Component Unmounting**: Очистка таймеров и подписок при закрытии модалов
2. **Event Listeners**: Удаление глобальных обработчиков событий
3. **Data Cleanup**: Очистка кэшированных данных при выходе пользователя

## Accessibility

### ARIA Attributes

```typescript
const modalAriaProps = {
  'aria-labelledby': 'modal-title',
  'aria-describedby': 'modal-description',
  'role': 'dialog',
  'aria-modal': true
}
```

### Keyboard Navigation

1. **Tab Order**: Ограничение фокуса элементами внутри модала
2. **Escape Key**: Закрытие модала
3. **Enter/Space**: Активация кнопок и ссылок
4. **Arrow Keys**: Навигация в таблицах и списках

### Screen Reader Support

1. **Live Regions**: Объявление изменений состояния
2. **Descriptive Labels**: Понятные метки для всех интерактивных элементов
3. **Status Messages**: Объявление результатов действий

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Создание базовых компонентов модалов
2. Настройка ModalProvider и Context
3. Создание useModal хука

### Phase 2: Component Integration
1. Создание модальных оберток для существующих компонентов
2. Обновление MainMenu для использования модалов
3. Добавление модалов в App компонент

### Phase 3: Testing and Refinement
1. Написание тестов для всех компонентов
2. Тестирование на разных устройствах
3. Оптимизация производительности

## Backward Compatibility

### Route Preservation
Существующие маршруты (/profile, /stats, /leaderboard) остаются функциональными:
- При прямом переходе по URL открывается соответствующий модал
- Модалы обновляют URL для возможности прямых ссылок
- Поддержка браузерной навигации (назад/вперед)

### Component API
Существующие компоненты сохраняют свой API:
- UserProfile, UserStats, GameHistory, Leaderboard остаются без изменений
- Добавляются только новые модальные обертки
- Обратная совместимость с существующими тестами