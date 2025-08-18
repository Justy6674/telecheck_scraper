import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Shield, 
  Users, 
  Zap, 
  CheckCircle,
  Star,
  Stethoscope,
  ArrowRight,
  CreditCard,
  Clock,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ComingSoonDialog } from "@/components/ui/ComingSoonDialog";

const Subscribe = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [showComingSoon, setShowComingSoon] = useState(false);

  const plans = [
    {
      id: 'starter' as const,
      name: 'Single Practitioner',
      price: '$37.80',
      period: 'per month',
      description: 'Perfect for small practices with occasional disaster verification needs',
      icon: Shield,
      verifications: '100',
      popular: false,
      features: [
        '100 verifications per month',
        'Basic postcode verification',
        'Standard compliance notes',
        'Email support',
        'Australian disaster data'
      ],
      limitations: [
        'No bulk verification',
        'No API access',
        'No priority support'
      ]
    },
    {
      id: 'professional' as const,
      name: 'Practice',
      price: '$149',
      period: 'per month',
      description: 'For busy practices requiring regular disaster verification and enhanced features',
      icon: Users,
      verifications: '500',
      popular: true,
      features: [
        '500 verifications included',
        'Additional verifications at $0.30 each',
        'Advanced compliance documentation',
        'Practice dashboard and analytics',
        'Priority email support',
        'Real-time notifications',
        'Bulk verification tools',
        'Usage reporting'
      ],
      limitations: []
    },
    {
      id: 'enterprise' as const,
      name: 'Multiple Practices',
      price: '$499',
      period: 'per month',
      description: 'For large practices and healthcare organisations with high-volume needs',
      icon: Crown,
      verifications: '2000',
      popular: false,
      features: [
        '2000 verifications included',
        'Additional verifications at $0.15 each',
        'API access for integrations',
        'Practice management system connectors',
        'Dedicated account manager',
        'Phone support (business hours)',
        'Custom compliance templates',
        'White-label options',
        'Advanced analytics and reporting'
      ],
      limitations: []
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Instant Verification',
      description: 'Results in under 3 seconds for all Australian postcodes'
    },
    {
      icon: Shield,
      title: 'MBS Compliant',
      description: 'Automatically generates documentation meeting all Medicare requirements'
    },
    {
      icon: BarChart3,
      title: 'Usage Analytics',
      description: 'Track verification patterns and practice efficiency metrics'
    },
    {
      icon: Clock,
      title: '24/7 Availability',
      description: 'Access disaster verification any time, including weekends and holidays'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl shadow-medical">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary cursor-pointer" onClick={() => navigate("/")}>
                  TeleCheck
                </h1>
                <p className="text-sm text-muted-foreground">Australian Telehealth Disaster Verification</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Select the perfect plan for your practice. All plans include real-time disaster verification 
              and MBS-compliant documentation. Upgrade or downgrade anytime.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`shadow-medical relative cursor-pointer transition-all duration-200 ${
                  plan.popular 
                    ? 'border-primary shadow-lg scale-105' 
                    : selectedPlan === plan.id 
                      ? 'border-primary' 
                      : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mx-auto mb-4">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.price !== 'Free' && (
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {plan.verifications} verifications{plan.price !== 'Free' ? ' included' : ' per month'}
                    </div>
                  </div>
                  <CardDescription className="text-center">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold">What's included:</h4>
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button 
                    className={`w-full ${plan.popular ? 'bg-gradient-primary' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => setShowComingSoon(true)}
                  >
                    {plan.name === 'Single Practitioner' ? 'Get Started' : 'Start 14-Day Trial'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  {plan.name !== 'Single Practitioner' && (
                    <p className="text-xs text-center text-muted-foreground">
                      No credit card required for trial
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Key Features */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle className="text-center">All Plans Include</CardTitle>
              <CardDescription className="text-center">
                Core features available across all subscription tiers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {features.map((feature, index) => (
                  <div key={index} className="text-center space-y-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl mx-auto">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="shadow-medical">
            <CardHeader>
              <CardTitle>Subscription FAQ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-semibold">Can I change plans?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                    with pro-rated billing adjustments.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">What happens if I exceed my limit?</h4>
                  <p className="text-sm text-muted-foreground">
                    Additional verifications are charged at the rate shown for your plan. You'll receive 
                    notifications when approaching your limit.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Is there a contract?</h4>
                  <p className="text-sm text-muted-foreground">
                    No long-term contracts. All subscriptions are month-to-month and can be cancelled 
                    anytime from your account settings.
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold">Do you offer refunds?</h4>
                  <p className="text-sm text-muted-foreground">
                    We offer a 30-day money-back guarantee for new subscriptions. Contact support if 
                    you're not completely satisfied.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Security */}
          <Card className="shadow-medical bg-accent/5 border-accent/20">
            <CardContent className="py-6">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Secure Payments</span>
                </div>
                <div className="text-sm text-muted-foreground">•</div>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Australian Privacy Act Compliant</span>
                </div>
                <div className="text-sm text-muted-foreground">•</div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">PCI DSS Certified</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Questions about pricing or need a custom solution?
            </p>
            <Button variant="outline" onClick={() => navigate("/contact")}>
              Contact Our Team
            </Button>
          </div>
        </div>
        
        <ComingSoonDialog 
          open={showComingSoon} 
          onOpenChange={setShowComingSoon} 
        />
      </div>
    </div>
  );
};

export default Subscribe;