# Развертывание приложения в Docker

Это руководство поможет вам запустить все приложение (frontend, backend и базу данных) в Docker контейнерах.

## Требования

- Docker (версия 20.10+)
- Docker Compose (версия 2.0+)

## Быстрый старт

1. **Клонируйте репозиторий** (если еще не сделано):
   ```bash
   git clone <your-repo-url>
   cd horse-and-backend
   ```

2. **Создайте файл `.env` в корне проекта** (опционально, для кастомизации):
   ```bash
   cp .env.example .env
   ```
   
   Отредактируйте `.env` и установите свой `JWT_SECRET`:
   ```
   JWT_SECRET=ваш-секретный-ключ-для-jwt
   ```

3. **Запустите все сервисы**:
   ```bash
   docker-compose up -d
   ```

4. **Проверьте статус контейнеров**:
   ```bash
   docker-compose ps
   ```

5. **Просмотрите логи** (если нужно):
   ```bash
   docker-compose logs -f
   ```

## Доступ к приложению

После запуска приложение будет доступно по адресам:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:4454

## Управление контейнерами

### Остановка всех сервисов
```bash
docker-compose down
```

### Остановка и удаление всех данных (включая базу данных)
```bash
docker-compose down -v
```

### Перезапуск сервисов
```bash
docker-compose restart
```

### Просмотр логов конкретного сервиса
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Пересборка образов (после изменений в коде)
```bash
docker-compose build
docker-compose up -d
```

## Структура сервисов

### PostgreSQL
- **Порт**: 4454 (внешний) → 5432 (внутренний)
- **Пользователь**: postgres
- **Пароль**: admin
- **База данных**: postgres
- **Данные**: сохраняются в Docker volume `postgres_data`

### Backend
- **Порт**: 3001
- **Автоматическая инициализация**: База данных автоматически синхронизируется при первом запуске
- **Загрузки**: Сохраняются в `./backend/uploads`
- **Данные**: Сохраняются в `./backend/data`

### Frontend
- **Порт**: 3000
- **Сервер**: Nginx
- **Сборка**: Происходит автоматически при создании образа

## Переменные окружения

### Backend (.env или docker-compose.yml)
- `DB_HOST` - хост базы данных (по умолчанию: postgres)
- `DB_PORT` - порт базы данных (по умолчанию: 5432)
- `DB_USER` - пользователь БД (по умолчанию: postgres)
- `DB_PASSWORD` - пароль БД (по умолчанию: admin)
- `DB_NAME` - имя БД (по умолчанию: postgres)
- `JWT_SECRET` - секретный ключ для JWT токенов
- `PORT` - порт сервера (по умолчанию: 3001)

### Frontend (.env)
- `VITE_API_URL` - URL API бэкенда (по умолчанию: http://localhost:3001/api)

## Развертывание на продакшн сервере

1. **Измените переменные окружения**:
   - Установите сильный `JWT_SECRET`
   - Измените пароли базы данных
   - Настройте `VITE_API_URL` на реальный домен

2. **Настройте Nginx для frontend** (опционально):
   - Можно использовать внешний Nginx для SSL/HTTPS
   - Или изменить порт в docker-compose.yml

3. **Запустите**:
   ```bash
   docker-compose up -d
   ```

## Решение проблем

### База данных не подключается
- Убедитесь, что контейнер PostgreSQL запущен: `docker-compose ps`
- Проверьте логи: `docker-compose logs postgres`

### Backend не запускается
- Проверьте логи: `docker-compose logs backend`
- Убедитесь, что PostgreSQL готов: `docker-compose logs postgres`

### Frontend не подключается к backend
- Проверьте переменную `VITE_API_URL` в `.env`
- Убедитесь, что backend доступен: `curl http://localhost:3001/`

### Пересоздание базы данных
```bash
docker-compose down -v
docker-compose up -d
```

## Обновление приложения

1. Остановите контейнеры:
   ```bash
   docker-compose down
   ```

2. Обновите код (через git pull или вручную)

3. Пересоберите и запустите:
   ```bash
   docker-compose build
   docker-compose up -d
   ```

## Резервное копирование базы данных

### Создание бэкапа
```bash
docker-compose exec postgres pg_dump -U postgres postgres > backup.sql
```

### Восстановление из бэкапа
```bash
docker-compose exec -T postgres psql -U postgres postgres < backup.sql
```


