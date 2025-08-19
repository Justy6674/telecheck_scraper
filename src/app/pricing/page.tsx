import { PricingSection } from '@/components/pricing/PricingCards';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto py-8">
        <PricingSection />
      </div>
    </div>
  );
}