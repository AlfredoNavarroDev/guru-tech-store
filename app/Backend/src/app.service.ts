import { Injectable } from '@nestjs/common';

// Servicio raíz: lógica mínima de health check inyectable en AppController.
@Injectable()
export class AppService {
  // Devuelve un mensaje simple para verificar que el servidor está activo.
  getHello(): string {
    return 'Hello World!';
  }
}
