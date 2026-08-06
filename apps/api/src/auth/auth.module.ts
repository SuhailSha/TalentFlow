import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { EnvConfig } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule is registered async so it can read secrets from ConfigService.
    // registerAsync is required here — JwtModule.register() with a static
    // secret would be evaluated before ConfigModule loads env vars.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    // Guards are also provided here so they can be injected wherever needed
    // (e.g., the APP_GUARD registration in AppModule looks them up via DI).
    JwtAuthGuard,
    LocalAuthGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
