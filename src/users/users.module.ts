import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller.js';
import { TypeOrmUsersRepository } from './typeorm-users.repository.js';
import { UserController } from './users.controller.js';
import { User } from './users.entity.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  providers: [
    UsersService,
    { provide: UsersRepository, useClass: TypeOrmUsersRepository },
  ],
  exports: [UsersService, UsersRepository],
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [ProfileController, UserController],
})
export class UsersModule {}
