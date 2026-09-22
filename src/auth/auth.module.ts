import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { RegistrationController } from './controllers/registration.controller.js';
import { RefreshSession } from './entities/refresh-session.entity.js';
import { AuthGuard } from './guards/auth.guard.js';
import { RefreshSessionsRepository } from './repositories/refresh-sessions.repository.js';
import { TypeOrmRefreshSessionsRepository } from './repositories/typeorm-refresh-sessions.repository.js';
import { AuthService } from './services/auth.service.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '24h',
          algorithm: 'HS256',
        },
        verifyOptions: {
          algorithms: ['HS256'],
        },
      }),
    }),
    TypeOrmModule.forFeature([RefreshSession]),
  ],
  controllers: [AuthController, RegistrationController],
  providers: [
    AuthService,
    AuthGuard,
    {
      provide: RefreshSessionsRepository,
      useClass: TypeOrmRefreshSessionsRepository,
    },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
