import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Download, Database, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

interface ImportResult {
  success: boolean;
  message: string;
  records_processed: number;
}

export default function DataImport() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: string]: ImportResult}>({});
  const { toast } = useToast();

  const handleDataImport = async (importType: 'postcodes' | 'lgas' | 'all' | 'disasters') => {
    setLoading(importType);
    
    try {
      let response;
      
      if (importType === 'disasters') {
        response = await supabase.functions.invoke('live-disaster-loader', {
          body: { source_type: 'all', force_refresh: true }
        });
      } else {
        response = await supabase.functions.invoke('comprehensive-data-loader', {
          body: { import_type: importType, force_reload: true }
        });
      }

      if (response.error) throw response.error;

      const result = response.data;
      setResults(prev => ({ ...prev, [importType]: result }));

      toast({
        title: "Import Successful",
        description: result.message,
        duration: 5000,
      });

    } catch (error) {
      console.error(`${importType} import error:`, error);
      toast({
        title: "Import Failed",
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
        Complete ({result.records_processed} records)
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
            Australian Data Import System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Load comprehensive Australian geographic and disaster data to make TeleCheck functional across all 3,333 postcodes and 537 LGAs.
          </p>
        </div>

        <Alert className="border-warning bg-warning/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Critical:</strong> The app currently only has 1 postcode and 1 LGA loaded, making it useless for 99.8% of Australia. 
            These imports will load all essential data to enable nationwide disaster verification.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Postcodes Import */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Australian Postcodes
                {getStatusBadge('postcodes')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Current:</strong> 1 postcode (4051 Brisbane)</p>
                <p><strong>Target:</strong> 3,333 Australian postcodes</p>
                <p><strong>Coverage:</strong> All states and territories</p>
                <p><strong>Impact:</strong> Enable verification for 25+ million Australians</p>
              </div>
              
              <Button 
                onClick={() => handleDataImport('postcodes')}
                disabled={loading === 'postcodes'}
                className="w-full"
                size="lg"
              >
                {loading === 'postcodes' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing Postcodes...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import All Postcodes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* LGAs Import */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Local Government Areas
                {getStatusBadge('lgas')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Current:</strong> 1 LGA (Brisbane)</p>
                <p><strong>Target:</strong> 537 Australian LGAs</p>
                <p><strong>Coverage:</strong> All councils and shires</p>
                <p><strong>Impact:</strong> Enable LGA-based disaster mapping</p>
              </div>
              
              <Button 
                onClick={() => handleDataImport('lgas')}
                disabled={loading === 'lgas'}
                className="w-full"
                size="lg"
              >
                {loading === 'lgas' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing LGAs...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import All LGAs
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Disaster Data */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Disaster Declarations
                {getStatusBadge('disasters')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Current:</strong> 3 test declarations</p>
                <p><strong>Target:</strong> Live disaster data from all sources</p>
                <p><strong>Sources:</strong> Federal + 8 state emergency services</p>
                <p><strong>Impact:</strong> Real-time verification for 8.5M+ affected Australians</p>
              </div>
              
              <Button 
                onClick={() => handleDataImport('disasters')}
                disabled={loading === 'disasters'}
                className="w-full"
                size="lg"
                variant="secondary"
              >
                {loading === 'disasters' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Scraping Disasters...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Scrape Current Disasters
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import All */}
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Complete Data Import
                {getStatusBadge('all')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><strong>Action:</strong> Import all essential data</p>
                <p><strong>Duration:</strong> ~5-10 minutes</p>
                <p><strong>Result:</strong> Fully functional nationwide verification</p>
                <p><strong>Recommendation:</strong> Run this first to enable the app</p>
              </div>
              
              <Button 
                onClick={() => handleDataImport('all')}
                disabled={loading === 'all'}
                className="w-full"
                size="lg"
                variant="default"
              >
                {loading === 'all' ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing All Data...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import Everything
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Display */}
        {Object.keys(results).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results).map(([type, result]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">{type}</h4>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
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
            <strong>Next Steps:</strong> After importing data, test the verification system with various postcodes. 
            The app will transform from checking 1 postcode to supporting all 3,333 Australian postcodes and real-time disaster status.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}