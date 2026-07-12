import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDeadViews1784500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const deadViews = [
      'v_gerente_cambios',
      'v_gerente_compras',
      'v_gerente_empleados',
      'v_gerente_inventario',
      'v_gerente_reparaciones',
      'v_gerente_ventas',
      'v_tecnico_estados_reparacion',
      'v_tecnico_historial_reparaciones',
      'v_tecnico_reparaciones_activas',
      'v_tecnico_repuestos_disponibles',
      'v_historial_cliente_ventas',
      'v_historial_cliente_reparaciones',
      'v_propietario_inventario_global',
      'v_propietario_reparaciones_global',
      'v_propietario_sedes',
      'v_abastecedor_proveedores',
    ];
    for (const view of deadViews) {
      await queryRunner.query(`DROP VIEW IF EXISTS ${view}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dead views are not restored — they were unused
  }
}
