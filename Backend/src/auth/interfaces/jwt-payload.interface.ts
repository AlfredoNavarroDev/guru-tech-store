/**
 * @purpose Payload del JWT. Mínima información para autorizar sin BD.
 * Datos sensibles (password_hash) nunca van aquí.
 */
export interface JwtPayload {
  /** id_empleado. Convención RFC 7519: 'sub' = subject. */
  sub: number;

  /** Sede del empleado para filtrado multi-sede. */
  id_sede: number;

  /** Roles para guards (@Roles) sin consultar BD. */
  roles: string[];

  /** Nombre para UI sin llamada extra. */
  nombre: string;
}
