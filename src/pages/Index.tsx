import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Stethoscope,
  MapPin,
  Clock,
  Activity,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeDisasters, setActiveDisasters] = useState<any[]>([]);

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user) {
      navigate("/dashboard");
      return;
    }
    
    // Fetch current active disasters for display
    fetchActiveDisasters();
  }, [user, navigate]);

  const fetchActiveDisasters = async () => {
    try {
      const { data: disasters } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          state_code,
          lga_registry (
            lga_name
          )
        `)
        .eq('declaration_status', 'active')
        .order('declaration_date', { ascending: false })
        .limit(3);

      setActiveDisasters(disasters?.map(d => ({
        ...d,
        lga_name: d.lga_registry?.lga_name || 'Unknown'
      })) || []);
    } catch (error) {
      console.error('Error fetching disasters:', error);
    }
  };

  const handleQuickCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data: disasters, error } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          declaration_authority,
          lga_registry (
            lga_name,
            lga_code
          )
        `)
        .eq('declaration_status', 'active')
        .contains('postcodes', [postcode]);

      if (error) throw error;

      const isEligible = disasters && disasters.length > 0;
      setResult({
        eligible: isEligible,
        postcode,
        declarations: disasters || [],
        message: isEligible 
          ? "✅ DISASTER EXEMPTION ACTIVE - Telehealth eligible without 12-month relationship"
          : "❌ No active disaster declaration for this postcode"
      });

      toast({
        title: isEligible ? "Disaster Exemption Found" : "No Active Declaration",
        description: isEligible 
          ? "Patient eligible for telehealth exemption"
          : "Standard telehealth rules apply",
        variant: isEligible ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Quick check error:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to check disaster status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-xl shadow-medical">
                <Stethoscope className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">TeleCheck</h1>
                <p className="text-sm text-muted-foreground">Australian Telehealth Disaster Verification</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")} className="bg-gradient-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Instant MBS Telehealth
              <span className="block text-primary">Disaster Verification</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real-time verification of Australian disaster declarations for healthcare providers. 
              Ensure MBS compliance for telehealth exemptions with sub-second response times.
            </p>
          </div>

          {/* Key Features */}
          <div className="grid gap-4 md:grid-cols-3 mt-8">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
              <Shield className="h-8 w-8 text-primary" />
              <div className="text-left">
                <h3 className="font-semibold">MBS Compliant</h3>
                <p className="text-sm text-muted-foreground">November 2025 NP rules ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
              <Activity className="h-8 w-8 text-success" />
              <div className="text-left">
                <h3 className="font-semibold">Real-time Updates</h3>
                <p className="text-sm text-muted-foreground">Live government data feeds</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
              <FileText className="h-8 w-8 text-accent" />
              <div className="text-left">
                <h3 className="font-semibold">Auto Documentation</h3>
                <p className="text-sm text-muted-foreground">Generate compliant notes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Check Tool */}
        <Card className="max-w-2xl mx-auto shadow-medical border-2">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Search className="h-6 w-6 text-primary" />
              Quick Postcode Check
            </CardTitle>
            <CardDescription>
              Instantly verify if a postcode is affected by an active disaster declaration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleQuickCheck} className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter 4-digit postcode (e.g., 4870)"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                pattern="[0-9]{4}"
                maxLength={4}
                className="text-lg text-center font-mono"
                required
              />
              <Button
                type="submit"
                disabled={loading || postcode.length !== 4}
                className="px-8 bg-gradient-primary"
              >
                {loading ? "Checking..." : "Verify"}
              </Button>
            </form>

            {result && (
              <Alert className={`${result.eligible ? 'border-success bg-success/5' : 'border-muted'}`}>
                <div className="flex items-start gap-3">
                  {result.eligible ? (
                    <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="space-y-2">
                    <AlertDescription className="text-base font-medium">
                      {result.message}
                    </AlertDescription>
                    {result.eligible && result.declarations.length > 0 && (
                      <div className="space-y-2">
                        {result.declarations.map((disaster: any, index: number) => (
                          <div key={index} className="text-sm p-3 rounded bg-background border">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">{disaster.disaster_type}</span>
                              <Badge variant="destructive">Level {disaster.severity_level}</Badge>
                            </div>
                            <p className="text-muted-foreground">
                              {disaster.lga_registry?.lga_name} • {disaster.declaration_authority}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <Clock className="inline h-3 w-3 mr-1" />
                              Declared: {new Date(disaster.declaration_date).toLocaleDateString('en-AU')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
            )}

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                For full verification features and compliance documentation
              </p>
              <Button onClick={() => navigate("/auth")} className="bg-gradient-primary">
                Create Healthcare Provider Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Active Disasters */}
        {activeDisasters.length > 0 && (
          <Card className="max-w-4xl mx-auto shadow-medical">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Current Active Disasters
              </CardTitle>
              <CardDescription>
                Live disaster declarations affecting telehealth eligibility across Australia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {activeDisasters.map((disaster) => (
                  <div key={disaster.id} className="p-4 rounded-lg border bg-destructive/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{disaster.disaster_type}</span>
                      <Badge variant="destructive">Level {disaster.severity_level}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {disaster.lga_name}, {disaster.state_code}
                      </p>
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(disaster.declaration_date).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA Section */}
        <div className="text-center space-y-6 py-8">
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Ready to Streamline Your Telehealth Compliance?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of Australian healthcare providers using TeleCheck for instant 
              MBS-compliant disaster verification and automated documentation.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-gradient-primary">
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Schedule Demo
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>✓ 14-day free trial • ✓ No setup fees • ✓ Cancel anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
