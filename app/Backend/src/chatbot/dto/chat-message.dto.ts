// app/Backend/src/chatbot/dto/chat-message.dto.ts
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import type { CoreMessage } from 'ai';

export class ChatMessageDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsArray()
  messages!: CoreMessage[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  context_page?: string;

  @IsOptional()
  data?: unknown;
}
