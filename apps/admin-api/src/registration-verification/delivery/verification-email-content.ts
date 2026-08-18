export function buildVerificationEmailContent(input: {
  tenantDisplayName: string;
  code: string;
  expiresInMinutes: number;
}) {
  const escapedTenantName = input.tenantDisplayName
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  return {
    subject: `${input.tenantDisplayName}: your verification code`,
    text: `Your ${input.tenantDisplayName} verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Your <strong>${escapedTenantName}</strong> verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:3px">${input.code}</p><p>It expires in ${input.expiresInMinutes} minutes.</p><p>If you did not request this, you can ignore this email.</p>`,
  };
}
