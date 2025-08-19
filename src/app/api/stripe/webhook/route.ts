import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRODUCTS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const priceId = session.metadata?.price_id;
  
  if (!userId || !priceId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get the subscription details
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // Determine the tier based on price ID
  let tier = 'single';
  let verificationLimit = 100;
  
  if (priceId === STRIPE_PRODUCTS.PRACTICE.priceId) {
    tier = 'practice';
    verificationLimit = 500;
  } else if (priceId === STRIPE_PRODUCTS.ENTERPRISE.priceId) {
    tier = 'enterprise';
    verificationLimit = 2000;
  }

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: session.customer_details?.name || 'New Organization',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: subscription.status,
      verifications_limit: verificationLimit,
      billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .select()
    .single();

  if (orgError) {
    console.error('Failed to create organization:', orgError);
    return;
  }

  // Add user to organization as admin
  const { error: userError } = await supabase
    .from('organization_users')
    .insert({
      user_id: userId,
      organization_id: org.id,
      email: session.customer_details?.email || '',
      role: 'admin',
    });

  if (userError) {
    console.error('Failed to add user to organization:', userError);
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to update subscription:', error);
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Failed to cancel subscription:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Reset verification count at the start of new billing period
  if (invoice.billing_reason === 'subscription_cycle') {
    const { error } = await supabase
      .from('organizations')
      .update({
        verifications_used: 0,
        billing_period_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', invoice.customer);

    if (error) {
      console.error('Failed to reset verification count:', error);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const { error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', invoice.customer);

  if (error) {
    console.error('Failed to update payment status:', error);
  }
}