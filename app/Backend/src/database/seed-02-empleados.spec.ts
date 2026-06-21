import type { QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { seedEmpleados } from './seed-02-empleados';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('seedEmpleados', () => {
  it('inserta empleados de los 4 roles (admin, vendedor, técnico, abastecedor) en 2 sedes', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hash-admin-vendedor' as never);

    const query = jest.fn().mockResolvedValue(undefined);
    const qr = { query } as unknown as QueryRunner;

    await seedEmpleados(qr);

    const insertCall = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO Empleados'),
    );

    expect(insertCall).toBeDefined();
    const insertSql = String(insertCall?.[0]);

    // Admin sede 1
    expect(insertSql).toContain("'10002001'");
    expect(insertSql).toContain("'Admin Lima Centro'");
    // Vendedor sede 1
    expect(insertSql).toContain("'10003001'");
    // Técnico sede 1
    expect(insertSql).toContain("'10004001'");
    // Abastecedor sede 1
    expect(insertSql).toContain("'10005001'");
    // Abastecedor sede 2
    expect(insertSql).toContain("'10005002'");
    // Todos activos salvo el suspendido
    expect(insertSql).toContain("'activo'");
    expect(insertSql).toContain("'suspendido'");
  });
});
