// Payload del JWT con información mínima para autorizar sin consultar BD.
export interface JwtPayload {
  // id_empleado (RFC 7519: 'sub' = subject).
  sub: number;

  // Sede del empleado para filtrado multi-sede.
  id_sede: number;

  // Roles para guards (@Roles) sin consultar BD.
  roles: string[];

  // Nombre para UI sin llamada extra.
  nombre: string;
}
