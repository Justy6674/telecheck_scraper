"use client";

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { STRIPE_PRODUCTS } from '@/lib/stripe';

interface PricingCardProps {
  tier: 'SINGLE_PRACTITIONER' | 'PRACTICE' | 'ENTERPRISE';
  isPopular?: boolean;
  onSelectPlan: (priceId: string) => Promise<void>;
}

export function PricingCard({ tier, isPopular = false, onSelectPlan }: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const product = STRIPE_PRODUCTS[tier];

  const handleSelectPlan = async () => {
    try {
      setIsLoading(true);
      await onSelectPlan(product.priceId);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = {
    SINGLE_PRACTITIONER: [
      `${product.verifications} verifications per month`,
      'Basic postcode verification',
      'Email support',
      'API access',
      `$${product.overagePrice} per additional verification`
    ],
    PRACTICE: [
      `${product.verifications} verifications per month`,
      'Advanced disaster details',
      'Priority support',
      'API access & embedding',
      'Multiple users (up to 5)',
      `$${product.overagePrice} per additional verification`
    ],
    ENTERPRISE: [
      `${product.verifications} verifications per month`,
      'Full disaster information',
      'Dedicated support',
      'White-label options',
      'Unlimited users',
      'Custom integrations',
      `$${product.overagePrice} per additional verification`
    ]
  };

  const icons = {
    SINGLE_PRACTITIONER: '🩺',
    PRACTICE: '🏥',
    ENTERPRISE: '👑'
  };

  const descriptions = {
    SINGLE_PRACTITIONER: 'Perfect for small practices with occasional disaster verification needs',
    PRACTICE: 'For busy practices requiring regular disaster verification and enhanced features',
    ENTERPRISE: 'For large practices and healthcare organisations with high-volume needs'
  };

  return (
    <Card className={`relative ${isPopular ? 'border-blue-500 shadow-lg' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center pb-8">
        <div className="text-4xl mb-4">{icons[tier]}</div>
        <CardTitle className="text-2xl font-bold">{product.name}</CardTitle>
        <CardDescription className="mt-2">
          {descriptions[tier]}
        </CardDescription>
        <div className="mt-6">
          <span className="text-4xl font-bold">${product.price}</span>
          <span className="text-gray-600 ml-2">per month</span>
        </div>
        <div className="text-sm text-gray-600 mt-2">
          {product.verifications} verifications included
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="font-semibold text-sm">What's included:</div>
        <ul className="space-y-3">
          {features[tier].map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          size="lg"
          variant={isPopular ? "default" : "outline"}
          onClick={handleSelectPlan}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Get Started'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PricingSection() {
  const handleSelectPlan = async (priceId: string) => {
    // Call the API to create a Stripe checkout session
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await response.json();
    
    if (data.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } else {
      throw new Error('Failed to create checkout session');
    }
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-600">
          Medicare-compliant telehealth verification for Australian healthcare providers
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        <PricingCard 
          tier="SINGLE_PRACTITIONER" 
          onSelectPlan={handleSelectPlan}
        />
        <PricingCard 
          tier="PRACTICE" 
          isPopular={true}
          onSelectPlan={handleSelectPlan}
        />
        <PricingCard 
          tier="ENTERPRISE" 
          onSelectPlan={handleSelectPlan}
        />
      </div>

      <div className="text-center mt-12 text-sm text-gray-600">
        <p>All plans include:</p>
        <p className="mt-2">
          ✓ Real-time disaster data • ✓ Medicare compliance • ✓ Audit trail • ✓ SSL encryption
        </p>
        <p className="mt-4 font-semibold">
          🔒 Secure payment processing by Stripe
        </p>
      </div>
    </div>
  );
}