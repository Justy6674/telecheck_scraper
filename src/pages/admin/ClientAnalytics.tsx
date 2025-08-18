import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Search,
  Activity,
  TrendingUp,
  MapPin,
  Clock,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ClientStats {
  total_users: number;
  active_subscriptions: number;
  search_volume_24h: number;
  search_volume_7d: number;
  search_volume_30d: number;
  api_calls_24h: number;
  avg_response_time: number;
}

interface PopularPostcode {
  postcode: string;
  search_count: number;
  last_searched: string;
}

interface ApiUsageData {
  endpoint: string;
  call_count: number;
  avg_response_time: number;
  success_rate: number;
}

const ClientAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [popularPostcodes, setPopularPostcodes] = useState<PopularPostcode[]>([]);
  const [apiUsage, setApiUsage] = useState<ApiUsageData[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const timeRanges = {
        '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
        '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      };

      // Fetch user statistics
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' });

      const { count: subscriptionCount } = await supabase
        .from('client_subscriptions')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Fetch search volume for different time ranges
      const { count: search24hCount } = await supabase
        .from('search_logs')
        .select('id', { count: 'exact' })
        .gte('searched_at', timeRanges['24h'].toISOString());

      const { count: search7dCount } = await supabase
        .from('search_logs')
        .select('id', { count: 'exact' })
        .gte('searched_at', timeRanges['7d'].toISOString());

      const { count: search30dCount } = await supabase
        .from('search_logs')
        .select('id', { count: 'exact' })
        .gte('searched_at', timeRanges['30d'].toISOString());

      // Fetch API usage
      const { count: apiCallCount } = await supabase
        .from('api_usage')
        .select('id', { count: 'exact' })
        .gte('created_at', timeRanges['24h'].toISOString());

      // Calculate average response time
      const { data: responseTimeData } = await supabase
        .from('api_usage')
        .select('response_time_ms')
        .gte('created_at', timeRanges[timeRange].toISOString())
        .not('response_time_ms', 'is', null);

      const avgResponseTime = responseTimeData?.length > 0 
        ? responseTimeData.reduce((sum, item) => sum + (item.response_time_ms || 0), 0) / responseTimeData.length
        : 0;

      setClientStats({
        total_users: userCount || 0,
        active_subscriptions: subscriptionCount || 0,
        search_volume_24h: search24hCount || 0,
        search_volume_7d: search7dCount || 0,
        search_volume_30d: search30dCount || 0,
        api_calls_24h: apiCallCount || 0,
        avg_response_time: avgResponseTime
      });

      // Fetch popular postcodes
      const { data: postcodeStats } = await supabase
        .from('search_logs')
        .select('postcode, searched_at')
        .gte('searched_at', timeRanges[timeRange].toISOString())
        .order('searched_at', { ascending: false });

      // Group and count postcodes
      const postcodeGroups = postcodeStats?.reduce((acc: Record<string, any>, log) => {
        if (!acc[log.postcode]) {
          acc[log.postcode] = {
            postcode: log.postcode,
            search_count: 0,
            last_searched: log.searched_at
          };
        }
        acc[log.postcode].search_count++;
        if (log.searched_at > acc[log.postcode].last_searched) {
          acc[log.postcode].last_searched = log.searched_at;
        }
        return acc;
      }, {}) || {};

      const sortedPostcodes = Object.values(postcodeGroups)
        .sort((a: any, b: any) => b.search_count - a.search_count)
        .slice(0, 10);

      setPopularPostcodes(sortedPostcodes as PopularPostcode[]);

      // Fetch API endpoint usage
      const { data: apiEndpoints } = await supabase
        .from('api_usage')
        .select('endpoint, status_code, response_time_ms')
        .gte('created_at', timeRanges[timeRange].toISOString());

      const endpointGroups = apiEndpoints?.reduce((acc: Record<string, any>, usage) => {
        if (!acc[usage.endpoint]) {
          acc[usage.endpoint] = {
            endpoint: usage.endpoint,
            call_count: 0,
            total_response_time: 0,
            success_count: 0
          };
        }
        acc[usage.endpoint].call_count++;
        acc[usage.endpoint].total_response_time += usage.response_time_ms || 0;
        if (usage.status_code && usage.status_code < 400) {
          acc[usage.endpoint].success_count++;
        }
        return acc;
      }, {}) || {};

      const apiUsageStats = Object.values(endpointGroups).map((group: any) => ({
        endpoint: group.endpoint,
        call_count: group.call_count,
        avg_response_time: group.call_count > 0 ? group.total_response_time / group.call_count : 0,
        success_rate: group.call_count > 0 ? (group.success_count / group.call_count) * 100 : 0
      }));

      setApiUsage(apiUsageStats as ApiUsageData[]);

    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      toast({
        title: "Analytics Error",
        description: "Failed to load client analytics data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Analytics</h1>
          <p className="text-muted-foreground">User activity and system usage metrics</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Badge
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setTimeRange(range)}
            >
              {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">Registered accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientStats?.active_subscriptions || 0}</div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Volume</CardTitle>
            <Search className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeRange === '24h' && (clientStats?.search_volume_24h || 0)}
              {timeRange === '7d' && (clientStats?.search_volume_7d || 0)}
              {timeRange === '30d' && (clientStats?.search_volume_30d || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(clientStats?.avg_response_time || 0).toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">API response time</p>
          </CardContent>
        </Card>
      </div>

      {/* Popular Postcodes */}
      <Card>
        <CardHeader>
          <CardTitle>Most Searched Postcodes</CardTitle>
          <CardDescription>
            Top postcode searches in the last {timeRange === '24h' ? '24 hours' : timeRange === '7d' ? '7 days' : '30 days'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularPostcodes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No search data available</p>
            ) : (
              popularPostcodes.map((postcode, index) => (
                <div key={postcode.postcode} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{postcode.postcode}</div>
                      <div className="text-sm text-muted-foreground">
                        Last searched: {new Date(postcode.last_searched).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{postcode.search_count}</div>
                    <div className="text-sm text-muted-foreground">searches</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Usage</CardTitle>
          <CardDescription>Performance metrics by endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiUsage.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No API usage data available</p>
            ) : (
              apiUsage.map((endpoint) => (
                <div key={endpoint.endpoint} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{endpoint.endpoint}</div>
                      <div className="text-sm text-muted-foreground">
                        {endpoint.call_count} calls • {endpoint.avg_response_time.toFixed(0)}ms avg
                      </div>
                    </div>
                    <Badge variant={endpoint.success_rate >= 95 ? "default" : "destructive"}>
                      {endpoint.success_rate.toFixed(1)}% success
                    </Badge>
                  </div>
                  <Progress value={endpoint.success_rate} className="h-2" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientAnalytics;