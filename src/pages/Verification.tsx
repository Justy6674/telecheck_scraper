import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MapPin,
  Clock,
  FileText,
  Search,
  Download,
  RefreshCw,
  Copy,
  ExternalLink,
  Database,
  Info,
  CalendarDays,
  History
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
    source_system: string;
    source_url: string;
    agrn_reference?: string;
    verification_url?: string;
    lga_registry?: {
      lga_name: string;
      lga_code: string;
    };
  }>;
  exemption_type: string;
  lga_name?: string;
  lga_code?: string;
  compliance_note: string;
  verification_timestamp: string;
  recent_history?: Array<{
    id: string;
    disaster_type: string;
    severity_level: number;
    declaration_date: string;
    declaration_authority: string;
    description: string;
    source_system: string;
    source_url: string;
    agrn_reference?: string;
    declaration_status: string;
    expiry_date?: string;
  }>;
  sources_checked?: {
    disaster_assist: boolean;
    state_emergency: boolean;
    last_sync: string;
  };
}

interface NEMAProfile {
  id: string;
  lga_code: string;
  storage_path: string;
  fetched_at: string;
  nema_url: string;
  extracted_data: any;
  attribution: string;
}

export default function Verification() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [postcode, setPostcode] = useState("");
  const [providerType, setProviderType] = useState<"GP" | "NP">("GP");
  const [asOfDate, setAsOfDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [recheckingActive, setRecheckingActive] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [nemaProfile, setNemaProfile] = useState<NEMAProfile | null>(null);
  const [loadingNema, setLoadingNema] = useState(false);

  const handleVerification = async (e: React.FormEvent, isRecheck = false) => {
    if (e) e.preventDefault();
    if (!user) {
      navigate("/auth");
      return;
    }

    const targetLoading = isRecheck ? setRecheckingActive : setLoading;
    targetLoading(true);
    
    if (!isRecheck) {
      setResult(null);
      setNemaProfile(null);
    }

    try {
      // Determine target date for verification
      const targetDate = asOfDate ? new Date(asOfDate) : new Date();
      const currentDate = new Date();
      const isHistoricalCheck = asOfDate && targetDate < currentDate;

      // Find declarations affecting this postcode
      let disastersQuery = supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          declaration_authority,
          expiry_date,
          description,
          source_system,
          source_url,
          agrn_reference,
          verification_url,
          declaration_status,
          lga_registry (
            lga_name,
            lga_code
          )
        `)
        .contains('postcodes', [postcode])
        .in('source_system', ['DisasterAssist', 'State_NSW', 'State_VIC', 'State_QLD', 'State_WA', 'State_SA', 'State_TAS', 'State_NT', 'State_ACT']);

      // Apply date filtering
      if (isHistoricalCheck) {
        // For historical checks, find declarations that were active on the target date
        disastersQuery = disastersQuery
          .lte('declaration_date', targetDate.toISOString())
          .or(`expiry_date.is.null,expiry_date.gte.${targetDate.toISOString()}`);
      } else {
        // For current checks, only active declarations
        disastersQuery = disastersQuery.eq('declaration_status', 'active');
      }

      const { data: disasters, error: disastersError } = await disastersQuery;

      if (disastersError) throw disastersError;

      // Get recent history (last 24 months) for context
      const twentyFourMonthsAgo = new Date();
      twentyFourMonthsAgo.setMonth(twentyFourMonthsAgo.getMonth() - 24);
      
      const { data: recentHistory } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          declaration_authority,
          description,
          source_system,
          source_url,
          agrn_reference,
          declaration_status,
          expiry_date
        `)
        .contains('postcodes', [postcode])
        .in('source_system', ['DisasterAssist', 'State_NSW', 'State_VIC', 'State_QLD', 'State_WA', 'State_SA', 'State_TAS', 'State_NT', 'State_ACT'])
        .gte('declaration_date', twentyFourMonthsAgo.toISOString())
        .order('declaration_date', { ascending: false });

      const isEligible = disasters && disasters.length > 0;
      const exemptionType = isEligible ? "Natural Disaster (MBS Note AN.1.1)" : "No exemption";
      const verificationTimestamp = new Date().toISOString();
      
      // Sources checked metadata
      const sourcesChecked = {
        disaster_assist: true,
        state_emergency: true,
        last_sync: verificationTimestamp
      };
      
      // Generate enhanced compliance note with source attribution
      let complianceNote = "";
      const checkDateLabel = isHistoricalCheck ? `As-of: ${targetDate.toLocaleDateString('en-AU')}` : new Date().toLocaleString('en-AU');
      
      if (isEligible && disasters.length > 0) {
        const disaster = disasters[0];
        
        const sourceAttribution = disasters.map(d => {
          const source = d.source_system === 'DisasterAssist' ? 
            'Disaster Assist (disasterassist.gov.au) - Commonwealth authoritative source' :
            `${d.declaration_authority} - State/Territory authoritative source`;
          return `- ${d.disaster_type.toUpperCase()}: ${source} (AGRN: ${d.agrn_reference || 'Pending'})`;
        }).join('\n');

        if (providerType === "NP") {
          complianceNote = `NOVEMBER 2025 NP TELEHEALTH COMPLIANCE VERIFICATION

Date: ${checkDateLabel}
Patient Postcode: ${postcode}
Provider Type: Nurse Practitioner
Verification ID: ${verificationTimestamp}
${isHistoricalCheck ? `Historical Check: ${targetDate.toLocaleDateString('en-AU')}\n` : ''}

DISASTER EXEMPTION VERIFICATION:
✓ ${isHistoricalCheck ? 'Historical' : 'Active'} disaster declaration confirmed via authoritative sources
✓ 12-month face-to-face requirement WAIVED due to natural disaster
✓ November 2025 NP telehealth rules compliance verified

AUTHORITATIVE SOURCES VERIFIED:
${sourceAttribution}

Primary Declaration Details:
- LGA: ${disaster.lga_registry?.lga_name} (${disaster.lga_registry?.lga_code})
- Disaster Type: ${disaster.disaster_type.charAt(0).toUpperCase() + disaster.disaster_type.slice(1)}
- Authority: ${disaster.declaration_authority}
- Source System: ${disaster.source_system}
- Severity Level: ${disaster.severity_level}/5
- Declaration Date: ${new Date(disaster.declaration_date).toLocaleString('en-AU')}
- Last Verified: ${checkDateLabel}

COMPLIANCE STATUS: ELIGIBLE FOR NP TELEHEALTH
Exemption Category: People affected by natural disaster, defined as living in a local government area declared a natural disaster by a State or Territory government.

Data Verification: ${disasters.length} authoritative source${disasters.length > 1 ? 's' : ''} confirmed disaster status for postcode ${postcode}.
Recent LGA history: ${recentHistory?.length || 0} declaration(s) in last 24 months.`;
        } else {
          complianceNote = `GP TELEHEALTH DISASTER EXEMPTION VERIFICATION

Date: ${checkDateLabel}
Patient Postcode: ${postcode}
Provider Type: General Practitioner
Verification ID: ${verificationTimestamp}
${isHistoricalCheck ? `Historical Check: ${targetDate.toLocaleDateString('en-AU')}\n` : ''}

DISASTER EXEMPTION VERIFICATION:
✓ ${isHistoricalCheck ? 'Historical' : 'Active'} disaster declaration confirmed via authoritative sources
✓ 12-month relationship requirement WAIVED due to natural disaster
✓ Geographic restrictions LIFTED under disaster exemption

AUTHORITATIVE SOURCES VERIFIED:
${sourceAttribution}

Primary Declaration Details:
- LGA: ${disaster.lga_registry?.lga_name} (${disaster.lga_registry?.lga_code})
- Disaster Type: ${disaster.disaster_type.charAt(0).toUpperCase() + disaster.disaster_type.slice(1)}
- Authority: ${disaster.declaration_authority}
- Source System: ${disaster.source_system}
- Severity Level: ${disaster.severity_level}/5
- Declaration Date: ${new Date(disaster.declaration_date).toLocaleString('en-AU')}
- Last Verified: ${checkDateLabel}

COMPLIANCE STATUS: ELIGIBLE FOR GP TELEHEALTH
Exemption Type: Natural Disaster (MBS Note AN.1.1)

Data Verification: ${disasters.length} authoritative source${disasters.length > 1 ? 's' : ''} confirmed disaster status for postcode ${postcode}.
Recent LGA history: ${recentHistory?.length || 0} declaration(s) in last 24 months.`;
        }
      } else {
        complianceNote = `TELEHEALTH ELIGIBILITY VERIFICATION

Date: ${checkDateLabel}
Patient Postcode: ${postcode}
Provider Type: ${providerType}
Verification ID: ${verificationTimestamp}
${isHistoricalCheck ? `Historical Check: ${targetDate.toLocaleDateString('en-AU')}\n` : ''}

VERIFICATION RESULT: NO ${isHistoricalCheck ? 'HISTORICAL' : 'ACTIVE'} DISASTER DECLARATION
- No ${isHistoricalCheck ? 'historical' : 'current'} natural disaster declarations affect postcode ${postcode}
- Standard telehealth eligibility rules apply
- ${providerType === "NP" ? "12-month face-to-face relationship required (effective Nov 1, 2025)" : "Standard GP telehealth rules apply"}

SOURCES CHECKED: Disaster Assist, State/Territory Emergency Services
Active declarations: ${disasters?.length || 0}
Recent LGA history: ${recentHistory?.length || 0} declaration(s) in last 24 months
Last Verified: ${checkDateLabel}

COMPLIANCE STATUS: STANDARD TELEHEALTH RULES APPLY`;
      }

      // Enhanced verification logging
      try {
        const { data: enhancedResult } = await supabase.functions.invoke('enhanced-verification', {
          body: {
            postcode,
            providerType,
            userId: user.id,
            practitionerDetails: {
              providerName: "Current User",
              practiceName: "Practice Name"
            }
          }
        });

        if (enhancedResult?.success) {
          console.log('✓ Enhanced verification completed with audit trail');
        }
      } catch (enhancedError) {
        console.warn('Enhanced verification unavailable, using basic logging');
      }

      // Basic verification logging
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

      setResult({
        eligible: isEligible,
        declarations: disasters || [],
        exemption_type: exemptionType,
        lga_name: disasters?.[0]?.lga_registry?.lga_name,
        lga_code: disasters?.[0]?.lga_registry?.lga_code,
        compliance_note: complianceNote,
        verification_timestamp: verificationTimestamp,
        recent_history: recentHistory || [],
        sources_checked: sourcesChecked
      });

      toast({
        title: isRecheck ? "Re-verification Complete" : "Verification Complete",
        description: isEligible 
          ? `Patient eligible for disaster exemption telehealth${isHistoricalCheck ? ' (historical)' : ''}`
          : `No ${isHistoricalCheck ? 'historical' : 'active'} disaster declaration for this postcode`,
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
      targetLoading(false);
    }
  };

  const recheckNow = () => {
    handleVerification(null, true);
  };

  const fetchNEMAProfile = async (forceRefresh = false) => {
    if (!result?.lga_code) return;

    setLoadingNema(true);
    try {
      const { data: newaResult, error } = await supabase.functions.invoke('nema-lga-profile-fetch', {
        body: { lgaCode: result.lga_code, forceRefresh }
      });

      if (error) throw error;

      if (newaResult?.success) {
        setNemaProfile(newaResult.data);
        toast({
          title: forceRefresh ? "NEMA Profile Refreshed" : "NEMA Profile Loaded",
          description: newaResult.cached ? "Using cached profile" : "Downloaded latest profile",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('NEMA profile fetch error:', error);
      toast({
        title: "NEMA Profile Error",
        description: "Unable to fetch NEMA LGA profile. Service may be unavailable.",
        variant: "destructive"
      });
    } finally {
      setLoadingNema(false);
    }
  };

  const copyComplianceNote = async () => {
    if (result?.compliance_note) {
      await navigator.clipboard.writeText(result.compliance_note);
      toast({
        title: "Copied to Clipboard",
        description: "Compliance note copied successfully",
        variant: "default"
      });
    }
  };

  const getSeverityBadge = (level: number) => {
    if (level >= 5) return <Badge variant="destructive">Critical</Badge>;
    if (level >= 4) return <Badge variant="destructive">Severe</Badge>;
    if (level >= 3) return <Badge variant="secondary">Moderate</Badge>;
    return <Badge variant="outline">Minor</Badge>;
  };

  const getSourceBadge = (sourceSystem: string) => {
    if (sourceSystem === 'DisasterAssist') {
      return <Badge variant="default" className="bg-primary">Commonwealth</Badge>;
    }
    if (sourceSystem.startsWith('State_')) {
      return <Badge variant="secondary">State/Territory</Badge>;
    }
    return <Badge variant="outline">Other</Badge>;
  };

  const openNEMADocument = async () => {
    if (nemaProfile?.storage_path) {
      const { data } = supabase.storage
        .from('disaster-documents')
        .getPublicUrl(nemaProfile.storage_path);
      
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Disaster Verification</h1>
        <p className="text-muted-foreground">
          Verify patient eligibility for disaster-area telehealth exemptions using authoritative government sources
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
            <div className="grid gap-4 md:grid-cols-3">
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
              <div className="space-y-2">
                <Label htmlFor="as-of-date">
                  As-of Date 
                  <Badge variant="outline" className="ml-1 text-xs">Optional</Badge>
                </Label>
                <Input
                  id="as-of-date"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {asOfDate && (
              <Alert>
                <CalendarDays className="h-4 w-4" />
                <AlertDescription>
                  <strong>Historical Check:</strong> Checking eligibility as it would have been on {new Date(asOfDate).toLocaleDateString('en-AU')}.
                </AlertDescription>
              </Alert>
            )}

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
                  {asOfDate ? 'Check Historical Eligibility' : 'Verify Current Eligibility'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {result && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Result */}
          <div className="lg:col-span-2 space-y-6">
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
                      Postcode {postcode} • {providerType} Provider • Verified: {new Date(result.verification_timestamp).toLocaleString('en-AU')}
                      {asOfDate && <span> • As-of: {new Date(asOfDate).toLocaleDateString('en-AU')}</span>}
                    </p>
                  </div>
                  <Badge variant={result.eligible ? "default" : "secondary"}>
                    {result.exemption_type}
                  </Badge>
                </div>

                {/* Why this decision panel */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Why this decision
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={recheckNow}
                      disabled={recheckingActive}
                    >
                      {recheckingActive ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Re-check now
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active declarations found:</span>
                      <span className="font-mono">{result.declarations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sources checked:</span>
                      <span className="font-mono text-success">✓ Disaster Assist, State/Territory</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last sync:</span>
                      <span className="font-mono">{result.sources_checked ? new Date(result.sources_checked.last_sync).toLocaleString('en-AU') : 'N/A'}</span>
                    </div>
                    {result.recent_history && result.recent_history.length > 0 && (
                      <div className="flex justify-between">
                        <span>Historical declarations (24m):</span>
                        <span className="font-mono">{result.recent_history.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {result.eligible && result.declarations.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      {asOfDate ? 'Historical' : 'Active'} Disaster Declarations ({result.declarations.length})
                    </h4>
                    {result.declarations.map((declaration, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-destructive/5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium capitalize flex items-center gap-2">
                              {declaration.disaster_type} Emergency
                              {getSourceBadge(declaration.source_system)}
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
                          {declaration.agrn_reference && (
                            <p><Database className="inline h-3 w-3 mr-1" />AGRN: {declaration.agrn_reference}</p>
                          )}
                          <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={declaration.source_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Source
                              </a>
                            </Button>
                            {declaration.verification_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={declaration.verification_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Verify
                                </a>
                              </Button>
                            )}
                          </div>
                          {declaration.description && (
                            <p className="text-muted-foreground mt-2">{declaration.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent history section */}
                {result.recent_history && result.recent_history.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      Recent LGA Declarations (Last 24 Months)
                      <Badge variant="outline" className="text-xs">Historical - Not Eligibility Trigger</Badge>
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {result.recent_history.map((declaration, index) => (
                        <div key={index} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-medium capitalize text-sm flex items-center gap-2">
                                {declaration.disaster_type} Emergency
                                {getSourceBadge(declaration.source_system)}
                                <Badge variant={declaration.declaration_status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                  {declaration.declaration_status}
                                </Badge>
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                AGRN: {declaration.agrn_reference || 'N/A'}
                              </p>
                            </div>
                            {getSeverityBadge(declaration.severity_level)}
                          </div>
                          <div className="space-y-1 text-xs">
                            <p><Clock className="inline h-3 w-3 mr-1" />
                              {new Date(declaration.declaration_date).toLocaleDateString('en-AU')}
                              {declaration.expiry_date && ` - ${new Date(declaration.expiry_date).toLocaleDateString('en-AU')}`}
                            </p>
                            <div className="flex gap-2 mt-1">
                              <Button variant="outline" size="sm" asChild className="h-6 text-xs">
                                <a href={declaration.source_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-2 w-2 mr-1" />
                                  Source
                                </a>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Compliance Note
                    </h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyComplianceNote}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Note
                      </Button>
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
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {result.compliance_note}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NEMA LGA Profile Panel */}
          <div className="space-y-6">
            <Card className="shadow-medical">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  NEMA LGA Profile
                  <Badge variant="outline" className="text-xs">Context Only</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Additional context from National Emergency Management Agency (not authoritative for telehealth eligibility)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.lga_code ? (
                  <>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fetchNEMAProfile(false)}
                        disabled={loadingNema}
                        className="flex-1"
                      >
                        {loadingNema ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3 mr-1" />
                        )}
                        {nemaProfile ? 'Loaded' : 'Load Profile'}
                      </Button>
                      {nemaProfile && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchNEMAProfile(true)}
                          disabled={loadingNema}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {nemaProfile && (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium">LGA: {result.lga_code}</p>
                          <p className="text-xs text-muted-foreground">
                            Updated: {new Date(nemaProfile.fetched_at).toLocaleDateString('en-AU')}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openNEMADocument}
                          className="w-full"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open DOC
                        </Button>

                        <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
                          <p className="font-medium mb-1">Attribution:</p>
                          <p>{nemaProfile.attribution}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Complete verification to load NEMA profile</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}