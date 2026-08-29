import type { IdentityActionPurpose } from '../domain/model.js';

export interface IdentityActionDelivery {
  deliver(input: {
    email: string;
    purpose: IdentityActionPurpose;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
}

export class DisabledIdentityActionDelivery implements IdentityActionDelivery {
  async deliver(): Promise<void> {
    // The Mail module replaces this adapter through the composition root.
  }
}
