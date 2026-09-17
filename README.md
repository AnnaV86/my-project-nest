# REST API пользователей

NestJS, TypeScript, PostgreSQL 18, TypeORM (Repository), JWT, bcrypt.
Регистрация, авторизация, профили, поиск, пагинация и soft-delete.

## Запуск

Требования: Node.js 22.21.1, npm 11, Docker Compose.
PostgreSQL запускается в Docker, приложение — локально.

Скопируйте `.env.example` в `.env`:

```sh
cp .env.example .env
```

Задайте разные случайные значения для JWT-секретов.
Параметры БД соответствуют `compose.yaml`.

```sh
npm ci
docker compose up -d
```

После готовности PostgreSQL выполните сборку, миграции и запуск:

```sh
npm run build
npm run typeorm -- migration:run -d ./dist/database/data-source.js
npm run start:dev
```

В PowerShell используйте `npm.cmd` вместо `npm`.
Для запуска собранного приложения: `npm run start:prod`.

API: `http://localhost:3000` · [Swagger](http://localhost:3000/api) · [OpenAPI JSON](http://localhost:3000/api-json).

## API

| Метод  | Маршрут           | Назначение                  |
| ------ | ----------------- | --------------------------- |
| POST   | `/registration`   | Регистрация, выдача токенов |
| POST   | `/auth/login`     | Вход по логину и паролю     |
| POST   | `/auth/refresh`   | Обновление токенов          |
| GET    | `/profile/my`     | Свой профиль                |
| GET    | `/user/all`       | Список пользователей        |
| PATCH  | `/profile/update` | Обновление своего профиля   |
| DELETE | `/profile/delete` | Удаление профиля            |

Маршруты `/profile/*` и `/user/all` требуют заголовок
`Authorization: Bearer <access_token>`. Схемы запросов и ответов описаны в Swagger.

Access-токен действует 24 часа, refresh-токен — 7 дней. Обновление выполняется
через `/auth/refresh` с полем `refresh_token` в JSON. Ротация refresh-токенов не реализована.

Параметры `GET /user/all`:

- `login` — поиск по части логина без учёта регистра.
- `age` — точный возраст.
- `page` — номер страницы от 1, по умолчанию 1.
- `limit` — размер страницы от 1 до 100; без него возвращаются все совпадения.

Ответ: `{ items, total }`, где `total` — число совпадений до пагинации.

## Проверки

```sh
npm run test
npm run test:e2e
npm run lint
npm run format:check
```

Тесты используют моки репозитория, без PostgreSQL и `.env`.
Husky запускает линтер и проверку форматирования перед коммитом.
