import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MapPin,
  Clock,
  FileText,
  Search
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface VerificationResult {
  eligible: boolean;
  declarations: Array<{
    id: string;
    disaster_type: string;
    severity_level: number;
    declaration_date: string;
    declaration_authority: string;
    description: string;
    lga_registry?: {
      lga_name: string;
      lga_code: string;
    };
  }>;
  exemption_type: string;
  lga_name?: string;
  compliance_note: string;
}

export default function Verification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [postcode, setPostcode] = useState("");
  const [providerType, setProviderType] = useState<"GP" | "NP">("GP");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Find active disasters affecting this postcode
      const { data: disasters, error: disastersError } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          declaration_authority,
          expiry_date,
          description,
          lga_registry (
            lga_name,
            lga_code
          )
        `)
        .eq('declaration_status', 'active')
        .contains('postcodes', [postcode]);

      if (disastersError) throw disastersError;

      const isEligible = disasters && disasters.length > 0;
      const exemptionType = isEligible ? "Natural Disaster (MBS Note AN.1.1)" : "No exemption";
      
      // Generate compliance note
      let complianceNote = "";
      if (isEligible && disasters.length > 0) {
        const disaster = disasters[0];
        const currentDate = new Date().toLocaleString('en-AU');
        
        if (providerType === "NP") {
          complianceNote = `NOVEMBER 2025 NP TELEHEALTH COMPLIANCE VERIFICATION

Date: ${currentDate}
Patient Postcode: ${postcode}
Provider Type: Nurse Practitioner

DISASTER EXEMPTION VERIFICATION:
✓ Active disaster declaration confirmed
✓ 12-month face-to-face requirement WAIVED due to natural disaster
✓ November 2025 NP telehealth rules compliance verified

Declaration Details:
- LGA: ${disaster.lga_registry?.lga_name} (${disaster.lga_registry?.lga_code})
- Disaster Type: ${disaster.disaster_type.charAt(0).toUpperCase() + disaster.disaster_type.slice(1)}
- Authority: ${disaster.declaration_authority}
- Severity Level: ${disaster.severity_level}/5
- Declaration Date: ${new Date(disaster.declaration_date).toLocaleString('en-AU')}

COMPLIANCE STATUS: ELIGIBLE FOR NP TELEHEALTH
Exemption Category: People affected by natural disaster, defined as living in a local government area declared a natural disaster by a State or Territory government.`;
        } else {
          complianceNote = `GP TELEHEALTH DISASTER EXEMPTION VERIFICATION

Date: ${currentDate}
Patient Postcode: ${postcode}
Provider Type: General Practitioner

DISASTER EXEMPTION VERIFICATION:
✓ Active disaster declaration confirmed
✓ 12-month relationship requirement WAIVED due to natural disaster
✓ Geographic restrictions LIFTED under disaster exemption

Declaration Details:
- LGA: ${disaster.lga_registry?.lga_name} (${disaster.lga_registry?.lga_code})
- Disaster Type: ${disaster.disaster_type.charAt(0).toUpperCase() + disaster.disaster_type.slice(1)}
- Authority: ${disaster.declaration_authority}
- Severity Level: ${disaster.severity_level}/5
- Declaration Date: ${new Date(disaster.declaration_date).toLocaleString('en-AU')}

COMPLIANCE STATUS: ELIGIBLE FOR GP TELEHEALTH
Exemption Type: Natural Disaster (MBS Note AN.1.1)`;
        }
      } else {
        complianceNote = `TELEHEALTH ELIGIBILITY VERIFICATION

Date: ${new Date().toLocaleString('en-AU')}
Patient Postcode: ${postcode}
Provider Type: ${providerType}

VERIFICATION RESULT: NO ACTIVE DISASTER DECLARATION
- No current natural disaster declarations affect postcode ${postcode}
- Standard telehealth eligibility rules apply
- ${providerType === "NP" ? "12-month face-to-face relationship required (effective Nov 1, 2025)" : "Standard GP telehealth rules apply"}

