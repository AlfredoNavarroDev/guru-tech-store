import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * @purpose Estrategia Passport JWT para @UseGuards(JwtAuthGuard).
 * Extrae token de Authorization header, verifica firma + expiración,
 * y expone payload en request.user (accesible vía @CurrentUser()).
 * Solo valida access tokens; refresh tokens se validan en AuthService.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Nunca true en producción.
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  /** Payload ya verificado (firma + expiración). Retorno → request.user. */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
