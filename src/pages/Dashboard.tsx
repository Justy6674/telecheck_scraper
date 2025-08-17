import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Shield, 
  FileText, 
  TrendingUp, 
  Clock,
  MapPin,
  Activity,
  Users,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  activeDisasters: number;
  recentVerifications: number;
  complianceScore: number;
  totalVerifications: number;
  lgasCovered: number;
  lastSyncTime: string;
}

interface RecentVerification {
  id: string;
  patient_postcode: string;
  provider_type: string;
  verification_result: boolean;
  created_at: string;
  exemption_type: string;
}

interface ActiveDisaster {
  id: string;
  disaster_type: string;
  lga_name: string;
  state_code: string;
  severity_level: number;
  declaration_date: string;
  postcodes: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    activeDisasters: 0,
    recentVerifications: 0,
    complianceScore: 0,
    totalVerifications: 0,
    lgasCovered: 0,
    lastSyncTime: '',
  });
  const [recentVerifications, setRecentVerifications] = useState<RecentVerification[]>([]);
  const [activeDisasters, setActiveDisasters] = useState<ActiveDisaster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch active disasters
      const { data: disasters, error: disastersError } = await supabase
        .from('disaster_declarations')
        .select(`
          id,
          disaster_type,
          severity_level,
          declaration_date,
          postcodes,
          state_code,
          lga_registry (
            lga_name
          )
        `)
        .eq('declaration_status', 'active')
        .order('declaration_date', { ascending: false })
        .limit(5);

      if (disastersError) throw disastersError;

      // Fetch recent verifications for this user
      const { data: verifications, error: verificationsError } = await supabase
        .from('verification_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (verificationsError) throw verificationsError;

      // Count total active disasters
      const { count: activeDisasterCount } = await supabase
        .from('disaster_declarations')
        .select('*', { count: 'exact', head: true })
        .eq('declaration_status', 'active');

      // Count unique LGAs covered by active disasters
      const { data: lgaData } = await supabase
        .from('disaster_declarations')
        .select('lga_code')
        .eq('declaration_status', 'active');
      
      const uniqueLgas = new Set(lgaData?.map(d => d.lga_code)).size;

      // Get last sync time from disaster declarations
      const { data: lastSyncData } = await supabase
        .from('disaster_declarations')
        .select('last_sync_timestamp')
        .order('last_sync_timestamp', { ascending: false })
        .limit(1);

      // Count total verifications for this user
      const { count: totalVerificationCount } = await supabase
        .from('verification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Calculate recent verifications (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentVerificationCount = verifications?.filter(
        v => new Date(v.created_at) > sevenDaysAgo
      ).length || 0;

      // Calculate compliance score based on successful verifications
      const successfulVerifications = verifications?.filter(v => v.verification_result).length || 0;
      const complianceScore = verifications?.length 
        ? Math.round((successfulVerifications / verifications.length) * 100)
        : 100;

      setStats({
        activeDisasters: activeDisasterCount || 0,
        recentVerifications: recentVerificationCount,
        complianceScore,
        totalVerifications: totalVerificationCount || 0,
        lgasCovered: uniqueLgas,
        lastSyncTime: lastSyncData?.[0]?.last_sync_timestamp || '',
      });

      setRecentVerifications(verifications || []);
      setActiveDisasters(disasters?.map(d => ({
        ...d,
        lga_name: d.lga_registry?.lga_name || 'Unknown'
      })) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (level: number) => {
    switch (level) {
      case 5: return "destructive";
      case 4: return "destructive";
      case 3: return "secondary";
      default: return "outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Healthcare Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time disaster verification and compliance monitoring
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-medical">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Disasters</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDisasters}</div>
            <p className="text-xs text-muted-foreground">
              Across Australia
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medical">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Verifications</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentVerifications}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medical">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceScore}%</div>
            <p className="text-xs text-muted-foreground">
              MBS compliance rate
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medical">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LGAs Covered</CardTitle>
            <MapPin className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lgasCovered}</div>
            <p className="text-xs text-muted-foreground">
              Affected areas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Disasters */}
        <Card className="shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Disaster Declarations
            </CardTitle>
            <CardDescription>
              Current disaster declarations affecting telehealth eligibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeDisasters.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No active disasters currently declared
              </p>
            ) : (
              activeDisasters.map((disaster) => (
                <div key={disaster.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(disaster.severity_level)}>
                        Level {disaster.severity_level}
                      </Badge>
                      <span className="font-medium capitalize">{disaster.disaster_type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {disaster.lga_name}, {disaster.state_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(disaster.declaration_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {disaster.postcodes?.length || 0} postcodes
                    </p>
                  </div>
                </div>
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate("/map")}
            >
              View Disaster Map
            </Button>
          </CardContent>
        </Card>

        {/* Recent Verifications */}
        <Card className="shadow-medical">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Verifications
            </CardTitle>
            <CardDescription>
              Your latest disaster eligibility checks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentVerifications.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No verifications yet. Start by checking a patient's postcode.
              </p>
            ) : (
              recentVerifications.slice(0, 5).map((verification) => (
                <div key={verification.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {verification.verification_result ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">Postcode {verification.patient_postcode}</span>
                      <Badge variant="outline">{verification.provider_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {verification.exemption_type || "No exemption"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(verification.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate("/verification")}
            >
              New Verification
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for healthcare compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/verification")}
            >
              <Shield className="h-6 w-6" />
              Verify Patient
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/compliance")}
            >
              <FileText className="h-6 w-6" />
              Generate Note
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/map")}
            >
              <MapPin className="h-6 w-6" />
              Disaster Map
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate("/settings")}
            >
              <Users className="h-6 w-6" />
              Practice Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}