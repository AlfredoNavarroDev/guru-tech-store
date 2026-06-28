import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  addBoletaXorVentaReparacionCambioConstraint,
  addBoletaXorVentaReparacionConstraint,
  dropBoletaXorConstraint,
} from '../database/schema/constraints/boletas.constraints';

export class UpdateBoletaXorForCambios1781900000002 implements MigrationInterface {
  name = 'UpdateBoletaXorForCambios1781900000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropBoletaXorConstraint);
    await queryRunner.query(addBoletaXorVentaReparacionCambioConstraint);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(dropBoletaXorConstraint);
    await queryRunner.query(addBoletaXorVentaReparacionConstraint);
  }
}
