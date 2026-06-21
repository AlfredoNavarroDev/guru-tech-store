// Payload del JWT con información mínima para autorizar sin consultar BD.
export interface JwtPayload {
  // id_empleado (RFC 7519: 'sub' = subject).
  sub: number;

  // Sede del empleado para filtrado multi-sede. Null para propietario (sin sede fija).
  id_sede: number | null;

  // Rol único del empleado para guards (@Roles) sin consultar BD.
  rol: string;

  // Nombre para UI sin llamada extra.
  nombre: string;
}
