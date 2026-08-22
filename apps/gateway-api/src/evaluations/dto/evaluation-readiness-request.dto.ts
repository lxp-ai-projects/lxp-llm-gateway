import { IsIn } from 'class-validator';
import {
  EVALUATION_SCHEMA_VERSION,
  PGS_GROUNDING_PROFILE_ID,
} from '@lxp/contracts';

export class EvaluationReadinessRequestDto {
  @IsIn([EVALUATION_SCHEMA_VERSION])
  schemaVersion!: typeof EVALUATION_SCHEMA_VERSION;

  @IsIn([PGS_GROUNDING_PROFILE_ID])
  profileId!: typeof PGS_GROUNDING_PROFILE_ID;
}
