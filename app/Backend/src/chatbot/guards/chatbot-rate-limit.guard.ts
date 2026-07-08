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

@Injectable()
export class ChatbotRateLimitGuard implements CanActivate {
  private readonly requests = new Map<number, number[]>();

  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const userId = req.user?.sub;
    if (userId == null) return false;

    const maxRpm =
      this.config.get<number>('CHATBOT_MAX_REQUESTS_PER_MINUTE') ?? 20;
    const now = Date.now();
    const windowStart = now - 60_000;

    const timestamps = (this.requests.get(userId) ?? []).filter(
      (t) => t > windowStart,
    );

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

    timestamps.push(now);
    this.requests.set(userId, timestamps);
    return true;
  }
}
