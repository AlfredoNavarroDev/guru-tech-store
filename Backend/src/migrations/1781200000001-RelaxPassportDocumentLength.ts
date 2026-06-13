import { MigrationInterface, QueryRunner } from 'typeorm';

export class RelaxPassportDocumentLength1781200000001 implements MigrationInterface {
  name = 'RelaxPassportDocumentLength1781200000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE empleados DROP CONSTRAINT IF EXISTS chk_nro_doc_len_empleado`,
    );
    await queryRunner.query(`
      ALTER TABLE empleados
      ADD CONSTRAINT chk_nro_doc_len_empleado CHECK (
        (tipo_documento = 'DNI'       AND char_length(nro_documento) = 8)
        OR (tipo_documento = 'CE'        AND char_length(nro_documento) = 12)
        OR (tipo_documento = 'pasaporte' AND char_length(nro_documento) BETWEEN 6 AND 9)
      )
    `);

    await queryRunner.query(
      `ALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_nro_doc_len_cliente`,
    );
    await queryRunner.query(`
      ALTER TABLE clientes
      ADD CONSTRAINT chk_nro_doc_len_cliente CHECK (
        (tipo_documento = 'DNI'       AND char_length(nro_documento) = 8)
        OR (tipo_documento = 'CE'        AND char_length(nro_documento) = 12)
        OR (tipo_documento = 'pasaporte' AND char_length(nro_documento) BETWEEN 6 AND 9)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE clientes DROP CONSTRAINT IF EXISTS chk_nro_doc_len_cliente`,
    );
    await queryRunner.query(`
      ALTER TABLE clientes
      ADD CONSTRAINT chk_nro_doc_len_cliente CHECK (
        (tipo_documento = 'DNI'       AND char_length(nro_documento) = 8)
        OR (tipo_documento = 'CE'        AND char_length(nro_documento) = 12)
        OR (tipo_documento = 'pasaporte' AND char_length(nro_documento) = 9)
      )
    `);

    await queryRunner.query(
      `ALTER TABLE empleados DROP CONSTRAINT IF EXISTS chk_nro_doc_len_empleado`,
    );
    await queryRunner.query(`
      ALTER TABLE empleados
      ADD CONSTRAINT chk_nro_doc_len_empleado CHECK (
        (tipo_documento = 'DNI'       AND char_length(nro_documento) = 8)
        OR (tipo_documento = 'CE'        AND char_length(nro_documento) = 12)
        OR (tipo_documento = 'pasaporte' AND char_length(nro_documento) = 9)
      )
    `);
  }
}
