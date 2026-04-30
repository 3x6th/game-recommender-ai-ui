# 🎮 PlayCure Frontend

## 🛠 Технологии

- **React 18** - современная библиотека для UI
- **TypeScript** - типизированный JavaScript
- **Vite** - быстрый сборщик
- **Tailwind CSS** - CSS фреймворк
- **Framer Motion** - анимации
- **Lucide React** - иконки
- **Axios** - HTTP клиент

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- npm или yarn
- Запущенный бэкенд на порту 8080

### Установка

```bash
# Клонируйте репозиторий
git clone <repo-url>
cd game-recommender-ai-ui

# Установка зависимостей
npm install

# Создайте .env файл из примера
cp .env.example .env

# Убедитесь, что backend запущен на http://localhost:8080
# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Предварительный просмотр сборки
npm run preview
```

Приложение будет доступно по адресу: http://localhost:5173


## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env` в корне проекта (или скопируйте из `.env.example`):

```env
VITE_API_URL=http://localhost:8080/api/v1
```

**Важно**:
- Для локальной разработки используйте `http://localhost:8080/api/v1`
- Для production замените на URL вашего бэкенда
- Файл `.env` уже добавлен в `.gitignore` и не будет закоммичен

## 🚀 Deployment (GitHub Pages)

Проект разворачивается на GitHub Pages через GitHub Actions (workflow: `.github/workflows/deploy-pages.yml`).

- **Repo setting**: `Settings → Pages → Source: GitHub Actions`
- **Required repo variable** (preferred) or secret:
  - `VITE_API_URL=https://api.playcure.3x6th.xyz/api/v1`
- **Custom domain**:
  - `public/CNAME` коммитится в репозиторий и попадает в корень сборки (`dist/CNAME`), чтобы GitHub Pages сохранял домен `playcure.3x6th.xyz`
- **Build-time config**:
  - `VITE_API_URL` “запекается” на этапе сборки (изменение значения требует нового деплоя — достаточно пуша в default branch)

### API Интеграция

Приложение использует следующие эндпоинты:

#### Аутентификация
- `POST /auth/preAuthorize` - Предварительная авторизация (создание анонимной сессии)
  - Возвращает: `{ accessToken, accessExpiresIn, role, sessionId, steamId? }`
  - Автоматически вызывается при загрузке приложения
- `POST /auth/refresh` - Обновление access token
  - Использует refresh token из cookies
  - Автоматически вызывается при получении 401 ошибки


### Особенности работы с токенами

1. **PreAuthorization Flow**:
   - При первом открытии приложения автоматически вызывается `/preAuthorize`
   - Access token сохраняется в `localStorage`
   - Refresh token устанавливается в HTTP-only cookie бэкендом
   - Session ID сохраняется для отслеживания сессии

2. **Token Refresh**:
   - При получении 401 ошибки автоматически вызывается `/auth/refresh`
   - Новый access token сохраняется и используется для повтора запроса
   - Если refresh не удался, пользователь видит ошибку подключения

3. **Request Interceptor**:
   - Все запросы автоматически получают `Authorization: Bearer <token>` header
   - Cookie с refresh token отправляется автоматически (`withCredentials: true`)

## 📁 Структура проекта

```
src/
├── components/          # React компоненты
│   ├── BurnoutIndicator.tsx
│   ├── ChatMessageComponent.tsx
│   └── GameRecommendationCard.tsx
├── services/            # API сервисы
│   └── api.ts          # HTTP клиент и API функции
├── types/               # TypeScript типы
│   └── index.ts        # Интерфейсы данных
├── App.tsx              # Главный компонент
├── main.tsx            # Точка входа
└── index.css           # Глобальные стили
```

## 🎨 Дизайн

### Цветовая схема

- **Фон**: Черный с анимированными градиентами
- **Стекло**: Полупрозрачные элементы с размытием
- **Акценты**: Синие и фиолетовые градиенты
- **Текст**: Белый и серые оттенки

### Анимации

- Плавные переходы при наведении
- Анимированный фон с параллаксом
- Анимации появления карточек
- Интерактивные эффекты чипов


## 🤝 Разработка

### Добавление новых чипов

В `App.tsx` добавьте новые чипы в массив:

```typescript
const chips = useMemo(
  () => [
    "Low-stress",
    "No shooters",
    // ... существующие чипы
    "Новый чип",
  ],
  []
);
```

### Стилизация компонентов

Используйте Tailwind CSS классы и Framer Motion для анимаций.

### API интеграция

Новые API функции добавляйте в `services/api.ts` с обработкой ошибок.

## 📄 Лицензия

MIT License


