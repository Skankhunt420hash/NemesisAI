import Stripe from 'stripe';

function getStripeSecretFromEnv(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe not configured: set STRIPE_SECRET_KEY');
  }
  return secretKey;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function getUncachableStripeClient() {
  return new Stripe(getStripeSecretFromEnv(), {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export async function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}
