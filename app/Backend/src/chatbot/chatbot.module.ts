// app/Backend/src/chatbot/chatbot.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { ChatbotRateLimitGuard } from './guards/chatbot-rate-limit.guard';

// Módulo que agrupa el controlador, el servicio y el guard de rate limit del chatbot
@Module({
  imports: [ConfigModule],
  controllers: [ChatbotController],
  providers: [ChatbotService, ChatbotRateLimitGuard],
})
export class ChatbotModule {}
