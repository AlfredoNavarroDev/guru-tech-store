import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Devuelve un mensaje simple para verificar que el servidor está activo.
  getHello(): string {
    return 'Hello World!';
  }
}
