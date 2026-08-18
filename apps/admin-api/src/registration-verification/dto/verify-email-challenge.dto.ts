import { Matches } from 'class-validator';
export class VerifyEmailChallengeDto {
  @Matches(/^\d{6}$/) code!: string;
}
