import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege rutas con JWT Bearer. Delega validación a JwtStrategy. Token inválido → 401. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
