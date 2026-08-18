import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';

import { CreateEmailChallengeDto } from './dto/create-email-challenge.dto';
import { VerifyEmailChallengeDto } from './dto/verify-email-challenge.dto';

test('registration verification DTOs require an email and a six-digit code', async () => {
  const validEmail = Object.assign(new CreateEmailChallengeDto(), {
    email: 'person@example.com',
  });
  const invalidEmail = Object.assign(new CreateEmailChallengeDto(), {
    email: 'not-an-email',
  });
  const validCode = Object.assign(new VerifyEmailChallengeDto(), {
    code: '123456',
  });
  const invalidCode = Object.assign(new VerifyEmailChallengeDto(), {
    code: '12345a',
  });

  assert.equal((await validate(validEmail)).length, 0);
  assert.ok((await validate(invalidEmail)).length > 0);
  assert.equal((await validate(validCode)).length, 0);
  assert.ok((await validate(invalidCode)).length > 0);
});
