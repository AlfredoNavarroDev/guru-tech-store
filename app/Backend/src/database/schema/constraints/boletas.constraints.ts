export const dropBoletaXorConstraint =
  'ALTER TABLE "boletas" DROP CONSTRAINT IF EXISTS "chk_boleta_xor"';

export const addBoletaXorVentaReparacionCambioConstraint = `
  ALTER TABLE "boletas" ADD CONSTRAINT "chk_boleta_xor" CHECK (
    ((id_venta IS NOT NULL)::int + (id_reparacion IS NOT NULL)::int + (id_cambio IS NOT NULL)::int) = 1
  )
`;

export const addBoletaXorVentaReparacionConstraint = `
  ALTER TABLE "boletas" ADD CONSTRAINT "chk_boleta_xor" CHECK (
    (id_venta IS NOT NULL AND id_reparacion IS NULL)
    OR (id_venta IS NULL AND id_reparacion IS NOT NULL)
  )
`;
