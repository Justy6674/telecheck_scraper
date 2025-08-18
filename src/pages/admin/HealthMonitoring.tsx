import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface HealthMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  threshold_min?: number;
  threshold_max?: number;
  is_healthy: boolean;
  recorded_at: string;
  metadata: any;
}

interface ValidationAlert {
  id: number;
  primary_scraper_count: number;
  validation_scraper_count?: number;
  live_website_count?: number;
  discrepancy_found: boolean;
  comparison_date: string;
  state_code?: string;
  notes?: string;
  resolved: boolean;
}

const HealthMonitoring = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [validationAlerts, setValidationAlerts] = useState<ValidationAlert[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealthData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthData, 30000); // 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);

      // Fetch latest health metrics
      const { data: metrics } = await supabase
        .from('health_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(20);

      // Group metrics by name and get latest for each
      const latestMetrics = metrics?.reduce((acc: HealthMetric[], metric) => {
        if (!acc.find(m => m.metric_name === metric.metric_name)) {
          acc.push(metric);
        }
        return acc;
      }, []) || [];

      setHealthMetrics(latestMetrics);

      // Fetch validation alerts
      const { data: alerts } = await supabase
        .from('validation_comparisons')
        .select('*')
        .order('comparison_date', { ascending: false })
        .limit(10);

      setValidationAlerts(alerts || []);

      // Calculate and store current metrics
      await calculateCurrentMetrics();

    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast({
        title: "Health Data Error",
        description: "Failed to load health monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCurrentMetrics = async () => {
    try {
      // Calculate data integrity score
      const { data: totalDisasters } = await supabase
        .from('disaster_declarations')
        .select('id', { count: 'exact' });

      const { data: activeDisasters } = await supabase
        .from('disaster_declarations')
        .select('id', { count: 'exact' })
        .eq('declaration_status', 'active');

      const { data: nullFields } = await supabase
        .from('disaster_declarations')
        .select('id', { count: 'exact' })
        .or('agrn_reference.is.null,event_name.is.null,state_code.is.null');

      const totalCount = totalDisasters?.count || 0;
      const nullCount = nullFields?.count || 0;
      const integrityScore = totalCountValue > 0 ? ((totalCountValue - nullCountValue) / totalCountValue) * 100 : 0;

      // Store health metrics
      await supabase.from('health_metrics').insert([
        {
          metric_name: 'data_integrity',
          metric_value: integrityScore,
          metric_unit: 'percentage',
          threshold_min: 95,
          threshold_max: 100,
          is_healthy: integrityScore >= 95,
          metadata: { total_records: totalCountValue, null_fields: nullCountValue }
        },
        {
          metric_name: 'active_disasters',
          metric_value: activeCount || 0,
          metric_unit: 'count',
          threshold_min: 10,
          threshold_max: 200,
          is_healthy: (activeCount || 0) >= 10 && (activeCount || 0) <= 200,
          metadata: { total_disasters: totalCountValue }
        }
      ]);

    } catch (error) {
      console.error('Failed to calculate metrics:', error);
    }
  };

  const getHealthIcon = (isHealthy: boolean, value: number, threshold?: { min?: number; max?: number }) => {
    if (!threshold) {
      return isHealthy ? (
        <CheckCircle className="h-5 w-5 text-success" />
      ) : (
        <AlertTriangle className="h-5 w-5 text-destructive" />
      );
    }

    if (threshold.min && value < threshold.min) {
      return <TrendingDown className="h-5 w-5 text-destructive" />;
    }
    if (threshold.max && value > threshold.max) {
      return <TrendingUp className="h-5 w-5 text-warning" />;
    }
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  const getProgressColor = (value: number, min?: number, max?: number) => {
    if (!min && !max) return "primary";
    if (min && value < min) return "destructive";
    if (max && value > max) return "warning";
    return "success";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Health Monitoring</h1>
          <p className="text-muted-foreground">Real-time system health and data integrity</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={autoRefresh ? "default" : "secondary"}>
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </Badge>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-sm text-primary underline"
          >
            Toggle
          </button>
        </div>
      </div>

      {/* Health Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {healthMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {metric.metric_name.replace('_', ' ')}
              </CardTitle>
              {getHealthIcon(
                metric.is_healthy, 
                metric.metric_value, 
                { min: metric.threshold_min, max: metric.threshold_max }
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold">
                {metric.metric_value.toFixed(1)}
                {metric.metric_unit && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {metric.metric_unit}
                  </span>
                )}
              </div>
              
              {metric.threshold_min !== null && metric.threshold_max !== null && (
                <div className="space-y-2">
                  <Progress 
                    value={Math.min(100, (metric.metric_value / (metric.threshold_max || 100)) * 100)}
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: {metric.threshold_min}</span>
                    <span>Max: {metric.threshold_max}</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(metric.recorded_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Database vs Live Website Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Database vs Live Website Comparison</CardTitle>
          <CardDescription>Real-time validation against official sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">
                {healthMetrics.find(m => m.metric_name === 'active_disasters')?.metric_value || 0}
              </div>
              <p className="text-sm text-muted-foreground">Database Count</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold">
                {validationAlerts[0]?.live_website_count || 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground">Live Website</p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-warning" />
              <div className="text-2xl font-bold">
                {validationAlerts[0]?.validation_scraper_count || 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground">Validation Scraper</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Alerts</CardTitle>
          <CardDescription>Data discrepancies and validation issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validationAlerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-success" />
                <p className="text-muted-foreground">No validation alerts</p>
              </div>
            ) : (
              validationAlerts.map((alert) => (
                <Alert key={alert.id} className={alert.discrepancy_found ? 'border-warning' : 'border-success'}>
                  <div className="flex items-start gap-3">
                    {alert.discrepancy_found ? (
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <AlertDescription className="font-medium">
                          {alert.discrepancy_found ? 'Discrepancy Detected' : 'Validation Passed'}
                          {alert.state_code && ` - ${alert.state_code}`}
                        </AlertDescription>
                        <Badge variant={alert.resolved ? 'default' : 'secondary'}>
                          {alert.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Primary: {alert.primary_scraper_count} | 
                        Validation: {alert.validation_scraper_count || 'N/A'} | 
                        Live: {alert.live_website_count || 'N/A'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.comparison_date).toLocaleString()}
                      </div>
                      {alert.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">{alert.notes}</p>
                      )}
                    </div>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthMonitoring;