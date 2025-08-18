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
import { StatePopulationTiles } from "@/components/StatePopulationTiles";
import AdminFooter from "@/components/AdminFooter";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postcode, setPostcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ eligible: boolean; postcode: string; declarations: any[]; message: string } | null>(null);
  const [activeDisasters, setActiveDisasters] = useState<{ id: string; disaster_type: string; severity_level: number; declaration_date: string; state_code: string; lga_name: string }[]>([]);

  useEffect(() => {
    // Always fetch current active disasters for display
    fetchActiveDisasters();
  }, []);

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
      const { data: postcodeRow, error: pcErr } = await supabase
        .from('postcodes')
        .select(`
          postcode,
          suburb,
          lgas:primary_lga_id (
            lga_code,
            name
          )
        `)
        .eq('postcode', postcode)
        .maybeSingle();

      if (pcErr || !postcodeRow?.lgas?.lga_code) {
        throw pcErr || new Error('Postcode not found');
      }

      const lgaCode = postcodeRow.lgas.lga_code;

      const { data: disasters, error } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          event_name,
          description,
          severity_level,
          declaration_date,
          declaration_authority,
          expiry_date,
          agrn_reference,
          source_url,
          state_code
        `)
        .eq('declaration_status', 'active')
        .eq('lga_code', lgaCode)
        .order('declaration_date', { ascending: false });

      if (error) throw error;

      const isEligible = disasters && disasters.length > 0;
      setResult({
        eligible: isEligible,
        postcode,
        declarations: disasters || [],
        message: isEligible 
          ? "This postcode may be within an area subject to a current disaster declaration. Please speak with your healthcare team to confirm whether Medicare telehealth rebates may apply to your situation."
          : "We couldn't find a current disaster declaration for this postcode. This does not determine your eligibility for Medicare rebates. Please speak with your healthcare team."
      });

      toast({
        title: isEligible ? "Declaration Found" : "No Current Declaration",
        description: isEligible 
          ? "Please consult your healthcare provider for eligibility"
          : "Consult your healthcare provider about telehealth options",
        variant: "default"
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
              <div className="flex items-center justify-center w-10 h-10 bg-background rounded-xl shadow-medical">
                <img src="/lovable-uploads/e4f6509d-5651-4771-b0a0-9c6149c30a93.png" alt="TeleCheck Logo" className="h-8 w-8 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">TeleCheck</h1>
                <p className="text-sm text-muted-foreground">Australian Telehealth Disaster Verification</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/telehealth-rules")}>
                Telehealth Rules
              </Button>
              <Button variant="ghost" onClick={() => navigate("/how-to-use")}>
                How to Use
              </Button>
              <Button variant="ghost" onClick={() => navigate("/faq")}>
                FAQ
              </Button>
              <Button variant="ghost" onClick={() => navigate("/about")}>
                About
              </Button>
              <Button variant="outline" onClick={() => navigate(user ? "/dashboard" : "/auth")}>
                {user ? "Dashboard" : "Sign In"}
              </Button>
              <Button onClick={() => navigate("/subscribe")} className="bg-gradient-primary">
                Subscribe
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
              Postcode Status Check
            </CardTitle>
            <CardDescription>
              General information only. Eligibility for Medicare telehealth rebates depends on your circumstances and your practitioner's assessment.
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
                     {result.eligible && (
                       <div className="text-sm p-3 rounded bg-muted/50 border">
                         <p className="text-muted-foreground">
                           For full declaration details (specific areas, severity levels, and dates), 
                           healthcare providers can <button 
                             onClick={() => navigate("/auth")} 
                             className="text-primary underline hover:text-primary/80"
                           >
                             sign in here
                           </button>.
                         </p>
                       </div>
                     )}
                  </div>
                </div>
              </Alert>
            )}

            <div className="space-y-3 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                This tool provides general information only and is not medical, legal, or billing advice. 
                Always consult your healthcare provider for eligibility and billing guidance.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={() => navigate("/auth")} className="bg-gradient-primary">
                  Ask your practitioner to check
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.open('mailto:?subject=Telehealth Eligibility Question&body=Hi Doctor,%0D%0A%0D%0AI would like to ask about my eligibility for Medicare telehealth rebates, particularly if there are any current disaster declarations that might apply to my area (postcode ' + postcode + ').%0D%0A%0D%0AThank you')}
                >
                  Email my GP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* State Population Impact Tiles */}
        <StatePopulationTiles />


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
      
      {/* Admin Footer */}
      <AdminFooter />
    </div>
  );
};

export default Index;
