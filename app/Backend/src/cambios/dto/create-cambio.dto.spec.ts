import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCambioDto } from './create-cambio.dto';

const validPayload = {
  id_venta_origen: 1042,
  id_item_devuelto: 10,
  cantidad: 1,
  precio_devuelto: 2200,
  id_item_entregado: 20,
  precio_entregado: 2350,
  diferencia_cobrada: 150,
  metodo_pago_dif: 'efectivo',
  motivo: 'defecto',
};

describe('CreateCambioDto', () => {
  it('acepta solo motivos soportados por cambios_producto_motivo_check', async () => {
    const dto = plainToInstance(CreateCambioDto, {
      ...validPayload,
      motivo: 'Producto defectuoso de fabrica',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'motivo')).toBe(true);
  });
});
