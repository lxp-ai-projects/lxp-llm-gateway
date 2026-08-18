import { IsEmail, MaxLength } from 'class-validator';
export class CreateEmailChallengeDto {
  @IsEmail() @MaxLength(320) email!: string;
}
