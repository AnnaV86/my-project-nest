import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { QueryFailedError } from 'typeorm';
import { z } from 'zod';
import { AuthController } from '../src/auth/controllers/auth.controller.js';
import { RegistrationController } from '../src/auth/controllers/registration.controller.js';
import { AuthGuard } from '../src/auth/guards/auth.guard.js';
import { RefreshSessionsRepository } from '../src/auth/repositories/refresh-sessions.repository.js';
import { AuthService } from '../src/auth/services/auth.service.js';
import { ProfileController } from '../src/users/controllers/profile.controller.js';
import { UserController } from '../src/users/controllers/users.controller.js';
import { UsersRepository } from '../src/users/repositories/users.repository.js';
import { UsersService } from '../src/users/services/users.service.js';
import { TEST_REFRESH_SECRET, testJwtOptions } from './helpers/auth.js';
import { createInMemoryRefreshSessionsRepository } from './helpers/refresh-sessions.js';
import { userConflictCases } from './helpers/user-conflicts.js';
import {
  createUserFixture,
  createUsersRepositoryMock,
  registrationData,
} from './helpers/users.js';

describe('REST API (HTTP, с моками репозитория)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  const repository = createUsersRepositoryMock();
  const sessionRepository = createInMemoryRefreshSessionsRepository();
  const jwt = new JwtService(testJwtOptions);
  let accessToken: string;
  let passwordHash: string;

  const publicProfile = {
    id: 1,
    login: 'Anna',
    email: 'anna@example.com',
    age: 25,
    description: 'Люблю котиков',
  };
  const tokensSchema = z
    .object({
      access_token: z.string().min(1),
      refresh_token: z.string().min(1),
    })
    .strict();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        AuthController,
        RegistrationController,
        ProfileController,
        UserController,
      ],
      providers: [
        UsersService,
        AuthService,
        AuthGuard,
        { provide: UsersRepository, useValue: repository },
        { provide: RefreshSessionsRepository, useValue: sessionRepository },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            BCRYPT_ROUNDS: '4',
            JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
          }),
        },
      ],
    }).compile();

    app = module.createNestApplication<INestApplication<Server>>();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();
    passwordHash = await bcrypt.hash(registrationData.password, 4);
    accessToken = await jwt.signAsync({ sub: '1' });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    sessionRepository.clear();
    repository.findByEmail.mockResolvedValue(null);
    repository.findByLogin.mockResolvedValue(null);
    repository.findById.mockResolvedValue(createUserFixture());
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  async function loginUser() {
    repository.findByLogin.mockResolvedValue(
      createUserFixture({ passwordHash }),
    );
    const response = await request(server)
      .post('/auth/login')
      .send({ login: 'Anna', password: registrationData.password })
      .expect(200);

    return tokensSchema.parse(response.body);
  }

  it('POST /registration: возвращает 201 и токены, позволяющие получить свой профиль', async () => {
    repository.create.mockImplementation((data) =>
      Promise.resolve({ ...data, id: 1 }),
    );

    const response = await request(server)
      .post('/registration')
      .send(registrationData)
      .expect(201);
    const tokens = tokensSchema.parse(response.body);

    expect(repository.create).toHaveBeenCalledTimes(1);
    const [savedUser] = repository.create.mock.calls[0];
    expect(bcrypt.getRounds(savedUser.passwordHash)).toBe(4);
    await expect(
      bcrypt.compare(registrationData.password, savedUser.passwordHash),
    ).resolves.toBe(true);

    await request(server)
      .get('/profile/my')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .expect(200)
      .expect(publicProfile);

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token })
      .expect(200);
  });

  it('POST /registration: некорректный body даёт 400 до обращения к БД', async () => {
    await request(server)
      .post('/registration')
      .send({ login: 'Anna' })
      .expect(400);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it('POST /registration: возраст старше 150 даёт 400 до обращения к репозиторию', async () => {
    await request(server)
      .post('/registration')
      .send({ ...registrationData, age: 151 })
      .expect(400);

    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.findByLogin).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each(userConflictCases)(
    'POST /registration: предварительная проверка занятого $field возвращает 409 с полем и сообщением',
    async ({ field, message }) => {
      if (field === 'email') {
        repository.findByEmail.mockResolvedValue(createUserFixture());
      } else {
        repository.findByLogin.mockResolvedValue(createUserFixture());
      }

      await request(server)
        .post('/registration')
        .send(registrationData)
        .expect(409)
        .expect({ statusCode: 409, error: 'Conflict', field, message });
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it.each(userConflictCases)(
    'POST /registration: конфликт $field при сохранении возвращает 409 с полем и сообщением',
    async ({ field, constraint, message }) => {
      const driverError = Object.assign(new Error('Duplicate user'), {
        code: '23505',
        constraint,
      });
      repository.create.mockRejectedValue(
        new QueryFailedError('', [], driverError),
      );

      await request(server)
        .post('/registration')
        .send(registrationData)
        .expect(409)
        .expect({ statusCode: 409, error: 'Conflict', field, message });
      expect(repository.create).toHaveBeenCalledTimes(1);
    },
  );

  it('POST /auth/login: возвращает 200 и пару токенов', async () => {
    repository.findByLogin.mockResolvedValue(
      createUserFixture({ passwordHash }),
    );

    const response = await request(server)
      .post('/auth/login')
      .send({ login: 'Anna', password: registrationData.password })
      .expect(200);

    expect(tokensSchema.safeParse(response.body).success).toBe(true);
  });

  it('POST /auth/login: неверный пароль даёт 401', async () => {
    repository.findByLogin.mockResolvedValue(
      createUserFixture({ passwordHash }),
    );

    await request(server)
      .post('/auth/login')
      .send({ login: 'Anna', password: 'wrong-password' })
      .expect(401);
  });

  it('POST /auth/login: пустой body даёт 400', async () => {
    await request(server).post('/auth/login').send({}).expect(400);
    expect(repository.findByLogin).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh: возвращает 200 и новые токены', async () => {
    const tokens = await loginUser();

    const response = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token })
      .expect(200);

    const refreshed = tokensSchema.parse(response.body);
    expect(refreshed.refresh_token).not.toBe(tokens.refresh_token);
    await request(server)
      .get('/profile/my')
      .set('Authorization', `Bearer ${refreshed.access_token}`)
      .expect(200)
      .expect(publicProfile);
  });

  it('POST /auth/refresh: старый токен даёт 401 после обмена, а новый продолжает работать', async () => {
    const tokens = await loginUser();
    const response = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token })
      .expect(200);
    const refreshed = tokensSchema.parse(response.body);

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token })
      .expect(401);

    const nextResponse = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: refreshed.refresh_token })
      .expect(200);
    const nextTokens = tokensSchema.parse(nextResponse.body);
    expect(nextTokens.refresh_token).not.toBe(refreshed.refresh_token);
  });

  it('POST /auth/refresh: подписанный токен без сохранённой сессии даёт 401', async () => {
    const token = await jwt.signAsync(
      { sub: '1' },
      { secret: TEST_REFRESH_SECRET, expiresIn: '7d' },
    );

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: token })
      .expect(401);
  });

  it('POST /auth/refresh: истёкшая сессия даёт 401 даже при действующем JWT', async () => {
    const tokens = await loginUser();
    await sessionRepository.create({
      userId: 1,
      tokenHash: createHash('sha256')
        .update(tokens.refresh_token)
        .digest('hex'),
      expiresAt: new Date(Date.now() - 1000),
    });

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: tokens.refresh_token })
      .expect(401);
  });

  it('POST /auth/refresh: два одновременных обмена одного токена дают один успех и один 401', async () => {
    const tokens = await loginUser();
    const responses = await Promise.all([
      request(server)
        .post('/auth/refresh')
        .send({ refresh_token: tokens.refresh_token }),
      request(server)
        .post('/auth/refresh')
        .send({ refresh_token: tokens.refresh_token }),
    ]);

    expect(responses.map(({ status }) => status).sort((a, b) => a - b)).toEqual(
      [200, 401],
    );
  });

  it('POST /auth/refresh: обновление одной сессии не мешает другой сессии пользователя', async () => {
    const firstSession = await loginUser();
    const secondSession = await loginUser();

    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: firstSession.refresh_token })
      .expect(200);
    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: secondSession.refresh_token })
      .expect(200);
  });

  it('POST /auth/refresh: access-токен в body даёт 401', async () => {
    await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: accessToken })
      .expect(401);
  });

  it('POST /auth/refresh: отсутствие токена даёт 400', async () => {
    await request(server).post('/auth/refresh').send({}).expect(400);
  });

  it.each(['/profile/my', '/user/all'])(
    'GET %s: требует заголовок Authorization',
    async (path) => {
      await request(server).get(path).expect(401);
      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.findAll).not.toHaveBeenCalled();
    },
  );

  it('PATCH /profile/update: требует заголовок Authorization', async () => {
    await request(server)
      .patch('/profile/update')
      .send({ age: 30 })
      .expect(401);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });

  it('DELETE /profile/delete: требует заголовок Authorization', async () => {
    await request(server).delete('/profile/delete').expect(401);
    expect(repository.deleteProfile).not.toHaveBeenCalled();
  });

  it('GET /profile/my: истёкший токен даёт 401', async () => {
    const expiredToken = await jwt.signAsync({ sub: '1' }, { expiresIn: -1 });

    await request(server)
      .get('/profile/my')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('GET /profile/my: удалённый пользователь не получает доступ', async () => {
    repository.findById.mockResolvedValue(null);

    await request(server)
      .get('/profile/my')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });

  it('GET /user/all: преобразует query, передаёт фильтры age и login и возвращает публичные поля', async () => {
    repository.findAll.mockResolvedValue([[createUserFixture()], 11]);

    await request(server)
      .get('/user/all?page=2&limit=10&age=25&login=ann')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ items: [publicProfile], total: 11 });
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
      offset: 10,
      limit: 10,
      age: 25,
      login: 'ann',
    });
  });

  it('GET /user/all: принимает запрос без фильтра login и пагинации', async () => {
    repository.findAll.mockResolvedValue([[createUserFixture()], 1]);

    await request(server)
      .get('/user/all')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ items: [publicProfile], total: 1 });
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
      offset: undefined,
      limit: undefined,
      age: undefined,
      login: undefined,
    });
  });

  it('GET /user/all: принимает большой номер страницы с безопасным смещением', async () => {
    repository.findAll.mockResolvedValue([[], 1]);

    await request(server)
      .get('/user/all')
      .query({ page: String(Number.MAX_SAFE_INTEGER), limit: '1' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ items: [], total: 1 });

    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
      offset: Number.MAX_SAFE_INTEGER - 1,
      limit: 1,
      age: undefined,
      login: undefined,
    });
  });

  it.each(['/user/all?login=', '/user/all?login'])(
    'GET %s: пустой login даёт 400 без вызова поиска',
    async (path) => {
      await request(server)
        .get(path)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
      expect(repository.findAll).not.toHaveBeenCalled();
    },
  );

  it.each([
    { age: '151' },
    { page: String(Number.MAX_SAFE_INTEGER), limit: '2' },
    { page: '1e308', limit: '100' },
  ])(
    'GET /user/all: недопустимые границы %j дают 400 без поиска в БД',
    async (query) => {
      await request(server)
        .get('/user/all')
        .query(query)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(repository.findAll).not.toHaveBeenCalled();
    },
  );

  it.each(['%', '_', '\\'])(
    'GET /user/all: передаёт символ %j в фильтр без потери при разборе query',
    async (login) => {
      repository.findAll.mockResolvedValue([[], 0]);

      await request(server)
        .get('/user/all')
        .query({ login })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect({ items: [], total: 0 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        login,
        age: undefined,
        offset: undefined,
        limit: undefined,
      });
    },
  );

  it('GET /user/all: некорректный limit даёт 400', async () => {
    await request(server)
      .get('/user/all?limit=-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    expect(repository.findAll).not.toHaveBeenCalled();
  });

  it('PATCH /profile/update: обновляет собственный профиль и игнорирует подставленный id', async () => {
    repository.findById.mockResolvedValue(createUserFixture({ age: 30 }));
    repository.updateProfile.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });

    await request(server)
      .patch('/profile/update')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        age: 30,
        id: 99,
        passwordHash: 'injected',
        deleted: '2026-01-01',
      })
      .expect(200)
      .expect({ ...publicProfile, age: 30 });
    expect(repository.updateProfile).toHaveBeenCalledExactlyOnceWith(
      { age: 30 },
      1,
    );
  });

  it('PATCH /profile/update: сохраняет новый пароль с настроенной стоимостью хеширования', async () => {
    repository.updateProfile.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    const password = 'NewPassword123!';

    await request(server)
      .patch('/profile/update')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password })
      .expect(200)
      .expect(publicProfile);

    expect(repository.updateProfile).toHaveBeenCalledTimes(1);
    const [data, userId] = repository.updateProfile.mock.calls[0];
    expect(userId).toBe(1);
    expect(data).not.toHaveProperty('password');
    if (typeof data.passwordHash !== 'string') {
      throw new Error('Репозиторий не получил хеш пароля');
    }
    expect(bcrypt.getRounds(data.passwordHash)).toBe(4);
    await expect(bcrypt.compare(password, data.passwordHash)).resolves.toBe(
      true,
    );
  });

  it.each([{}, { age: null }, { age: -1 }, { age: 151 }])(
    'PATCH /profile/update: некорректное обновление %j даёт 400',
    async (body) => {
      await request(server)
        .patch('/profile/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body)
        .expect(400);
      expect(repository.updateProfile).not.toHaveBeenCalled();
    },
  );

  it.each(userConflictCases)(
    'PATCH /profile/update: конфликт $field возвращает 409 с полем и сообщением',
    async ({ field, constraint, message }) => {
      const driverError = Object.assign(new Error('Duplicate user'), {
        code: '23505',
        constraint,
      });
      repository.updateProfile.mockRejectedValue(
        new QueryFailedError('', [], driverError),
      );
      const dto = { [field]: registrationData[field] };

      await request(server)
        .patch('/profile/update')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(dto)
        .expect(409)
        .expect({ statusCode: 409, error: 'Conflict', field, message });
      expect(repository.updateProfile).toHaveBeenCalledExactlyOnceWith(dto, 1);
    },
  );

  it('DELETE /profile/delete: возвращает 204 без тела ответа', async () => {
    repository.deleteProfile.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });

    const response = await request(server)
      .delete('/profile/delete')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    expect(response.text).toBe('');
    expect(repository.deleteProfile).toHaveBeenCalledExactlyOnceWith(1);
  });
});
