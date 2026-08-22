import {
  Equals,
  IsDefined,
  IsObject,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class EvaluationRequestDto {
  @IsString()
  @Equals('1')
  schemaVersion!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  profileId!: string;

  @IsDefined()
  @IsObject()
  input!: Record<string, unknown>;
}
