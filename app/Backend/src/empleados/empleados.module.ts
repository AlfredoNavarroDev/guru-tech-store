import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';
import { Empleado } from '../auth/entities/empleado.entity';
import { Rol } from '../auth/entities/rol.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Empleado, Rol])],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}
