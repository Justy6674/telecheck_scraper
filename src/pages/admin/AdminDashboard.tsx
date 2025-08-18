import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Play,
  Shield,
  Users,
  Download,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface HealthStatus {
  overall: 'healthy' | 'warning' | 'critical';
  medicare_compliance: boolean;
  active_disasters: number;
  last_scrape: string;
  data_integrity: number;
}

interface ScraperRun {
  id: string;
  run_type: string;
  status: string;
  records_processed: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [recentRuns, setRecentRuns] = useState<ScraperRun[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
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

      setIsAdmin(true);
      await fetchDashboardData();
    } catch (error) {
      console.error('Admin access check failed:', error);
      navigate('/auth');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch health status
      const { count: activeCount } = await supabase
        .from('disaster_declarations')
        .select('id', { count: 'exact' })
        .eq('declaration_status', 'active');

      const { data: lastRun } = await supabase
        .from('scraper_runs')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate data integrity score
      const { data: healthMetrics } = await supabase
        .from('health_metrics')
        .select('metric_value, is_healthy')
        .eq('metric_name', 'data_integrity')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      setHealthStatus({
        overall: (activeCount || 0) > 0 ? 'healthy' : 'warning',
        medicare_compliance: true,
        active_disasters: activeCount || 0,
        last_scrape: lastRun?.completed_at || 'Never',
        data_integrity: healthMetrics?.metric_value || 95
      });

      // Fetch recent scraper runs
      const { data: runs } = await supabase
        .from('scraper_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(5);

      setRecentRuns(runs || []);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({
        title: "Data Load Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerScraper = async (type: 'primary' | 'validation' | 'comparison') => {
    try {
      const { error } = await supabase.functions.invoke('admin-scraper-control', {
        body: { action: 'start', type }
      });

      if (error) throw error;

      toast({
        title: "Scraper Started",
        description: `${type} scraper has been triggered`,
        variant: "default"
      });

      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Scraper trigger failed:', error);
      toast({
        title: "Scraper Error",
        description: "Failed to start scraper",
        variant: "destructive"
      });
    }
  };

  const exportData = async (type: 'csv' | 'json') => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-export', {
        body: { type, format: type }
      });

      if (error) throw error;

      // Create download link
      const blob = new Blob([JSON.stringify(data)], { 
        type: type === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disaster-data-${new Date().toISOString().split('T')[0]}.${type}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Data exported as ${type.toUpperCase()}`,
        variant: "default"
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
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

  if (!isAdmin) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">System monitoring and control center</p>
        </div>
        <Button onClick={() => fetchDashboardData()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Health Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className={`h-4 w-4 ${getStatusColor(healthStatus?.overall || 'warning')}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {healthStatus?.overall || 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall system status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medicare Compliance</CardTitle>
            {healthStatus?.medicare_compliance ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.medicare_compliance ? 'Compliant' : 'Issues'}
            </div>
            <p className="text-xs text-muted-foreground">
              Current compliance status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Disasters</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.active_disasters || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Current declarations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Integrity</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthStatus?.data_integrity || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Quality score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Trigger scrapers and manage system operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Button onClick={() => triggerScraper('primary')} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Run Primary Scraper
            </Button>
            <Button onClick={() => triggerScraper('validation')} variant="outline" className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Run Validation
            </Button>
            <Button onClick={() => triggerScraper('comparison')} variant="outline" className="w-full">
              <Activity className="h-4 w-4 mr-2" />
              Run Comparison
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex gap-3">
              <Button onClick={() => exportData('csv')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={() => exportData('json')} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Scraper Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Scraper Runs</CardTitle>
          <CardDescription>Last 5 scraper executions with status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRuns.length === 0 ? (
              <p className="text-muted-foreground">No recent runs found</p>
            ) : (
              recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <div className="font-medium capitalize">{run.run_type} Scraper</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(run.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                      {run.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {run.records_processed} records
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation to Other Admin Pages */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/health')}>
          <CardHeader>
            <CardTitle className="text-lg">Health Monitoring</CardTitle>
            <CardDescription>Real-time system health metrics</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/clients')}>
          <CardHeader>
            <CardTitle className="text-lg">Client Analytics</CardTitle>
            <CardDescription>User activity and search metrics</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/scraper')}>
          <CardHeader>
            <CardTitle className="text-lg">Scraper Control</CardTitle>
            <CardDescription>Advanced scraper management</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/validation')}>
          <CardHeader>
            <CardTitle className="text-lg">Data Validation</CardTitle>
            <CardDescription>Validation reports and comparisons</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;