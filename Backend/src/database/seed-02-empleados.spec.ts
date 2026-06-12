import type { QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { seedEmpleados } from './seed-02-empleados';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('seedEmpleados', () => {
  it('inserta un administrador activo de sede para probar Sprint 1', async () => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hash-admin-vendedor' as never);

    const query = jest.fn().mockResolvedValue(undefined);
    const qr = { query } as unknown as QueryRunner;

    await seedEmpleados(qr);

    const insertCall = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO Empleados'),
    );

    expect(insertCall).toBeDefined();
    const insertSql = String(insertCall?.[0]);
    expect(insertSql).toContain("'10002001'");
    expect(insertSql).toContain("'Admin Sprint 1'");
    expect(insertSql).toContain("'activo'");
    expect(insertSql).toContain(', 2)');
  });
});
