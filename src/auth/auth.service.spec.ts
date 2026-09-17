import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import {
  TEST_REFRESH_SECRET,
  testJwtOptions,
} from '../../test/helpers/auth.js';
import {
  createUserFixture,
  createUsersRepositoryMock,
  registrationData,
} from '../../test/helpers/users.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

type SignedPayload = { sub: string; iat: number; exp: number; jti?: string };

describe('AuthService', () => {
  let repository: ReturnType<typeof createUsersRepositoryMock>;
  let usersService: UsersService;
  let jwt: JwtService;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(registrationData.password, 4);
  });

  beforeEach(() => {
    repository = createUsersRepositoryMock();
    usersService = new UsersService(repository);
    jwt = new JwtService(testJwtOptions);
    const config = new ConfigService({
      JWT_REFRESH_SECRET: TEST_REFRESH_SECRET,
    });
    service = new AuthService(usersService, jwt, config, repository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function expectTokens(tokens: {
    access_token: string;
    refresh_token: string;
  }) {
    const access = await jwt.verifyAsync<SignedPayload>(tokens.access_token);
    const refresh = await jwt.verifyAsync<SignedPayload>(tokens.refresh_token, {
      secret: TEST_REFRESH_SECRET,
    });

    expect(access.sub).toBe('1');
    expect(refresh.sub).toBe('1');
    expect(access.exp - access.iat).toBe(24 * 60 * 60);
    expect(refresh.exp - refresh.iat).toBe(7 * 24 * 60 * 60);
    expect(refresh.jti).toEqual(expect.any(String));
    expect(tokens.access_token).not.toBe(tokens.refresh_token);
    await expect(jwt.verifyAsync(tokens.refresh_token)).rejects.toThrow();
    await expect(
      jwt.verifyAsync(tokens.access_token, { secret: TEST_REFRESH_SECRET }),
    ).rejects.toThrow();
  }

  describe('register', () => {
    it('Передаёт данные регистрации и выдаёт два токена для созданного пользователя', async () => {
      const register = vi
        .spyOn(usersService, 'register')
        .mockResolvedValue(createUserFixture());

      const result = await service.register(registrationData);

      expect(register).toHaveBeenCalledExactlyOnceWith(registrationData);
      expect(Object.keys(result).sort()).toEqual([
        'access_token',
        'refresh_token',
      ]);
      await expectTokens(result);
    });

    it('При ошибке регистрации не выдаёт токены и передаёт ошибку', async () => {
      const error = new ConflictException('Пользователь уже существует');
      vi.spyOn(usersService, 'register').mockRejectedValue(error);
      const sign = vi.spyOn(jwt, 'signAsync');

      await expect(service.register(registrationData)).rejects.toBe(error);
      expect(sign).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('Выдаёт токены при правильных логине и пароле', async () => {
      repository.findByLogin.mockResolvedValue(
        createUserFixture({ passwordHash }),
      );

      const result = await service.signIn({
        login: registrationData.login,
        password: registrationData.password,
      });

      expect(repository.findByLogin).toHaveBeenCalledExactlyOnceWith('Anna');
      await expectTokens(result);
    });

    it('Возвращает 401 для неизвестного логина и не выдаёт токены', async () => {
      repository.findByLogin.mockResolvedValue(null);
      const sign = vi.spyOn(jwt, 'signAsync');

      await expect(service.signIn(registrationData)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sign).not.toHaveBeenCalled();
    });

    it('Возвращает 401 при неверном пароле и не выдаёт токены', async () => {
      repository.findByLogin.mockResolvedValue(
        createUserFixture({ passwordHash }),
      );
      const sign = vi.spyOn(jwt, 'signAsync');

      await expect(
        service.signIn({ login: 'Anna', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(sign).not.toHaveBeenCalled();
    });

    it('Не маскирует ошибку репозитория под неверный пароль', async () => {
      const error = new Error('БД недоступна');
      repository.findByLogin.mockRejectedValue(error);

      await expect(service.signIn(registrationData)).rejects.toBe(error);
    });
  });

  describe('refreshToken', () => {
    it('Проверяет refresh-токен и выдаёт новую пару для существующего пользователя', async () => {
      repository.findById.mockResolvedValue(createUserFixture());
      const refreshToken = await jwt.signAsync(
        { sub: '1' },
        { secret: TEST_REFRESH_SECRET, jwtid: 'previous-token' },
      );

      const result = await service.refreshToken({
        refresh_token: refreshToken,
      });

      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
      expect(result.refresh_token).not.toBe(refreshToken);
      await expectTokens(result);
    });

    it('Отклоняет истёкший refresh-токен', async () => {
      const token = await jwt.signAsync(
        { sub: '1' },
        { secret: TEST_REFRESH_SECRET, expiresIn: -1 },
      );

      await expect(
        service.refreshToken({ refresh_token: token }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('Отклоняет access-токен вместо refresh-токена', async () => {
      const token = await jwt.signAsync({ sub: '1' });

      await expect(
        service.refreshToken({ refresh_token: token }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('Отклоняет повреждённый токен', async () => {
      await expect(
        service.refreshToken({ refresh_token: 'not-a-jwt' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it.each([
      undefined,
      null,
      1,
      '',
      '0',
      '-1',
      '1.5',
      'abc',
      '9007199254740992',
    ])('Отклоняет некорректный sub: %j', async (sub) => {
      const token = await jwt.signAsync(
        { sub },
        { secret: TEST_REFRESH_SECRET },
      );

      await expect(
        service.refreshToken({ refresh_token: token }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('Не выдаёт новые токены для отсутствующего или удалённого пользователя', async () => {
      repository.findById.mockResolvedValue(null);
      const token = await jwt.signAsync(
        { sub: '1' },
        { secret: TEST_REFRESH_SECRET },
      );
      const sign = vi.spyOn(jwt, 'signAsync');

      await expect(
        service.refreshToken({ refresh_token: token }),
      ).rejects.toThrow(UnauthorizedException);
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
      expect(sign).not.toHaveBeenCalled();
    });
  });
});
