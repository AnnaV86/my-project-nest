import { DataSource, MoreThan, Repository } from 'typeorm';
import { createUserFixture } from '../../../test/helpers/users.js';
import { User } from '../../users/entities/users.entity.js';
import { RefreshSession } from '../entities/refresh-session.entity.js';
import { TypeOrmRefreshSessionsRepository } from './typeorm-refresh-sessions.repository.js';

describe('TypeOrmRefreshSessionsRepository', () => {
  let ormRepository: Repository<RefreshSession>;
  let repository: TypeOrmRefreshSessionsRepository;
  const now = new Date('2026-09-21T10:00:00.000Z');
  const data = {
    userId: 1,
    tokenHash: 'b'.repeat(64),
    expiresAt: new Date('2026-09-28T10:00:00.000Z'),
  };
  const rotation = { ...data, previousTokenHash: 'a'.repeat(64) };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const dataSource = new DataSource({
      type: 'postgres',
      entities: [User, RefreshSession],
    });
    ormRepository = dataSource.getRepository(RefreshSession);
    repository = new TypeOrmRefreshSessionsRepository(ormRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('create', () => {
    it('Сохраняет сессию с пользователем, хэшем и сроком действия', async () => {
      const session: RefreshSession = {
        ...data,
        id: '742cc3bb-6f90-4c15-b1f1-7d6e049e69ee',
        user: createUserFixture(),
      };
      const create = vi.spyOn(ormRepository, 'create').mockReturnValue(session);
      const save = vi.spyOn(ormRepository, 'save').mockResolvedValue(session);

      await expect(repository.create(data)).resolves.toBeUndefined();
      expect(create).toHaveBeenCalledExactlyOnceWith(data);
      expect(save).toHaveBeenCalledExactlyOnceWith(session);
    });

    it('Передаёт ошибку сохранения сессии вызывающему сервису', async () => {
      const session: RefreshSession = {
        ...data,
        id: '742cc3bb-6f90-4c15-b1f1-7d6e049e69ee',
        user: createUserFixture(),
      };
      const error = new Error('БД недоступна');
      vi.spyOn(ormRepository, 'create').mockReturnValue(session);
      vi.spyOn(ormRepository, 'save').mockRejectedValue(error);

      await expect(repository.create(data)).rejects.toBe(error);
    });
  });

  describe('rotate', () => {
    it('Одним UPDATE заменяет хэш только у действующей сессии с нужным пользователем и старым хэшем', async () => {
      const update = vi.spyOn(ormRepository, 'update').mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await expect(repository.rotate(rotation)).resolves.toBe(true);
      expect(update).toHaveBeenCalledExactlyOnceWith(
        {
          userId: 1,
          tokenHash: rotation.previousTokenHash,
          expiresAt: MoreThan(now),
        },
        { tokenHash: data.tokenHash, expiresAt: data.expiresAt },
      );
    });

    it.each([0, undefined])(
      'Возвращает false, если обновление одной строки не подтверждено: affected=%s',
      async (affected) => {
        vi.spyOn(ormRepository, 'update').mockResolvedValue({
          affected,
          raw: [],
          generatedMaps: [],
        });

        await expect(repository.rotate(rotation)).resolves.toBe(false);
      },
    );

    it('Передаёт ошибку БД при ротации вызывающему сервису', async () => {
      const error = new Error('БД недоступна');
      vi.spyOn(ormRepository, 'update').mockRejectedValue(error);

      await expect(repository.rotate(rotation)).rejects.toBe(error);
    });
  });
});
