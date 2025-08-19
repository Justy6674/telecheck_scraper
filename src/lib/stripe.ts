import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Product/Price IDs - Update these after creating products in Stripe Dashboard
export const STRIPE_PRODUCTS = {
  SINGLE_PRACTITIONER: {
    name: 'Single Practitioner',
    priceId: 'price_single_test', // TODO: Replace with actual price ID
    price: 37.80,
    verifications: 100,
    overagePrice: 0.50
  },
  PRACTICE: {
    name: 'Practice',
    priceId: 'price_practice_test', // TODO: Replace with actual price ID
    price: 149.00,
    verifications: 500,
    overagePrice: 0.30
  },
  ENTERPRISE: {
    name: 'Multiple Practices',
    priceId: 'price_enterprise_test', // TODO: Replace with actual price ID
    price: 499.00,
    verifications: 2000,
    overagePrice: 0.15
  }
};

// Helper to get product by price ID
export function getProductByPriceId(priceId: string) {
  return Object.values(STRIPE_PRODUCTS).find(p => p.priceId === priceId);
}

// Helper to calculate overage charges
export function calculateOverageCharge(tier: string, verificationsUsed: number, verificationsLimit: number): number {
  if (verificationsUsed <= verificationsLimit) return 0;
  
  const overage = verificationsUsed - verificationsLimit;
  const product = STRIPE_PRODUCTS[tier as keyof typeof STRIPE_PRODUCTS];
  
  if (!product) return 0;
  
  return overage * product.overagePrice;
}