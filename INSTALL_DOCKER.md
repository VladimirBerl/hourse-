# Установка Docker и Docker Compose на сервер

## Установка Docker Compose (одна команда)

### Для Linux (Ubuntu/Debian):

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
```

### Проверка установки:

```bash
docker-compose --version
```

## Полная установка Docker + Docker Compose

### Для Ubuntu/Debian (одна команда):

```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $USER && sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
```

После выполнения команды:
1. Выйдите и войдите снова в систему (или выполните `newgrp docker`)
2. Проверьте установку: `docker --version && docker-compose --version`

## Альтернативный способ (Docker Compose V2 - плагин)

Если у вас уже установлен Docker, можно установить Compose как плагин:

```bash
sudo apt-get update && sudo apt-get install docker-compose-plugin
```

Использование: `docker compose` (без дефиса)

## Быстрая установка на чистом сервере

```bash
# Обновление системы
sudo apt-get update

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка
docker --version
docker-compose --version
```

## Для CentOS/RHEL:

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
```

## После установки

1. Выйдите из SSH сессии и войдите снова (чтобы применить изменения группы)
2. Или выполните: `newgrp docker`
3. Проверьте: `docker-compose --version`






