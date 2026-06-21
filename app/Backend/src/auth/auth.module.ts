import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Empleado } from './entities/empleado.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

// Configura Passport + JWT asíncrono. Exporta JwtModule para que otros módulos protejan rutas.
@Module({
  imports: [
    // Estrategia JWT por defecto para todas las rutas protegidas.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // registerAsync lee JWT_SECRET del .env en runtime.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '30m') as StringValue,
        },
      }),
    }),

    // Entidades usadas con @InjectRepository en AuthService.
    TypeOrmModule.forFeature([Empleado, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],

  // Exporta JwtModule y PassportModule para que otros módulos verifiquen tokens.
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
