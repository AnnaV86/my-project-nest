import { UpdateResult } from 'typeorm';
import type { User } from '../entities/users.entity.js';
import { FindUsersOptions, UpdateUserData } from '../types.js';

export type CreateUserData = Omit<User, 'id'>;
/**Абстрактный класс для запросов в БД */
export abstract class UsersRepository {
  abstract create(data: CreateUserData): Promise<User>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findByLogin(login: string): Promise<User | null>;
  abstract findById(id: number): Promise<User | null>;
  abstract findAll(options: FindUsersOptions): Promise<[User[], number]>;
  abstract updateProfile(
    data: UpdateUserData,
    id: number,
  ): Promise<UpdateResult>;
  abstract deleteProfile(id: number): Promise<UpdateResult>;
}
