// app/Backend/src/propietario/propietario.module.ts
import { Module } from '@nestjs/common';
import { PropietarioController } from './propietario.controller';
import { PropietarioService } from './propietario.service';
import { PdfService } from '../common/pdf.service';

@Module({
  controllers: [PropietarioController],
  providers: [PropietarioService, PdfService],
})
export class PropietarioModule {}
