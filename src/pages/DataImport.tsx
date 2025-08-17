import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  total_found?: number;
  inserted?: number;
  updated?: number;
  errors?: number;
}

export default function DataImport() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: string]: ImportResult}>({});
  const { toast } = useToast();

  const handleDisasterSync = async () => {
    setLoading('disasterassist');
    
    try {
      const response = await supabase.functions.invoke('disasterassist-sync');

      if (response.error) throw response.error;

      const result = response.data;
      setResults(prev => ({ ...prev, disasterassist: result }));

      toast({
        title: "DisasterAssist Sync Complete",
        description: `Found ${result.total_found} disasters, inserted ${result.inserted}, ${result.errors} errors`,
        duration: 5000,
      });

    } catch (error) {
      console.error('DisasterAssist sync error:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(null);
    }
  };

  const getStatusBadge = (importType: string) => {
    const result = results[importType];
    if (!result) return <Badge variant="secondary">Not Started</Badge>;
    
    return result.success ? (
      <Badge variant="default" className="bg-success text-success-foreground">
        <CheckCircle className="w-3 h-3 mr-1" />
        Complete ({result.total_found} found)
      </Badge>
    ) : (
      <Badge variant="destructive">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Failed
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            DisasterAssist Data Sync
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Synchronize live disaster declarations from DisasterAssist.gov.au - the Australian Government's authoritative disaster registry.
          </p>
        </div>

        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Important:</strong> This system crawls all 68+ pages of disaster declarations from DisasterAssist to find active disasters, their LGAs, and affected postcodes.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6">
          {/* DisasterAssist Sync */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                DisasterAssist Comprehensive Crawl
                {getStatusBadge('disasterassist')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Source:</strong> DisasterAssist.gov.au (Australian Government)</p>
                <p><strong>Coverage:</strong> All 68+ pages of disaster declarations</p>
                <p><strong>Data:</strong> AGRN, dates, LGAs, postcodes, status</p>
                <p><strong>Purpose:</strong> Enable Medicare telehealth verification</p>
              </div>
              
              <Button 
                onClick={handleDisasterSync}
                disabled={loading === 'disasterassist'}
                className="w-full"
                size="lg"
              >
                {loading === 'disasterassist' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Crawling DisasterAssist...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync from DisasterAssist
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ExternalLink className="w-3 h-3" />
                <a 
                  href="https://www.disasterassist.gov.au/find-a-disaster/australian-disasters" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  View source: DisasterAssist.gov.au
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Display */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results).map(([type, result]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div>
                      <h4 className="font-medium">DisasterAssist Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        {result.success ? 
                          `Found ${result.total_found} disasters, inserted ${result.inserted}, updated ${result.updated || 0}` :
                          result.message
                        }
                      </p>
                      {result.errors && result.errors > 0 && (
                        <p className="text-xs text-destructive">
                          {result.errors} errors occurred during processing
                        </p>
                      )}
                    </div>
                    {result.success ? (
                      <Badge variant="default" className="bg-success text-success-foreground">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Success
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Next Steps:</strong> After syncing data, the verification system will check for current disaster declarations and provide practitioner guidance for active disasters without clear end dates.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}