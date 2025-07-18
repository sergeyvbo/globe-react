# Дизайн системы авторизации

## Обзор

Система авторизации будет интегрирована в существующее React приложение Globe React как опциональная функция. Пользователи смогут играть без авторизации или войти через обычную регистрацию/OAuth2 провайдеров для сохранения прогресса. Система будет использовать React Context для управления состоянием авторизации и localStorage для персистентности.

## Архитектура

### Компоненты высокого уровня

1. **AuthContext** - React Context для управления состоянием авторизации
2. **AuthModal** - Модальное окно для авторизации/регистрации
3. **AuthService** - Сервис для работы с API авторизации
4. **OAuth2Service** - Сервис для работы с OAuth2 провайдерами
5. **UserProfile** - Компонент профиля пользователя
6. **ProtectedRoute** - HOC для защищенных маршрутов (опционально)

### Архитектурные принципы

- **Опциональность**: Все функции авторизации опциональны, приложение работает без входа
- **Неинвазивность**: Минимальные изменения в существующих компонентах
- **Персистентность**: Состояние авторизации сохраняется между сессиями
- **Безопасность**: Токены хранятся безопасно, автоматический logout при истечении

## Компоненты и интерфейсы

### AuthContext

```typescript
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: OAuthProvider) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
}

interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: 'email' | 'google' | 'yandex' | 'vk'
  createdAt: Date
}

type OAuthProvider = 'google' | 'yandex' | 'vk'
```

### AuthModal

Модальное окно с тремя состояниями:
- **Welcome** - Приветствие с опциями (Войти, Регистрация, Продолжить без входа)
- **Login** - Форма входа с OAuth2 кнопками
- **Register** - Форма регистрации

```typescript
interface AuthModalProps {
  open: boolean
  onClose: () => void
  initialMode?: 'welcome' | 'login' | 'register'
}
```

### AuthService

```typescript
interface AuthService {
  login(email: string, password: string): Promise<AuthResponse>
  register(email: string, password: string): Promise<AuthResponse>
  refreshToken(): Promise<AuthResponse>
  logout(): Promise<void>
  getCurrentUser(): Promise<User>
  updateProfile(data: Partial<User>): Promise<User>
}

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  expiresIn: number
}
```

### OAuth2Service

```typescript
interface OAuth2Service {
  initiateLogin(provider: OAuthProvider): Promise<void>
  handleCallback(code: string, provider: OAuthProvider): Promise<AuthResponse>
  getAuthUrl(provider: OAuthProvider): string
}
```

## Модели данных

### User Model

```typescript
interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  provider: 'email' | 'google' | 'yandex' | 'vk'
  createdAt: Date
  lastLoginAt: Date
  preferences?: UserPreferences
}

interface UserPreferences {
  language: 'en' | 'ru'
  difficulty: Difficulty
  showPin: boolean
  showZoomButtons: boolean
  showBorders: boolean
}
```

### Game Progress Model

```typescript
interface GameProgress {
  userId: string
  gameType: 'countries' | 'flags' | 'states'
  correctAnswers: number
  wrongAnswers: number
  totalGames: number
  bestStreak: number
  lastPlayedAt: Date
}
```

### Session Model

```typescript
interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  user: User
}
```

## Интеграция с существующими компонентами

### MainMenu обновления

```typescript
// Добавить кнопку профиля/входа в Toolbar
<Toolbar>
  <IconButton onClick={() => setOpen(!open)}>
    <Settings />
  </IconButton>
  {/* Существующие кнопки */}
  
  {/* Новые кнопки авторизации */}
  {isAuthenticated ? (
    <IconButton onClick={handleProfileClick}>
      <AccountCircle />
    </IconButton>
  ) : (
    <Button onClick={handleLoginClick}>
      Войти
    </Button>
  )}
</Toolbar>
```

### CountryQuiz обновления

```typescript
// Показать AuthModal для неавторизованных пользователей
const CountryQuiz = () => {
  const { isAuthenticated } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(!isAuthenticated)
  
  // Остальная логика остается без изменений
  // Добавить сохранение прогресса для авторизованных пользователей
}
```

