import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// Controlador raíz: única ruta GET / para health check del servidor.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint raíz de health check.
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
