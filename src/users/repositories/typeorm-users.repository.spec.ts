import { DataSource, ILike, IsNull, Repository } from 'typeorm';
import { createUserFixture } from '../../../test/helpers/users.js';
import { User } from '../entities/users.entity.js';
import { TypeOrmUsersRepository } from './typeorm-users.repository.js';

describe('TypeOrmUsersRepository', () => {
  let ormRepository: Repository<User>;
  let repository: TypeOrmUsersRepository;

  beforeEach(() => {
    const dataSource = new DataSource({ type: 'postgres', entities: [User] });
    ormRepository = dataSource.getRepository(User);
    repository = new TypeOrmUsersRepository(ormRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findAll', () => {
    it('Запрашивает весь список со стабильной сортировкой без skip и take', async () => {
      const users = [createUserFixture()];
      const findAndCount = vi
        .spyOn(ormRepository, 'findAndCount')
        .mockResolvedValue([users, 1]);

      await expect(repository.findAll({})).resolves.toEqual([users, 1]);
      expect(findAndCount).toHaveBeenCalledExactlyOnceWith({
        where: {},
        order: { id: 'ASC' },
      });
    });

    it.each([
      { login: 'Ann', pattern: '%Ann%' },
      { login: '%', pattern: '%\\%%' },
      { login: '_', pattern: '%\\_%' },
      { login: '\\', pattern: '%\\\\%' },
      { login: 'ann_%\\', pattern: '%ann\\_\\%\\\\%' },
    ])(
      'Ищет буквальную подстроку логина $login',
      async ({ login, pattern }) => {
        const findAndCount = vi
          .spyOn(ormRepository, 'findAndCount')
          .mockResolvedValue([[], 0]);

        await expect(
          repository.findAll({ login, age: 25, offset: 10, limit: 10 }),
        ).resolves.toEqual([[], 0]);
        expect(findAndCount).toHaveBeenCalledExactlyOnceWith({
          where: { age: 25, login: ILike(pattern) },
          order: { id: 'ASC' },
          skip: 10,
          take: 10,
        });
      },
    );

    it('Передаёт фильтр age 0, смещение и размер страницы в TypeORM', async () => {
      const findAndCount = vi
        .spyOn(ormRepository, 'findAndCount')
        .mockResolvedValue([[], 12]);

      await expect(
        repository.findAll({ age: 0, offset: 20, limit: 10 }),
      ).resolves.toEqual([[], 12]);
      expect(findAndCount).toHaveBeenCalledExactlyOnceWith({
        where: { age: 0 },
        order: { id: 'ASC' },
        skip: 20,
        take: 10,
      });
    });
  });

  describe('updateProfile', () => {
    it('Обновляет только пользователя с нужным id, который ещё не удалён', async () => {
      const result = { affected: 1, raw: [], generatedMaps: [] };
      const update = vi
        .spyOn(ormRepository, 'update')
        .mockResolvedValue(result);

      await expect(repository.updateProfile({ age: 30 }, 1)).resolves.toBe(
        result,
      );
      expect(update).toHaveBeenCalledExactlyOnceWith(
        { id: 1, deleted: IsNull() },
        { age: 30 },
      );
    });
  });

  describe('deleteProfile', () => {
    it('Использует soft-delete только для ещё не удалённого пользователя', async () => {
      const result = { affected: 1, raw: [], generatedMaps: [] };
      const softDelete = vi
        .spyOn(ormRepository, 'softDelete')
        .mockResolvedValue(result);

      await expect(repository.deleteProfile(1)).resolves.toBe(result);
      expect(softDelete).toHaveBeenCalledExactlyOnceWith({
        id: 1,
        deleted: IsNull(),
      });
    });
  });
});
