import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { CatalogoService } from './catalogo.service';
import type { QueryCatalogoDto } from './dto/query-catalogo.dto';

describe('CatalogoService', () => {
  let service: CatalogoService;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogoService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<CatalogoService>(CatalogoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('queries by id_sede only when no filters provided', async () => {
      console.log('\n🔍 Acción   : findAll(1, {}) — sin filtros');
      console.log(
        '📌 Espera   : SQL contiene "WHERE id_sede = $1", params[0] = 1',
      );

      await service.findAll(1, {});

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "WHERE id_sede = $1" =',
        sql.includes('WHERE id_sede = $1'),
        '| params[0] =',
        params[0],
      );

      expect(sql).toContain('WHERE id_sede = $1');
      expect(params[0]).toBe(1);
    });

    it('always appends ORDER BY producto', async () => {
      console.log('\n🔍 Acción   : findAll(1, {}) — verificar orden');
      console.log('📌 Espera   : SQL termina con ORDER BY producto');

      await service.findAll(1, {});

      const [sql] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "ORDER BY producto" =',
        sql.includes('ORDER BY producto'),
      );

      expect(sql).toContain('ORDER BY producto');
    });

    it('returns results from dataSource.query', async () => {
      console.log(
        '\n🔍 Acción   : findAll(1, {}) — verificar que retorna lo que devuelve la BD',
      );
      console.log(
        '📌 Espera   : resultado = [{ id_item:1, producto:"Laptop" }]',
      );

      const rows = [{ id_item: 1, producto: 'Laptop' }];
      dataSource.query.mockResolvedValue(rows);

      const result = await service.findAll(1, {});

      console.log('✅ Resultado:', JSON.stringify(result));

      expect(result).toEqual(rows);
    });

    it('appends nombre ILIKE filter without categoria or marca', async () => {
      console.log(
        '\n🔍 Acción   : findAll(1, { nombre:"laptop" }) — sin categoria ni marca',
      );
      console.log(
        '📌 Espera   : SQL contiene ILIKE, params incluye "%laptop%"',
      );

      await service.findAll(1, { nombre: 'laptop' });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene ILIKE =',
        sql.includes('ILIKE'),
        '| param nombre =',
        params.find((p: unknown) => String(p).includes('laptop')),
      );

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%laptop%');
    });

    it('appends con_stock filter without categoria or marca', async () => {
      console.log(
        '\n🔍 Acción   : findAll(1, { con_stock:true }) — sin categoria ni marca',
      );
      console.log('📌 Espera   : SQL contiene "stock_disponible > 0"');

      await service.findAll(1, { con_stock: true });

      const [sql] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "stock_disponible > 0" =',
        sql.includes('stock_disponible > 0'),
      );

      expect(sql).toContain('stock_disponible > 0');
    });

    it('uses JOIN when categoria is provided', async () => {
      console.log('\n🔍 Acción   : findAll(1, { categoria:3 })');
      console.log(
        '📌 Espera   : SQL usa JOIN item_categorias con ic.id_categoria, params incluye 3',
      );

      await service.findAll(1, { categoria: 3 });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene item_categorias =',
        sql.includes('item_categorias'),
        '| ic.id_categoria presente =',
        sql.includes('ic.id_categoria'),
        '| params =',
        params,
      );

      expect(sql).toContain('item_categorias');
      expect(sql).toContain('ic.id_categoria');
      expect(params).toContain(3);
    });

    it('adds marca filter inside categoria branch', async () => {
      console.log('\n🔍 Acción   : findAll(1, { categoria:3, marca:2 })');
      console.log(
        '📌 Espera   : SQL contiene ic.id_categoria AND id_marca, params incluye 3 y 2',
      );

      await service.findAll(1, { categoria: 3, marca: 2 });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: ic.id_categoria =',
        sql.includes('ic.id_categoria'),
        '| id_marca =',
        sql.includes('id_marca'),
        '| params =',
        params,
      );

      expect(sql).toContain('ic.id_categoria');
      expect(sql).toContain('id_marca');
      expect(params).toContain(2);
      expect(params).toContain(3);
    });

    it('uses JOIN when only marca is provided (no categoria)', async () => {
      console.log('\n🔍 Acción   : findAll(1, { marca:5 }) — sin categoria');
      console.log(
        '📌 Espera   : SQL usa JOIN Items con id_marca, params incluye 5',
      );

      await service.findAll(1, { marca: 5 });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene JOIN Items =',
        sql.includes('JOIN Items'),
        '| id_marca =',
        sql.includes('id_marca'),
        '| params =',
        params,
      );

      expect(sql).toContain('JOIN Items');
      expect(sql).toContain('id_marca');
      expect(params).toContain(5);
    });

    it('applies nombre filter inside marca-only branch', async () => {
      console.log('\n🔍 Acción   : findAll(1, { marca:5, nombre:"mouse" })');
      console.log('📌 Espera   : SQL contiene ILIKE, params incluye "%mouse%"');

      await service.findAll(1, {
        marca: 5,
        nombre: 'mouse',
      });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene ILIKE =',
        sql.includes('ILIKE'),
        '| param nombre =',
        params.find((p: unknown) => String(p).includes('mouse')),
      );

      expect(sql).toContain('ILIKE');
      expect(params).toContain('%mouse%');
    });

    it('applies con_stock filter inside marca-only branch', async () => {
      console.log('\n🔍 Acción   : findAll(1, { marca:5, con_stock:true })');
      console.log('📌 Espera   : SQL contiene "stock_disponible > 0"');

      await service.findAll(1, {
        marca: 5,
        con_stock: true,
      });

      const [sql] = dataSource.query.mock.calls[0];
      console.log(
        '✅ Resultado: SQL contiene "stock_disponible > 0" =',
        sql.includes('stock_disponible > 0'),
      );

      expect(sql).toContain('stock_disponible > 0');
    });

    it('applies all filters together in categoria branch', async () => {
      console.log(
        '\n🔍 Acción   : findAll(2, { categoria:1, marca:3, nombre:"mouse", con_stock:true })',
      );
      console.log(
        '📌 Espera   : SQL contiene id_categoria + id_marca + ILIKE + stock_disponible > 0',
      );

      await service.findAll(2, {
        categoria: 1,
        marca: 3,
        nombre: 'mouse',
        con_stock: true,
      });

      const [sql, params] = dataSource.query.mock.calls[0];
      console.log('✅ Resultado:');
      console.log('   ic.id_categoria:', sql.includes('ic.id_categoria'));
      console.log('   id_marca       :', sql.includes('id_marca'));
      console.log('   ILIKE          :', sql.includes('ILIKE'));
      console.log('   con_stock      :', sql.includes('stock_disponible > 0'));
      console.log('   params         :', params);

      expect(sql).toContain('ic.id_categoria');
      expect(sql).toContain('id_marca');
      expect(sql).toContain('ILIKE');
      expect(sql).toContain('stock_disponible > 0');
      expect(params).toContain(2);
      expect(params).toContain(1);
      expect(params).toContain(3);
      expect(params).toContain('%mouse%');
    });
  });
});
