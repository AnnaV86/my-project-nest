import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { QueryFailedError } from 'typeorm';
import { ERRORS_MESSAGE } from '../common/error-messages.js';
import { UpdateProfileDto } from './dto/update-user.dto.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

const repository = {
  create: vi.fn<UsersRepository['create']>(),
  findByEmail: vi.fn<UsersRepository['findByEmail']>(),
  findByLogin: vi.fn<UsersRepository['findByLogin']>(),
  findById: vi.fn<UsersRepository['findById']>(),
  findAll: vi.fn<UsersRepository['findAll']>(),
  updateProfile: vi.fn<UsersRepository['updateProfile']>(),
  deleteProfile: vi.fn<UsersRepository['deleteProfile']>(),
};

const mockSavedData = {
  id: 1,
  login: 'Anna',
  email: 'anna@example.com',
  age: 25,
  passwordHash: 'passwordHash',
  description: 'Описание',
  deleted: null,
};

const mockDataDouble = {
  login: 'Ivan',
  email: 'ivan@example.com',
  age: 25,
  password: 'password',
  description: 'Описание',
};

describe('UsersService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('Отклоняет регистрацию, если email занят', async () => {
      repository.findByEmail.mockResolvedValue(mockSavedData);

      const service = new UsersService(repository);

      const result = service.register({
        ...mockDataDouble,
        email: 'anna@example.com',
      });

      await expect(result).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('Отклоняет регистрацию, если login занят', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByLogin.mockResolvedValue(mockSavedData);

      const service = new UsersService(repository);

      const result = service.register({
        ...mockDataDouble,
        login: 'Anna',
      });

      await expect(result).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('При свободных email и логине пользователь сохраняется с правильными данными', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByLogin.mockResolvedValue(null);
      repository.create.mockImplementation((data) =>
        Promise.resolve({
          ...data,
          id: 1,
        }),
      );

      const { password: _password, ...expectedProfile } = mockDataDouble;
      const service = new UsersService(repository);

      const result = await service.register(mockDataDouble);

      expect(result).toEqual({ ...expectedProfile, id: 1, deleted: null });
      expect(repository.create).toHaveBeenCalledTimes(1);

      const savedData = repository.create.mock.calls[0][0];

      expect(savedData).toMatchObject({
        ...expectedProfile,
        deleted: null,
      });

      expect(savedData).not.toHaveProperty('password');

      await expect(
        bcrypt.compare(mockDataDouble.password, savedData.passwordHash),
      ).resolves.toBe(true);
    });

    it('Возвращает конфликт при нарушении уникальности в БД', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByLogin.mockResolvedValue(null);

      const driverError = Object.assign(new Error('Duplicate email'), {
        code: '23505',
      });
      const databaseError = new QueryFailedError('', [], driverError);

      repository.create.mockRejectedValue(databaseError);

      const service = new UsersService(repository);

      const result = service.register(mockDataDouble);

      await expect(result).rejects.toThrow(ConflictException);
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('передаёт прочую ошибку сохранения без изменений', async () => {
      repository.findByEmail.mockResolvedValue(null);
      repository.findByLogin.mockResolvedValue(null);

      const databaseError = new Error('Ошибка');

      repository.create.mockRejectedValue(databaseError);

      const service = new UsersService(repository);

      await expect(service.register(mockDataDouble)).rejects.toBe(
        databaseError,
      );
      expect(repository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProfile', () => {
    it('Возвращает ошибку если пользователь не найден', async () => {
      repository.findById.mockResolvedValue(null);

      const service = new UsersService(repository);
      const result = service.getProfile(3);

      await expect(result).rejects.toThrow(NotFoundException);
      expect(repository.findById).toHaveBeenCalledWith(3);
    });

    it('Возвращает данные пользователя, без passwordHash и deleted', async () => {
      repository.findById.mockResolvedValue(mockSavedData);

      const service = new UsersService(repository);
      const result = await service.getProfile(1);

      const {
        passwordHash: _passwordHash,
        deleted: _deleted,
        ...expectedProfile
      } = mockSavedData;

      expect(result).toEqual(expectedProfile);
      expect(repository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('updateProfile', () => {
    it('Обновляет поля и возвращает профиль без служебных данных', async () => {
      repository.updateProfile.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
      repository.findById.mockResolvedValue({
        ...mockSavedData,
        login: 'NewAnna',
        age: 0,
        description: '',
      });

      const service = new UsersService(repository);
      const dto = { login: 'NewAnna', age: 0, description: '' };
      const result = await service.updateProfile(dto, 1);

      expect(repository.updateProfile).toHaveBeenCalledExactlyOnceWith(dto, 1);
      expect(repository.findById).toHaveBeenCalledExactlyOnceWith(1);
      expect(result).toEqual({
        id: 1,
        login: 'NewAnna',
        email: 'anna@example.com',
        age: 0,
        description: '',
      });
    });

    it('Сохраняет хеш нового пароля, а не исходный пароль', async () => {
      repository.updateProfile.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
      repository.findById.mockResolvedValue(mockSavedData);

      const service = new UsersService(repository);
      const password = 'NewPassword123!';
      const result = await service.updateProfile({ password }, 1);

      expect(repository.updateProfile).toHaveBeenCalledTimes(1);
      const [data, userId] = repository.updateProfile.mock.calls[0];

      expect(userId).toBe(1);
      expect(data).not.toHaveProperty('password');
      expect(data.passwordHash).toBeTypeOf('string');
      if (typeof data.passwordHash !== 'string') {
        throw new Error('Репозиторий не получил хеш пароля');
      }
      await expect(bcrypt.compare(password, data.passwordHash)).resolves.toBe(
        true,
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('password');
    });

    it.each([{}, { login: undefined }])(
      'Отклоняет обновление без данных: %j',
      async (dto) => {
        const service = new UsersService(repository);

        await expect(service.updateProfile(dto, 1)).rejects.toThrow(
          new BadRequestException(ERRORS_MESSAGE.UPDATE_DATA_NOT_FOUND),
        );
        expect(repository.updateProfile).not.toHaveBeenCalled();
      },
    );

    it.each(['login', 'email', 'password', 'age', 'description'])(
      'Отклоняет null в поле %s',
      async (field) => {
        const dto = plainToInstance(UpdateProfileDto, { [field]: null });
        const service = new UsersService(repository);

        await expect(service.updateProfile(dto, 1)).rejects.toThrow(
          new BadRequestException(ERRORS_MESSAGE.NOT_NULL_PROFILE_FIELDS),
        );
        expect(repository.updateProfile).not.toHaveBeenCalled();
      },
    );

    it('Возвращает 404, если обновлять некого', async () => {
      repository.updateProfile.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });
      const service = new UsersService(repository);

      await expect(service.updateProfile({ age: 30 }, 99)).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('Преобразует нарушение уникальности в конфликт', async () => {
      const driverError = Object.assign(new Error('Duplicate login'), {
        code: '23505',
      });
      repository.updateProfile.mockRejectedValue(
        new QueryFailedError('', [], driverError),
      );
      const service = new UsersService(repository);

      await expect(service.updateProfile({ login: 'Ivan' }, 1)).rejects.toThrow(
        ConflictException,
      );
      expect(repository.findById).not.toHaveBeenCalled();
    });

    it('Передаёт другую ошибку БД без изменений', async () => {
      const driverError = Object.assign(new Error('Connection error'), {
        code: '08006',
      });
      const error = new QueryFailedError('', [], driverError);
      repository.updateProfile.mockRejectedValue(error);
      const service = new UsersService(repository);

      await expect(service.updateProfile({ age: 30 }, 1)).rejects.toBe(error);
    });
  });

  describe('deleteProfile', () => {
    it('Удаляет пользователя по id и не возвращает тело ответа', async () => {
      repository.deleteProfile.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
      const service = new UsersService(repository);

      await expect(service.deleteProfile(1)).resolves.toBeUndefined();
      expect(repository.deleteProfile).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('Возвращает 404, если пользователь не найден или уже удалён', async () => {
      repository.deleteProfile.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });
      const service = new UsersService(repository);

      await expect(service.deleteProfile(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Передаёт ошибку удаления без изменений', async () => {
      const error = new Error('Не удалось удалить пользователя');
      repository.deleteProfile.mockRejectedValue(error);
      const service = new UsersService(repository);

      await expect(service.deleteProfile(1)).rejects.toBe(error);
    });
  });

  describe('getUsers', () => {
    it('Возвращает всех пользователей без пагинации, исключая passwordHash и deleted', async () => {
      const secondUser = {
        ...mockSavedData,
        id: 2,
        login: 'Ivan',
        email: 'ivan@example.com',
        age: 30,
        passwordHash: 'anotherPasswordHash',
        description: 'Второй пользователь',
      };

      repository.findAll.mockResolvedValue([[mockSavedData, secondUser], 2]);

      const service = new UsersService(repository);
      const result = await service.getUsers({ page: 1 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: undefined,
        limit: undefined,
        age: undefined,
      });
      expect(result).toEqual({
        items: [
          {
            id: 1,
            login: 'Anna',
            email: 'anna@example.com',
            age: 25,
            description: 'Описание',
          },
          {
            id: 2,
            login: 'Ivan',
            email: 'ivan@example.com',
            age: 30,
            description: 'Второй пользователь',
          },
        ],
        total: 2,
      });
    });

    it('Передаёт поиск по логину вместе с пагинацией', async () => {
      repository.findAll.mockResolvedValue([[], 0]);

      const service = new UsersService(repository);

      await service.getUsers({
        page: 2,
        limit: 10,
        login: 'ann',
      });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: 10,
        limit: 10,
        age: undefined,
        login: 'ann',
      });
    });

    it('Запрашивает первую страницу со смещением 0', async () => {
      repository.findAll.mockResolvedValue([[mockSavedData], 1]);

      const service = new UsersService(repository);

      await service.getUsers({ page: 1, limit: 10 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: 0,
        limit: 10,
        age: undefined,
      });
    });

    it('Вычисляет смещение страницы и сохраняет общее количество из репозитория', async () => {
      repository.findAll.mockResolvedValue([[mockSavedData], 21]);

      const service = new UsersService(repository);
      const result = await service.getUsers({ page: 3, limit: 10 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: 20,
        limit: 10,
        age: undefined,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(21);
    });

    it('Передаёт фильтр возраста 0 без пагинации', async () => {
      repository.findAll.mockResolvedValue([[], 0]);

      const service = new UsersService(repository);

      await service.getUsers({ page: 1, age: 0 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: undefined,
        limit: undefined,
        age: 0,
      });
    });

    it('Передаёт фильтр возраста вместе с пагинацией', async () => {
      repository.findAll.mockResolvedValue([[mockSavedData], 6]);

      const service = new UsersService(repository);

      await service.getUsers({ page: 2, limit: 5, age: 25 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: 5,
        limit: 5,
        age: 25,
      });
    });

    it('Не применяет пагинацию, если передана только страница без limit', async () => {
      repository.findAll.mockResolvedValue([[mockSavedData], 1]);

      const service = new UsersService(repository);

      await service.getUsers({ page: 3 });

      expect(repository.findAll).toHaveBeenCalledExactlyOnceWith({
        offset: undefined,
        limit: undefined,
        age: undefined,
      });
    });

    it('Возвращает пустой список и total 0, если пользователей нет', async () => {
      repository.findAll.mockResolvedValue([[], 0]);

      const service = new UsersService(repository);
      const result = await service.getUsers({ page: 1 });

      expect(result).toEqual({ items: [], total: 0 });
    });

    it('Сохраняет total, если запрошенная страница пуста', async () => {
      repository.findAll.mockResolvedValue([[], 12]);

      const service = new UsersService(repository);
      const result = await service.getUsers({ page: 3, limit: 10 });

      expect(result).toEqual({ items: [], total: 12 });
    });

    it('Передаёт ошибку репозитория без изменений', async () => {
      const databaseError = new Error('Не удалось получить пользователей');

      repository.findAll.mockRejectedValue(databaseError);

      const service = new UsersService(repository);

      await expect(service.getUsers({ page: 1 })).rejects.toBe(databaseError);
    });
  });
});
