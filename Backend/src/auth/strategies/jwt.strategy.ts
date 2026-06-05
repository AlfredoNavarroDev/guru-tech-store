import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

// Estrategia Passport JWT. Extrae token del header Authorization, verifica firma y expone payload en request.user.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  // Payload ya verificado (firma + expiración). Retorno → request.user.
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.sub) throw new UnauthorizedException();
    return payload;
  }
}
