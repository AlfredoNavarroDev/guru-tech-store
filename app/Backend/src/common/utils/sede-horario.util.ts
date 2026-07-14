import { DataSource } from 'typeorm';
import { SedeCerradaException } from '../exceptions/sedes.exceptions';

interface SedeHorarioRow {
  hora_apertura: string | null;
  hora_cierre: string | null;
  esta_abierta: boolean;
}

/**
 * Lanza SedeCerradaException si la hora actual (America/Lima) está fuera del
 * horario de la sede. Si la sede no tiene horario configurado, no bloquea.
 */
export async function assertSedeAbierta(
  dataSource: DataSource,
  idSede: number,
): Promise<void> {
  const [row] = await dataSource.query<SedeHorarioRow[]>(
    `SELECT
       to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
       to_char(hora_cierre,   'HH24:MI') AS hora_cierre,
       CASE
         WHEN hora_apertura IS NULL OR hora_cierre IS NULL THEN true
         WHEN (NOW() AT TIME ZONE 'America/Lima')::time
              BETWEEN hora_apertura AND hora_cierre THEN true
         ELSE false
       END AS esta_abierta
     FROM sedes
     WHERE id_sede = $1`,
    [idSede],
  );

  if (row && !row.esta_abierta) {
    throw new SedeCerradaException(row.hora_apertura!, row.hora_cierre!);
  }
}
