import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  FileText, 
  Search,
  Clock,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ComingSoonDialog } from "@/components/ui/ComingSoonDialog";

interface RecentActivity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  status: 'eligible' | 'not_eligible';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowComingSoon(true);
      return;
    }
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Postcode Search */}
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Postcode Disaster Verification
          </CardTitle>
          <CardDescription>
            Search for active disaster declarations by postcode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter postcode (e.g., 4000)"
                className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={4}
                pattern="\d{4}"
              />
              <Button type="submit" className="bg-gradient-primary">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Searches */}
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Searches
          </CardTitle>
          <CardDescription>
            Your recent postcode verification history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border">
                <div className="flex items-center gap-3">
                  {activity.status === 'eligible' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent searches yet</p>
                <p className="text-sm">Start by searching for a postcode above</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DisasterAssist Link */}
      <Card className="shadow-medical border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Official Disaster Information</h3>
              <p className="text-muted-foreground">
                Access the Australian Government's official disaster assistance portal for detailed information and support services.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.open('https://www.disasterassist.gov.au', '_blank')}
              className="ml-4"
            >
              Visit DisasterAssist.gov.au
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <ComingSoonDialog 
        open={showComingSoon} 
        onOpenChange={setShowComingSoon} 
      />
    </div>
  );
};