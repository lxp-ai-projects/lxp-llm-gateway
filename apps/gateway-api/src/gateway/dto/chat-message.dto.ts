import { IsIn, IsString, MinLength } from 'class-validator';

export class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  content!: string;
}
