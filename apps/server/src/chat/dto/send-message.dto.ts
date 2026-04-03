import { IsString, IsIn, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsUUID() clientMsgId: string;
  @IsString() chatId: string;
  @IsString() recipientId: string;
  @IsString() content: string;
  @IsIn(['text', 'image', 'audio']) type: 'text' | 'image' | 'audio';
}