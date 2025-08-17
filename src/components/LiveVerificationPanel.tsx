import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { liveVerifyPostcode } from '@/services/disasterService';

interface LiveVerificationPanelProps {
  postcode: string
  initialResult?: any
  onUpdate?: (result: any) => void
}

export function LiveVerificationPanel({ postcode, initialResult, onUpdate }: LiveVerificationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialResult);
  const { toast } = useToast();

  const handleLiveCheck = async () => {
    setLoading(true);
    try {
      const liveResult = await liveVerifyPostcode(postcode);
      setResult(liveResult);
      onUpdate?.(liveResult);
      
      toast({
        title: "Live Verification Complete",
        description: "Sources verified against current Disaster Assist data",
        duration: 3000,
      });
    } catch (error) {
      console.error('Live verification error:', error);
      toast({
        title: "Verification Failed",
        description: "Unable to verify against live sources",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to Clipboard",
        description: `${type} copied successfully`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const openDisasterAssist = () => {
    window.open('https://www.disasterassist.gov.au/find-a-disaster/australian-disasters', '_blank');
  };

  if (!result) {
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            No verification result available. Perform a live check to verify against current sources.
          </p>
          <Button onClick={handleLiveCheck} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {loading ? 'Checking...' : 'Live Verify'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Result Card */}
      <Card className={`border-2 ${result.inDisasterZone ? 'border-warning' : 'border-success'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {result.inDisasterZone ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
              Verification Result: {postcode}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLiveCheck}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Re-check Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openDisasterAssist}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Source
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Alert */}
          <Alert className={result.inDisasterZone ? 'border-warning bg-warning/5' : 'border-success bg-success/5'}>
            <Shield className="w-4 h-4" />
            <AlertDescription className="font-medium">
              {result.inDisasterZone 
                ? `✅ DISASTER DECLARATION ACTIVE - Medicare telehealth exemption applies`
                : `ℹ️ NO ACTIVE DISASTER - Standard Medicare telehealth rules apply`
              }
            </AlertDescription>
          </Alert>

          {/* LGA Information */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">LGA</p>
              <p className="font-medium">{result.lga?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">LGA Code</p>
              <p className="font-medium font-mono">{result.lga?.code}</p>
            </div>
          </div>

          {/* Active Disasters */}
          {result.inDisasterZone && result.disasters?.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Active Disaster Declarations
              </h4>
              {result.disasters.map((disaster: any, index: number) => (
                <Card key={index} className="border-warning/20 bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h5 className="font-medium">{disaster.name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            AGRN {disaster.agrn}
                          </Badge>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {disaster.type}
                          </Badge>
                          <Badge 
                            variant={disaster.status === 'Open' ? 'destructive' : 'secondary'} 
                            className="text-xs"
                          >
                            {disaster.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(disaster.verificationUrl, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p>{new Date(disaster.startDate).toLocaleDateString('en-AU')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p>{disaster.endDate ? new Date(disaster.endDate).toLocaleDateString('en-AU') : 'Open (ongoing)'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Copy Actions */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium text-sm">Copy for Medical Records</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(result.copyableText || '', 'Summary text')}
                className="flex-1"
              >
                <Copy className="w-3 h-3 mr-2" />
                Copy Summary
              </Button>
              {result.liveVerificationNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(result.liveVerificationNotes, 'Detailed notes')}
                  className="flex-1"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Detailed Notes
                </Button>
              )}
            </div>
          </div>

          {/* Verification Timestamp */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-3">
            <Clock className="w-3 h-3" />
            Last verified: {new Date().toLocaleString('en-AU')}
            <Badge variant="outline" className="ml-auto text-xs">
              Source: Disaster Assist
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Notes Card - Collapsible */}
      {result.liveVerificationNotes && (
        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-sm">Compliance Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-3 rounded-lg">
              <pre className="text-xs whitespace-pre-wrap font-mono">
                {result.liveVerificationNotes}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}