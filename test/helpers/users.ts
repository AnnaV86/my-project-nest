import { vi } from 'vitest';
import type { CreateUserDto } from '../../src/users/dto/create-user.dto.js';
import type { User } from '../../src/users/users.entity.js';
import type { UsersRepository } from '../../src/users/users.repository.js';

export const registrationData = {
  login: 'Anna',
  email: 'anna@example.com',
  password: 'ExamplePassword123!',
  age: 25,
  description: 'Люблю котиков',
} satisfies CreateUserDto;

export function createUserFixture(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    login: 'Anna',
    email: 'anna@example.com',
    passwordHash: 'test-password-hash',
    age: 25,
    description: 'Люблю котиков',
    deleted: null,
    ...overrides,
  };
}

export function createUsersRepositoryMock() {
  return {
    create: vi.fn<UsersRepository['create']>(),
    findByEmail: vi.fn<UsersRepository['findByEmail']>(),
    findByLogin: vi.fn<UsersRepository['findByLogin']>(),
    findById: vi.fn<UsersRepository['findById']>(),
    findAll: vi.fn<UsersRepository['findAll']>(),
    updateProfile: vi.fn<UsersRepository['updateProfile']>(),
    deleteProfile: vi.fn<UsersRepository['deleteProfile']>(),
  };
}
