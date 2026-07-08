// app/Backend/src/chatbot/guards/chatbot-rate-limit.guard.ts
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtPayload } from '../../common/types';

// Guard que limita las peticiones al chatbot por usuario usando una ventana deslizante de 60 s
@Injectable()
export class ChatbotRateLimitGuard implements CanActivate {
  // Mapa en memoria: id de usuario → timestamps de sus peticiones recientes
  private readonly requests = new Map<number, number[]>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const userId = req.user?.sub;
    if (userId == null) return false;

    // Límite configurable vía variable de entorno, por defecto 20 rpm
    const maxRpm =
      this.config.get<number>('CHATBOT_MAX_REQUESTS_PER_MINUTE') ?? 20;
    const now = Date.now();
    const windowStart = now - 60_000;

    // Filtra solo los timestamps dentro de la ventana actual (último minuto)
    const timestamps = (this.requests.get(userId) ?? []).filter(
      (t) => t > windowStart,
    );

    // Limpia la entrada del mapa si ya no hay peticiones recientes
    if (timestamps.length === 0) {
      this.requests.delete(userId);
    } else {
      this.requests.set(userId, timestamps);
    }

    if (timestamps.length >= maxRpm) {
      throw new HttpException(
        'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Registra la petición actual antes de permitirla
    timestamps.push(now);
    this.requests.set(userId, timestamps);
    return true;
  }
}
