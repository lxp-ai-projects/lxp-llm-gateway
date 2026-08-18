import assert from 'node:assert/strict';
import test from 'node:test';

import { buildVerificationEmailContent } from './verification-email-content';

test('verification email includes text and HTML without unsafe tenant markup', () => {
  const content = buildVerificationEmailContent({
    tenantDisplayName: '<Tenant & Co>',
    code: '123456',
    expiresInMinutes: 10,
  });
  assert.match(content.subject, /Tenant & Co/);
  assert.match(content.text, /123456/);
  assert.match(content.text, /10 minutes/);
  assert.match(content.html, /&lt;Tenant &amp; Co&gt;/);
  assert.doesNotMatch(content.html, /<Tenant & Co>/);
});
