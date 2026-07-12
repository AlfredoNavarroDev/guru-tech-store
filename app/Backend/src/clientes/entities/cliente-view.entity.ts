import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({ name: 'v_vendedor_clientes' })
export class ClienteView {
  @ViewColumn() id_cliente: number;
  @ViewColumn() nombre_completo: string;
  @ViewColumn() tipo_documento: string;
  @ViewColumn() nro_documento: string;
  @ViewColumn() telefono: string | null;
  @ViewColumn() direccion_completa: string | null;
  @ViewColumn() es_extranjero: boolean;
  @ViewColumn() total_compras: string;
  @ViewColumn() ultima_compra: Date | null;
  @ViewColumn() total_reparaciones: string;
  @ViewColumn() ultima_reparacion: Date | null;
}
