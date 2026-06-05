import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Empleado } from './entities/empleado.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * @purpose Configura Passport + JWT asíncrono (secreto desde .env).
 * Exporta JwtModule/PassportModule para que otros módulos protejan rutas.
 */
@Module({
  imports: [
    // Estrategia JWT por defecto para todas las rutas protegidas.
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // registerAsync → lee JWT_SECRET del .env en runtime, no en compile-time.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          // Access token de vida corta. Cast requerido por @nestjs/jwt.
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '7d',
          ) as unknown as number,
        },
      }),
    }),

    // Entidades para @InjectRepository en AuthService.
    TypeOrmModule.forFeature([Empleado, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],

  // Otros módulos verifican tokens sin reconfigurar.
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
