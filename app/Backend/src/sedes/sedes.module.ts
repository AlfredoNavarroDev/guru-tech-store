// app/Backend/src/sedes/sedes.module.ts
import { Module } from '@nestjs/common';
import { SedesController } from './sedes.controller';

@Module({ controllers: [SedesController] })
export class SedesModule {}
