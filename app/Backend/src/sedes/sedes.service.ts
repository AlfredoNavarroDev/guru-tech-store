// app/Backend/src/sedes/sedes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';

export interface SedeRow {
  id_sede: number;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  hora_apertura: string | null;
  hora_cierre: string | null;
  esta_habilitada: boolean;
}

@Injectable()
export class SedesService {
  constructor(private readonly dataSource: DataSource) {}

  getSedes(): Promise<SedeRow[]> {
    return this.dataSource.query<SedeRow[]>(`
      SELECT id_sede, nombre, direccion, telefono,
             to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
             to_char(hora_cierre, 'HH24:MI')   AS hora_cierre,
             esta_habilitada
      FROM sedes
      ORDER BY id_sede ASC
    `);
  }

  async createSede(dto: CreateSedeDto, userId: number): Promise<SedeRow> {
    const rows = await this.dataSource.query<SedeRow[]>(`
      INSERT INTO sedes (nombre, direccion, telefono, hora_apertura, hora_cierre, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_sede, nombre, direccion, telefono,
                to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
                to_char(hora_cierre, 'HH24:MI')   AS hora_cierre,
                esta_habilitada
    `, [
      dto.nombre,
      dto.direccion ?? null,
      dto.telefono ?? null,
      dto.hora_apertura ?? null,
      dto.hora_cierre ?? null,
      userId,
    ]);
    return rows[0];
  }

  async updateSede(id: number, dto: UpdateSedeDto): Promise<SedeRow> {
    const rows = await this.dataSource.query<SedeRow[]>(`
      UPDATE sedes
      SET nombre        = COALESCE($1, nombre),
          direccion     = COALESCE($2, direccion),
          telefono      = COALESCE($3, telefono),
          hora_apertura = COALESCE($4, hora_apertura),
          hora_cierre   = COALESCE($5, hora_cierre),
          updated_at    = now()
      WHERE id_sede = $6
      RETURNING id_sede, nombre, direccion, telefono,
                to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
                to_char(hora_cierre, 'HH24:MI')   AS hora_cierre,
                esta_habilitada
    `, [
      dto.nombre ?? null,
      dto.direccion ?? null,
      dto.telefono ?? null,
      dto.hora_apertura ?? null,
      dto.hora_cierre ?? null,
      id,
    ]);
    if (!rows.length) throw new NotFoundException(`Sede ${id} no encontrada`);
    return rows[0];
  }

  async toggleSede(id: number): Promise<SedeRow> {
    const rows = await this.dataSource.query<SedeRow[]>(`
      UPDATE sedes
      SET esta_habilitada = NOT esta_habilitada,
          updated_at      = now()
      WHERE id_sede = $1
      RETURNING id_sede, nombre, direccion, telefono,
                to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
                to_char(hora_cierre, 'HH24:MI')   AS hora_cierre,
                esta_habilitada
    `, [id]);
    if (!rows.length) throw new NotFoundException(`Sede ${id} no encontrada`);
    return rows[0];
  }
}
