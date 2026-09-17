import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcrypt';
import type { Server } from 'node:http';
import request from 'supertest';
import { z } from 'zod';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthGuard } from '../src/auth/auth.guard.js';
import { AuthService } from '../src/auth/auth.service.js';
import { RegistrationController } from '../src/auth/registration.controller.js';
import { ProfileController } from '../src/users/profile.controller.js';
import { UserController } from '../src/users/users.controller.js';
import { UsersRepository } from '../src/users/users.repository.js';
import { UsersService } from '../src/users/users.service.js';
import { TEST_REFRESH_SECRET, testJwtOptions } from './helpers/auth.js';
import {
  createUserFixture,
  createUsersRepositoryMock,
  registrationData,
} from './helpers/users.js';

describe('REST API (HTTP, с моками репозитория)', () => {
  let app: INestApplication<Server>;
  let server: Server;
  const repository = createUsersRepositoryMock();
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
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: new ConfigService({
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
    repository.findById.mockResolvedValue(createUserFixture());
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('POST /registration: возвращает 201 и токены, позволяющие получить свой профиль', async () => {
    repository.findByEmail.mockResolvedValue(null);
    repository.findByLogin.mockResolvedValue(null);
    repository.create.mockImplementation((data) =>
      Promise.resolve({ ...data, id: 1 }),
    );

    const response = await request(server)
      .post('/registration')
      .send(registrationData)
      .expect(201);
    const tokens = tokensSchema.parse(response.body);

    await request(server)
      .get('/profile/my')
      .set('Authorization', `Bearer ${tokens.access_token}`)
      .expect(200)
      .expect(publicProfile);
  });

  it('POST /registration: некорректный body даёт 400 до обращения к БД', async () => {
    await request(server)
      .post('/registration')
      .send({ login: 'Anna' })
      .expect(400);
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it('POST /registration: занятый email даёт 409', async () => {
    repository.findByEmail.mockResolvedValue(createUserFixture());

    await request(server)
      .post('/registration')
      .send(registrationData)
      .expect(409);
    expect(repository.create).not.toHaveBeenCalled();
  });

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
    const refresh = await jwt.signAsync(
      { sub: '1' },
      { secret: TEST_REFRESH_SECRET },
    );

    const response = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: refresh })
      .expect(200);

    expect(tokensSchema.safeParse(response.body).success).toBe(true);
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

  it('GET /user/all: преобразует query, передаёт фильтр и возвращает публичные поля', async () => {
    repository.findAll.mockResolvedValue([[createUserFixture()], 11]);

    await request(server)
      .get('/user/all?page=2&limit=10&age=25')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect({ items: [publicProfile], total: 11 });
    expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
      offset: 10,
      limit: 10,
      age: 25,
    });
  });

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

  it.each([{}, { age: null }, { age: -1 }])(
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
