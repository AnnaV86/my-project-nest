import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository, UpdateResult } from 'typeorm';
import { FindUsersOptions, UpdateUserData } from './types.js';
import { User } from './users.entity.js';
import { CreateUserData, UsersRepository } from './users.repository.js';

/**Запросы в БД */
@Injectable()
export class TypeOrmUsersRepository extends UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.userRepository.create(data);
    return await this.userRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  findByLogin(login: string): Promise<User | null> {
    return this.userRepository.findOneBy({ login });
  }

  findById(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  findAll({
    offset: skip,
    limit: take,
    age,
    login,
  }: FindUsersOptions): Promise<[User[], number]> {
    return this.userRepository.findAndCount({
      where: {
        ...(age !== undefined ? { age } : {}),
        ...(login !== undefined ? { login: ILike(`%${login}%`) } : {}),
      },
      order: { id: 'ASC' },
      ...(take !== undefined ? { skip, take } : {}),
    });
  }

  updateProfile(dto: UpdateUserData, userId: number): Promise<UpdateResult> {
    return this.userRepository.update({ id: userId, deleted: IsNull() }, dto);
  }

  deleteProfile(userId: number): Promise<UpdateResult> {
    return this.userRepository.softDelete({
      id: userId,
      deleted: IsNull(),
    });
  }
}
