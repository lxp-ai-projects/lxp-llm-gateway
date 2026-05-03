import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateTenantPolicyDto {
  @IsOptional()
  @IsNumberString()
  monthlyBudgetUsd?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dailyRequestLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyRequestLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  requestsPerMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tokensPerMinute?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthlyTokenLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  imageRequestsPerMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxInputTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxOutputTokens?: number;

  @IsOptional()
  @IsBoolean()
  allowPromptLogging?: boolean;

  @IsOptional()
  @IsBoolean()
  allowResponseLogging?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  retentionDays?: number;
}
