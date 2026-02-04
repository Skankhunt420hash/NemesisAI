import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );

    await WebhookHandlers.handleStripeEvent(event);
  }

  static async handleStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === 'active' || subscription.status === 'trialing') {
          const customerId = typeof subscription.customer === 'string' 
            ? subscription.customer 
            : subscription.customer.id;
          
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUser(user.id, {
              isPro: true,
              stripeSubscriptionId: subscription.id,
            });
            console.log(`[stripe] User ${user.id} upgraded to Pro`);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        
        const user = await storage.getUserByStripeCustomerId(customerId);
        if (user) {
          await storage.updateUser(user.id, {
            isPro: false,
            stripeSubscriptionId: null,
          });
          console.log(`[stripe] User ${user.id} subscription canceled`);
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const customerId = typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id;
          
          if (customerId) {
            const user = await storage.getUserByStripeCustomerId(customerId);
            if (user) {
              const subscriptionId = typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription.id;
              
              await storage.updateUser(user.id, {
                isPro: true,
                stripeSubscriptionId: subscriptionId,
              });
              console.log(`[stripe] User ${user.id} completed checkout, upgraded to Pro`);
            }
          }
        }
        break;
      }
    }
  }
}
