import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Observable } from 'rxjs';
import type { JwtPayload } from '../types';

/** Interceptor de auditoría: inyecta el id del actor en la sesión PostgreSQL para triggers de auditoría. */
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
      await this.dataSource
        .createQueryBuilder()
        .select(`set_config('app.actor_id', :id, true)`, 'v')
        .setParameter('id', String(request.user.sub))
        .getRawOne();
    }

    return next.handle();
  }
}