### App.tsx обновления

```typescript
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="App">
          <article className="App-article">
            <Routes>
              <Route path="/*" element={<CountryQuiz />} />
              <Route path="/countries" element={<CountryQuiz />} />
              <Route path="/flags" element={<FlagQuiz />} />
              <Route path="/states" element={<StateQuiz />} />
              <Route path="/profile" element={<UserProfile />} />
            </Routes>
          </article>
        </div>
      </HashRouter>
    </AuthProvider>
  )
}
```

## Обработка ошибок

### Типы ошибок

```typescript
enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_EXISTS = 'USER_EXISTS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

interface AuthError {
  type: AuthErrorType
  message: string
  details?: any
}
```

### Обработка ошибок

- **Валидация на клиенте**: Email формат, длина пароля, совпадение паролей
- **Сетевые ошибки**: Показ уведомлений с возможностью повтора
- **OAuth ошибки**: Перенаправление обратно с сообщением об ошибке
- **Истечение токена**: Автоматический refresh или logout

## Стратегия тестирования

### Unit тесты

- **AuthContext**: Тестирование всех методов и состояний
- **AuthService**: Мокирование API вызовов
- **OAuth2Service**: Тестирование URL генерации и обработки callback
- **Валидация**: Тестирование всех правил валидации

### Integration тесты

- **AuthModal**: Тестирование пользовательских сценариев
- **Компоненты с авторизацией**: Тестирование поведения для авторизованных/неавторизованных пользователей
- **Роутинг**: Тестирование перенаправлений

### E2E тесты

- **Полный цикл регистрации**: От модалки до игры
- **OAuth2 flow**: Тестирование с мокированными провайдерами
- **Персистентность**: Тестирование сохранения сессии

## Безопасность

### Хранение токенов

- **Access Token**: В памяти (React state)
- **Refresh Token**: В httpOnly cookie (если возможно) или secure localStorage
- **Автоматическое обновление**: Перед истечением access token

### Валидация

- **Клиентская валидация**: Немедленная обратная связь
- **Серверная валидация**: Окончательная проверка
- **Санитизация**: Очистка всех пользовательских данных

### OAuth2 безопасность

- **PKCE**: Для дополнительной безопасности
- **State parameter**: Защита от CSRF атак
- **Secure redirect URLs**: Только разрешенные домены

## Производительность

### Оптимизации

- **Lazy loading**: AuthModal загружается по требованию
- **Мемоизация**: React.memo для компонентов авторизации
- **Debouncing**: Для валидации форм
- **Кэширование**: Пользовательские данные в Context

### Метрики

- **Время загрузки**: AuthModal должен открываться < 100ms
- **Размер бандла**: Минимальное увеличение размера приложения
- **API вызовы**: Минимизация запросов к серверу

## Локализация

### Поддерживаемые языки

- Русский (ru)
- Английский (en)

### Строки авторизации

```typescript
const authStrings = {
  ru: {
    welcome: 'Добро пожаловать!',
    login: 'Войти',
    register: 'Регистрация',
    continueWithoutLogin: 'Продолжить без входа',
    loginWithGoogle: 'Войти через Google',
    loginWithYandex: 'Войти через Yandex',
    loginWithVK: 'Войти через VK',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    // ... другие строки
  },
  en: {
    welcome: 'Welcome!',
    login: 'Login',
    register: 'Register',
    continueWithoutLogin: 'Continue without login',
    // ... другие строки
  }
}
```

## Миграция и развертывание

### Поэтапное развертывание

1. **Фаза 1**: Базовая авторизация (email/password)
2. **Фаза 2**: OAuth2 интеграция
3. **Фаза 3**: Сохранение прогресса игры
4. **Фаза 4**: Расширенные функции профиля

### Обратная совместимость

- Существующие настройки в localStorage сохраняются
- Неавторизованные пользователи продолжают работать как раньше
- Постепенное добавление функций без breaking changes