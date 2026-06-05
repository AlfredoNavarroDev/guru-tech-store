import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @purpose Guard que protege rutas con JWT Bearer Token.
 * Delega extracción y validación a JwtStrategy. Token inválido → 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
