# Настройка базы данных в Docker

## Быстрый старт

1. **Запустите PostgreSQL контейнер:**
   ```bash
   docker-compose up -d
   ```

2. **Проверьте, что контейнер запущен:**
   ```bash
   docker-compose ps
   ```

3. **Создайте файл `.env` в папке `backend/`** (если его еще нет):
   ```
   DB_HOST=localhost
   DB_PORT=4454
   DB_USER=postgres
   DB_PASSWORD=admin
   DB_NAME=postgres
   ```

4. **Подключитесь к базе данных** - ваше приложение автоматически подключится при запуске.

## Управление контейнером

- **Остановить контейнер:**
  ```bash
  docker-compose down
  ```

- **Остановить и удалить данные:**
  ```bash
  docker-compose down -v
  ```

- **Просмотреть логи:**
  ```bash
  docker-compose logs postgres
  ```

- **Подключиться к базе данных через psql:**
  ```bash
  docker-compose exec postgres psql -U postgres -d postgres
  ```

## Переменные окружения

Вы можете настроить подключение к базе данных через переменные окружения в файле `backend/.env`:

- `DB_HOST` - хост базы данных (по умолчанию: localhost)
- `DB_PORT` - порт базы данных (по умолчанию: 4454)
- `DB_USER` - пользователь (по умолчанию: postgres)
- `DB_PASSWORD` - пароль (по умолчанию: admin)
- `DB_NAME` - имя базы данных (по умолчанию: postgres)

## Примечания

- Данные базы данных сохраняются в Docker volume `postgres_data`
- Порт 4454 проброшен на стандартный порт PostgreSQL 5432 внутри контейнера
- При первом запуске база данных будет создана автоматически






