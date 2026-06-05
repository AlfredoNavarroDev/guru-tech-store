import { SetMetadata } from '@nestjs/common';

/** Clave compartida entre @Roles() y RolesGuard para evitar typos. */
export const ROLES_KEY = 'roles';

/**
 * @purpose Marca handler/clase con roles requeridos.
 * Usar con RolesGuard. Ej: @Roles('administrador', 'vendedor').
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
