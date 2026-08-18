export type VerificationChannel = 'email';

export interface VerificationDeliveryProvider {
  readonly channel: VerificationChannel;
  isReady(): boolean;
  sendChallenge(input: {
    tenantDisplayName: string;
    destination: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void>;
}
