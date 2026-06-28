# Migraciones Backend

## Regla actual

`npm run db:migrate` ejecuta solo migraciones TypeORM desde `src/migrations`. No usa archivos SQL externos.

## Orden cronológico

| Archivo | Dominio | Propósito |
| --- | --- | --- |
| `1780442077495-InitialSchema.ts` | base | Tablas, claves, constraints iniciales |
| `1780537051249-AddViewsAndTriggers.ts` | base | Funciones, triggers y vistas iniciales |
| `1780900000001-AddDocumentLengthConstraints.ts` | empleados/clientes | Valida longitud de documentos |
| `1781000000001-SingleRoleMultiCategory.ts` | empleados/items | Rol único por empleado y múltiples categorías por item |
| `1781000000002-UpdateViewsForRefactor.ts` | vistas | Ajusta vistas después del refactor de roles/categorías |
| `1781200000001-RelaxPassportDocumentLength.ts` | empleados/clientes | Relaja longitud de pasaporte |
| `1781300000001-RenameEmpleadoSueldoPago.ts` | empleados | Renombra sueldo y agrega frecuencia de pago |
| `1781400000001-AddImagenUrlToItems.ts` | items | Agrega URL de imagen |
| `1781500000001-AddImagenUrlToCatalogoView.ts` | catálogo | Expone imagen en vista de catálogo |
| `1781600000001-AddSpecsFieldsToCatalogoView.ts` | catálogo | Expone specs técnicas en vista de catálogo |
| `1781700000001-AddFechaEstimadaToReparaciones.ts` | reparaciones | Agrega fecha estimada |
| `1781900000001-AddIdCambioToBoletas.ts` | cambios/boletas | Vincula boletas con cambios |
| `1781900000002-UpdateBoletaXorForCambios.ts` | cambios/boletas | Permite XOR entre venta, reparación y cambio |

## Convención para nuevas migraciones

1. No mover ni reescribir migraciones ya aplicadas.
2. Crear migraciones pequeñas, con una intención por archivo.
3. Si SQL es largo o reutilizable, ponerlo en `src/database/schema/<dominio>/` e importarlo desde la migración.
4. Usar nombres explícitos: `AddCampoToTabla`, `UpdateVistaForCambio`, `RebuildConstraintForModulo`.
5. Mantener `up` y `down` simétricos cuando sea práctico.

## Helpers SQL

Helpers actuales:

| Archivo | Uso |
| --- | --- |
| `src/database/schema/constraints/boletas.constraints.ts` | Constraints XOR de boletas |
