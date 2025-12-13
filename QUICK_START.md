# Быстрый запуск в Docker

## Один раз для запуска всего приложения:

```bash
docker-compose up -d --build
```

## Проверка статуса:

```bash
docker-compose ps
```

## Просмотр логов:

```bash
docker-compose logs -f
```

## Остановка:

```bash
docker-compose down
```

## После запуска:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **База данных**: localhost:4454

Подробная документация в файле `DOCKER_DEPLOYMENT.md`


