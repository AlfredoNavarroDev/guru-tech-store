// app/Backend/src/chatbot/chatbot.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types';
import { ChatbotService } from './chatbot.service';
import { ChatbotRateLimitGuard } from './guards/chatbot-rate-limit.guard';
import { ChatMessageDto } from './dto/chat-message.dto';

// Controlador principal del chatbot: expone los tres endpoints que usa el frontend
@ApiTags('chatbot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // Recibe el historial de mensajes y hace streaming de la respuesta del LLM al cliente
  @Post('messages')
  @HttpCode(200)
  @UseGuards(ChatbotRateLimitGuard)
  @ApiOperation({ summary: 'HU-20/21 — Stream de respuesta del chatbot' })
  async streamChat(
    @Body() dto: ChatMessageDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    await this.chatbotService.streamChat(dto, user, res);
  }

  // Devuelve 4 preguntas sugeridas adaptadas al rol y métricas reales del usuario
  @Get('suggestions')
  @ApiOperation({
    summary: 'HU-20 — Sugerencias dinámicas según rol y datos reales',
  })
  getSuggestions(@CurrentUser() user: JwtPayload): Promise<string[]> {
    return this.chatbotService.getSuggestions(user);
  }

  // Genera un texto de bienvenida con las métricas clave del día según el rol
  @Get('resumen')
  @ApiOperation({
    summary: 'Resumen diario personalizado según rol del empleado',
  })
  getResumenDiario(
    @CurrentUser() user: JwtPayload,
  ): Promise<{ resumen: string }> {
    return this.chatbotService
      .getResumenDiario(user)
      .then((resumen) => ({ resumen }));
  }
}
