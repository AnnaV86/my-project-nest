import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './controllers/profile.controller.js';
import { UserController } from './controllers/users.controller.js';
import { User } from './entities/users.entity.js';
import { TypeOrmUsersRepository } from './repositories/typeorm-users.repository.js';
import { UsersRepository } from './repositories/users.repository.js';
import { UsersService } from './services/users.service.js';

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
