import { SetMetadata } from '@nestjs/common';

/** Clave compartida entre @Roles() y RolesGuard. */
export const ROLES_KEY = 'roles';

/** Marca handler/clase con roles requeridos. Usar con RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
