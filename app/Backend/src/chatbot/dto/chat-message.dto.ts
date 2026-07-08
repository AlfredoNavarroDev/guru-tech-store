// app/Backend/src/chatbot/dto/chat-message.dto.ts
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CoreMessage } from 'ai';

// DTO que valida el cuerpo de cada petición al endpoint POST /chatbot/messages
export class ChatMessageDto {
  // ID opcional de conversación (reservado para uso futuro)
  @IsOptional()
  @IsString()
  id?: string;

  // Historial completo de mensajes en formato CoreMessage (user/assistant/tool)
  @IsArray()
  messages!: CoreMessage[];

  // Nombre de la pantalla activa en el frontend; se inyecta en el system prompt para contexto
  @IsOptional()
  @IsString()
  @MaxLength(100)
  context_page?: string;

  // Payload extra opcional que puede enviar el SDK de AI (metadatos de stream, etc.)
  @IsOptional()
  data?: unknown;
}
