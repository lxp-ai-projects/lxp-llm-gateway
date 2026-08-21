import { Equals, IsObject } from 'class-validator';
import type { PgsGroundingInput } from '@lxp/contracts';

export class EvaluationProbeDto {
  @Equals('pgs-grounding-v1')
  profileId!: 'pgs-grounding-v1';

  @IsObject()
  input!: PgsGroundingInput;
}
