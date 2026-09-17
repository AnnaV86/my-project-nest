import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { JwtService } from '@nestjs/jwt';
import {
  TEST_REFRESH_SECRET,
  testJwtOptions,
} from '../../test/helpers/auth.js';
import {
  createUserFixture,
  createUsersRepositoryMock,
} from '../../test/helpers/users.js';
import { AuthGuard } from './auth.guard.js';
import type { RequestWithUser } from './types.js';

describe('AuthGuard', () => {
  let repository: ReturnType<typeof createUsersRepositoryMock>;
  let jwt: JwtService;
  let guard: AuthGuard;

  beforeEach(() => {
    repository = createUsersRepositoryMock();
    jwt = new JwtService(testJwtOptions);
    guard = new AuthGuard(jwt, repository);
  });

  function createContext(authorization?: string) {
    const request: Pick<RequestWithUser, 'headers' | 'user'> = {
      headers: { authorization },
    };
    return { request, context: new ExecutionContextHost([request]) };
  }

  it('Разрешает доступ по access-токену и записывает числовой id в request.user', async () => {
    repository.findById.mockResolvedValue(createUserFixture());
    const token = await jwt.signAsync({ sub: '1' });
    const { request, context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
    expect(request.user).toBe(1);
  });

  it.each([undefined, '', 'Bearer', 'Bearer ', 'Basic abc'])(
    'Возвращает 401 при отсутствии Bearer-токена: %j',
    async (header) => {
      const { context } = createContext(header);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    },
  );

  it('Отклоняет повреждённый токен', async () => {
    const { context } = createContext('Bearer not-a-jwt');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('Возвращает 401, если срок access-токена истёк', async () => {
    const token = await jwt.signAsync({ sub: '1' }, { expiresIn: -1 });
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('Отклоняет refresh-токен в заголовке Authorization', async () => {
    const token = await jwt.signAsync(
      { sub: '1' },
      { secret: TEST_REFRESH_SECRET },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
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
  ])('Отклоняет некорректный id в токене: %j', async (sub) => {
    const token = await jwt.signAsync({ sub });
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('Запрещает доступ отсутствующему или удалённому пользователю', async () => {
    repository.findById.mockResolvedValue(null);
    const token = await jwt.signAsync({ sub: '1' });
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('Передаёт ошибку БД без изменений', async () => {
    const error = new Error('БД недоступна');
    repository.findById.mockRejectedValue(error);
    const token = await jwt.signAsync({ sub: '1' });
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBe(error);
  });
});