COMPLIANCE STATUS: STANDARD TELEHEALTH RULES APPLY`;
      }

      // Enhanced verification with full audit trail
      const enhancedVerificationData = {
        postcode,
        providerType,
        userId: user.id,
        practitionerDetails: {
          providerName: "Current User", // Would get from user profile
          practiceName: "Practice Name" // Would get from practice registration
        }
      };

      try {
        const { data: enhancedResult } = await supabase.functions.invoke('enhanced-verification', {
          body: enhancedVerificationData
        });

        if (enhancedResult?.success) {
          console.log('✓ Enhanced verification completed with audit trail');
        } else {
          console.warn('Enhanced verification failed, falling back to basic logging');
          // Fallback to basic verification logging
          const { error: logError } = await supabase
            .from('verification_logs')
            .insert({
              user_id: user.id,
              patient_postcode: postcode,
              provider_type: providerType,
              verification_result: isEligible,
              compliance_note: complianceNote,
              exemption_type: exemptionType,
              disaster_declarations: disasters || [],
              declaration_ids: disasters?.map(d => d.id) || []
            });

          if (logError) throw logError;
        }
      } catch (enhancedError) {
        console.error('Enhanced verification error:', enhancedError);
        // Fallback to basic verification logging
        const { error: logError } = await supabase
          .from('verification_logs')
          .insert({
            user_id: user.id,
            patient_postcode: postcode,
            provider_type: providerType,
            verification_result: isEligible,
            compliance_note: complianceNote,
            exemption_type: exemptionType,
            disaster_declarations: disasters || [],
            declaration_ids: disasters?.map(d => d.id) || []
          });

        if (logError) throw logError;
      }

      setResult({
        eligible: isEligible,
        declarations: disasters || [],
        exemption_type: exemptionType,
        lga_name: disasters?.[0]?.lga_registry?.lga_name,
        compliance_note: complianceNote
      });

      toast({
        title: "Verification Complete",
        description: isEligible 
          ? "Patient eligible for disaster exemption telehealth"
          : "No active disaster declaration for this postcode",
        variant: isEligible ? "default" : "destructive"
      });

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to verify disaster status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (level: number) => {
    if (level >= 5) return <Badge variant="destructive">Critical</Badge>;
    if (level >= 4) return <Badge variant="destructive">Severe</Badge>;
    if (level >= 3) return <Badge variant="secondary">Moderate</Badge>;
    return <Badge variant="outline">Minor</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Disaster Verification</h1>
        <p className="text-muted-foreground">
          Verify patient eligibility for disaster-area telehealth exemptions
        </p>
      </div>

      {/* Verification Form */}
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Patient Verification
          </CardTitle>
          <CardDescription>
            Enter patient details to verify disaster exemption eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerification} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Patient Postcode</Label>
                <Input
                  id="postcode"
                  type="text"
                  placeholder="e.g., 4870"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-type">Provider Type</Label>
                <Select value={providerType} onValueChange={(value: "GP" | "NP") => setProviderType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GP">General Practitioner (GP)</SelectItem>
                    <SelectItem value="NP">Nurse Practitioner (NP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {providerType === "NP" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>November 2025 NP Rules:</strong> Enhanced compliance requirements apply. 
                  Natural disaster exemptions waive the 12-month face-to-face relationship requirement.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={loading || !postcode}
            >
              {loading ? (
                <>
                  <Search className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Verify Eligibility
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {result && (
        <Card className={`shadow-medical border-l-4 ${result.eligible ? 'border-l-success' : 'border-l-muted'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.eligible ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              Verification Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-background border">
              <div>
                <h3 className="font-semibold">
                  {result.eligible ? "✅ ELIGIBLE FOR TELEHEALTH" : "❌ NOT ELIGIBLE"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Postcode {postcode} • {providerType} Provider
                </p>
              </div>
              <Badge variant={result.eligible ? "default" : "secondary"}>
                {result.exemption_type}
              </Badge>
            </div>

            {result.eligible && result.declarations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Active Disaster Declarations
                </h4>
                {result.declarations.map((declaration, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-destructive/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h5 className="font-medium capitalize">
                          {declaration.disaster_type} Emergency
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {declaration.lga_registry?.lga_name}
                        </p>
                      </div>
                      {getSeverityBadge(declaration.severity_level)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><MapPin className="inline h-3 w-3 mr-1" />{declaration.declaration_authority}</p>
                      <p><Clock className="inline h-3 w-3 mr-1" />
                        Declared: {new Date(declaration.declaration_date).toLocaleDateString('en-AU')}
                      </p>
                      {declaration.description && (
                        <p className="text-muted-foreground">{declaration.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Compliance Note
                </h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate("/compliance", { 
                    state: { 
                      complianceNote: result.compliance_note,
                      postcode,
                      providerType,
                      eligible: result.eligible 
                    }
                  })}
                >
                  Generate Full Note
                </Button>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {result.compliance_note}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}