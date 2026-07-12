import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Cliente } from './entities/cliente.entity';
import { ClienteView } from './entities/cliente-view.entity';

// Módulo de clientes. Exporta ClientesService para que VentasModule lo reutilice.
@Module({
  imports: [TypeOrmModule.forFeature([Cliente, ClienteView])],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
