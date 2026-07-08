import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';
import { Empleado } from '../auth/entities/empleado.entity';
import { Rol } from '../auth/entities/rol.entity';

// Módulo de empleados. Necesita Rol para validar la FK id_rol al crear o actualizar.
@Module({
  imports: [TypeOrmModule.forFeature([Empleado, Rol])],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
})
export class EmpleadosModule {}
