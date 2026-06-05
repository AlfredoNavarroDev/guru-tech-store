import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * @purpose Persiste hash del refresh token para permitir revocación.
 * JWT es stateless → sin BD no se puede revocar antes de expiración.
 * Guarda solo HASH (bcrypt), nunca el token en claro.
 */
@Entity('refreshtokens')
export class RefreshToken {
  // bigint → evita overflow con alta rotación de tokens.
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  // Sin relación TypeORM → entidad liviana, join solo cuando se necesita.
  @Column({ name: 'id_empleado', type: 'int', nullable: false })
  id_empleado: number;

  // bcrypt.compare contra el token presentado en cada uso.
  @Column({ name: 'token_hash', type: 'text', nullable: false })
  token_hash: string;

  // Fecha absoluta. Permite limpiar tokens expirados con cron.
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expires_at: Date;

  // true = revocado (logout/rotación). Refresh siempre filtra revoked=false.
  @Column({ name: 'revoked', type: 'boolean', default: false, nullable: false })
  revoked: boolean;

  // Auditoría: antigüedad de sesiones activas.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
