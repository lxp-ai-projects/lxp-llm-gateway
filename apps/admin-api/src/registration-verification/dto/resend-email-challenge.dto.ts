import { IsEmail, MaxLength } from 'class-validator';
export class ResendEmailChallengeDto {
  @IsEmail() @MaxLength(320) email!: string;
}
