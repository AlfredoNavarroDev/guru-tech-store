import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';
import type { JwtPayload } from '../types';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();

    // set_config con tercer parámetro true = LOCAL (dura solo el request actual).
    if (request.user?.sub) {
      await this.dataSource.query(
        `SELECT set_config('app.actor_id', $1, true)`,
        [String(request.user.sub)],
      );
    }

    return next.handle();
  }
}
