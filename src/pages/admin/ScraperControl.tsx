import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Shield,
  Activity,
  Download,
  Loader2,
  Clock,
  Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ScraperRun {
  id: string;
  run_type: 'test' | 'production' | 'validation';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'needs_review';
  started_at: string;
  completed_at?: string;
  pages_scraped?: number;
  disasters_found?: number;
  active_found?: number;
  validation_passed?: boolean;
  confidence_score?: number;
  error_message?: string;
}

interface ValidationResult {
  passed: boolean;
  confidence_score: number;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
  recommendation: 'SAFE TO RUN' | 'NEEDS REVIEW' | 'DO NOT RUN';
}

const ScraperControl = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [productionRunning, setProductionRunning] = useState(false);
  const [validationRunning, setValidationRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStatus, setCurrentStatus] = useState("");
  const [recentRuns, setRecentRuns] = useState<ScraperRun[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [liveComparison, setLiveComparison] = useState<any>(null);

  useEffect(() => {
    checkAdminAccess();
    fetchRecentRuns();
    // Set up real-time subscription
    const subscription = supabase
      .channel('scraper_runs')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'scraper_runs' 
      }, handleRealtimeUpdate)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!adminUser || !['admin', 'super_admin'].includes(adminUser.role)) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Admin access check failed:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentRuns = async () => {
    try {
      // Using existing disaster_orchestration_logs table
      const { data, error } = await supabase
        .from('disaster_orchestration_logs')
        .select('*')
        .order('run_timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transform data to match ScraperRun interface
      const transformedData: ScraperRun[] = (data || []).map(log => ({
        id: log.id,
        run_type: 'production' as const,
        status: log.success ? 'completed' as const : 'failed' as const,
        started_at: log.run_timestamp,
        completed_at: log.created_at,
        pages_scraped: undefined,
        disasters_found: log.declarations_found || 0,
        active_found: log.declarations_added || 0,
        validation_passed: log.success,
        confidence_score: undefined,
        error_message: log.errors?.join(', ') || null
      }));
      
      setRecentRuns(transformedData);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    }
  };

  const handleRealtimeUpdate = (payload: any) => {
    if (payload.new) {
      setRecentRuns(prev => [payload.new, ...prev.slice(0, 9)]);
      
      // Update progress if it's the current run
      if (payload.new.status === 'running') {
        const progress = payload.new.pages_scraped 
          ? (payload.new.pages_scraped / 38) * 100 
          : 0;
        setProgress(progress);
        setCurrentStatus(`Scraped ${payload.new.pages_scraped || 0} pages...`);
      }
    }
  };

  const runTestScraper = async () => {
    try {
      setTestRunning(true);
      setProgress(0);
      setCurrentStatus("Starting test scraper...");

      const { data, error } = await supabase.functions.invoke('run-test-scraper', {
        body: { 
          type: 'test',
          pages: 2 // Only scrape 2 pages for testing
        }
      });

      if (error) throw error;

      toast({
        title: "Test Scraper Started",
        description: "Scraping first 2 pages for validation",
        variant: "default"
      });

      // Simulate progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTestRunning(false);
            return 100;
          }
          return prev + 10;
        });
      }, 500);

    } catch (error) {
      console.error('Test scraper failed:', error);
      toast({
        title: "Test Failed",
        description: "Failed to start test scraper",
        variant: "destructive"
      });
      setTestRunning(false);
    }
  };

  const runValidation = async () => {
    try {
      setValidationRunning(true);
      setCurrentStatus("Running dual-scraper validation...");

      const { data, error } = await supabase.functions.invoke('run-validation', {
        body: { 
          primary_scraper: 'playwright',
          secondary_scraper: 'puppeteer'
        }
      });

      if (error) throw error;

      setValidationResult(data.validation);
      setLiveComparison(data.comparison);

      const variant = data.validation.passed ? "default" : "destructive";
      toast({
        title: data.validation.passed ? "Validation Passed" : "Validation Failed",
        description: `Confidence: ${data.validation.confidence_score}%`,
        variant
      });

    } catch (error) {
      console.error('Validation failed:', error);
      toast({
        title: "Validation Error",
        description: "Failed to run validation",
        variant: "destructive"
      });
    } finally {
      setValidationRunning(false);
    }
  };

  const runProductionScraper = async () => {
    if (!validationResult || validationResult.confidence_score < 90) {
      toast({
        title: "Cannot Run Production",
        description: "Validation must pass with >90% confidence first",
        variant: "destructive"
      });
      return;
    }

    try {
      setProductionRunning(true);
      setProgress(0);
      setCurrentStatus("Starting production scraper...");

      const { data, error } = await supabase.functions.invoke('run-production-scraper', {
        body: { 
          type: 'production',
          full_crawl: true
        }
      });

      if (error) throw error;

      toast({
        title: "Production Scraper Started",
        description: "Full crawl initiated - this may take 15-20 minutes",
        variant: "default"
      });

    } catch (error) {
      console.error('Production scraper failed:', error);
      toast({
        title: "Production Failed",
        description: "Failed to start production scraper",
        variant: "destructive"
      });
    } finally {
      setProductionRunning(false);
    }
  };

  const clearTestData = async () => {
    try {
      // Clear test data from existing table
      const { error } = await supabase
        .from('disaster_declarations')
        .delete()
        .eq('data_source', 'test'); // Delete test records only

      if (error) throw error;

      toast({
        title: "Test Data Cleared",
        description: "Test table has been reset",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to clear test data:', error);
      toast({
        title: "Clear Failed",
        description: "Failed to clear test data",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      case 'needs_review': return <Eye className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRecommendationColour = (recommendation: string) => {
    switch (recommendation) {
      case 'SAFE TO RUN': return 'text-success';
      case 'NEEDS REVIEW': return 'text-warning';
      case 'DO NOT RUN': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-centre justify-centre h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-centre justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Scraper Control Centre</h1>
          <p className="text-muted-foreground">Test, validate, and deploy disaster data scrapers</p>
        </div>
        <Button onClick={() => navigate('/admin')} variant="outline">
          Back to Dashboard
        </Button>
      </div>

      {/* Test & Validation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Scraper Test & Audit</CardTitle>
          <CardDescription>
            Test scraper on 2 pages before running production. Medicare compliance requires 95% confidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Controls */}
          <div className="flex gap-3">
            <Button 
              onClick={runTestScraper} 
              disabled={testRunning || productionRunning}
              className="min-w-[180px]"
            >
              {testRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test Scrape (2 pages)
                </>
              )}
            </Button>
            
            <Button 
              onClick={runValidation}
              disabled={validationRunning || testRunning}
              variant="outline"
              className="min-w-[180px]"
            >
              {validationRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Run Dual Validation
                </>
              )}
            </Button>

            <Button 
              onClick={clearTestData}
              variant="outline"
              disabled={testRunning || validationRunning}
            >
              Clear Test Data
            </Button>
          </div>

          {/* Progress Bar */}
          {(testRunning || validationRunning || productionRunning) && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{currentStatus}</p>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-centre justify-between">
                  <CardTitle>Validation Results</CardTitle>
                  <Badge variant={validationResult.passed ? "default" : "destructive"}>
                    {validationResult.confidence_score}% Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Checks */}
                {validationResult.checks.map((check, idx) => (
                  <div key={idx} className="flex items-centre justify-between p-2 border rounded">
                    <div className="flex items-centre gap-2">
                      {check.passed ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">{check.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{check.message}</span>
                  </div>
                ))}
                
                {/* Recommendation */}
                <Alert>
                  <AlertDescription>
                    <span className="font-bold">Recommendation: </span>
                    <span className={getRecommendationColour(validationResult.recommendation)}>
                      {validationResult.recommendation}
                    </span>
                  </AlertDescription>
                </Alert>

                {/* Production Button */}
                {validationResult.recommendation === 'SAFE TO RUN' && (
                  <Button 
                    onClick={runProductionScraper}
                    disabled={productionRunning}
                    className="w-full"
                    variant="default"
                  >
                    {productionRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Production Scraper...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Run Production Scraper (Full Crawl)
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Live Comparison View */}
      {liveComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Live Comparison</CardTitle>
            <CardDescription>Side-by-side comparison of scraper outputs</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="summary">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="discrepancies">Discrepancies</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Playwright (Primary)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Disasters:</span>
                          <span className="font-bold">{liveComparison?.playwright?.total || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active:</span>
                          <span className="font-bold">{liveComparison?.playwright?.active || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>QLD Active:</span>
                          <span className="font-bold">{liveComparison?.playwright?.qld_active || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Puppeteer (Validation)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Disasters:</span>
                          <span className="font-bold">{liveComparison?.puppeteer?.total || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active:</span>
                          <span className="font-bold">{liveComparison?.puppeteer?.active || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>QLD Active:</span>
                          <span className="font-bold">{liveComparison?.puppeteer?.qld_active || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="discrepancies">
                {liveComparison?.discrepancies?.length > 0 ? (
                  <div className="space-y-2">
                    {liveComparison.discrepancies.map((disc: any, idx: number) => (
                      <Alert key={idx} variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {disc.agrn}: {disc.issue}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No discrepancies found - scrapers are in agreement</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="evidence">
                <div className="text-sm text-muted-foreground">
                  <p>Evidence stored for audit trail:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Full HTML snapshots with SHA256 hashes</li>
                    <li>Screenshots (PNG format)</li>
                    <li>Extraction snippets and CSS paths</li>
                    <li>Timestamps in AEST</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraper Runs</CardTitle>
          <CardDescription>History of last 10 scraper executions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRuns.length === 0 ? (
              <p className="text-muted-foreground">No scraper runs found</p>
            ) : (
              recentRuns.map((run) => (
                <div key={run.id} className="flex items-centre justify-between p-3 border rounded-lg">
                  <div className="flex items-centre gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-medium capitalize">
                        {run.run_type} Scraper
                        {run.validation_passed !== undefined && (
                          <Badge variant={run.validation_passed ? "default" : "destructive"} className="ml-2">
                            {run.validation_passed ? "Passed" : "Failed"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.started_at).toLocaleString('en-AU')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      run.status === 'completed' ? 'default' : 
                      run.status === 'failed' ? 'destructive' : 
                      run.status === 'needs_review' ? 'outline' :
                      'secondary'
                    }>
                      {run.status}
                    </Badge>
                    {run.disasters_found && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {run.disasters_found} disasters ({run.active_found} active)
                      </div>
                    )}
                    {run.confidence_score && (
                      <div className="text-sm text-muted-foreground">
                        Confidence: {run.confidence_score}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScraperControl;