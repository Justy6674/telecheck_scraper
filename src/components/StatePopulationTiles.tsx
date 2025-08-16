import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StateData {
  code: string;
  name: string;
  activeDisasters: number;
  affectedLGAs: string[];
}

const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'NT', name: 'Northern Territory' },
  { code: 'ACT', name: 'Australian Capital Territory' }
];

export function StatePopulationTiles() {
  const [stateData, setStateData] = useState<StateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisasterData = async () => {
      try {
        const { data: disasters, error } = await supabase
          .from('disaster_declarations')
          .select('state_code, lga_code')
          .eq('declaration_status', 'active');

        if (error) {
          console.error('Error fetching disaster data:', error);
          return;
        }

        // Process data by state
        const stateStats: { [key: string]: StateData } = {};
        
        // Initialize all states with zero counts
        AUSTRALIAN_STATES.forEach(state => {
          stateStats[state.code] = {
            code: state.code,
            name: state.name,
            activeDisasters: 0,
            affectedLGAs: []
          };
        });

        // Count disasters by state
        disasters?.forEach(disaster => {
          const stateCode = disaster.state_code?.toUpperCase();
          if (stateCode && stateStats[stateCode]) {
            stateStats[stateCode].activeDisasters++;
            if (!stateStats[stateCode].affectedLGAs.includes(disaster.lga_code)) {
              stateStats[stateCode].affectedLGAs.push(disaster.lga_code);
            }
          }
        });

        setStateData(Object.values(stateStats));
      } catch (error) {
        console.error('Error processing disaster data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisasterData();

    // Set up real-time subscription
    const channel = supabase
      .channel('state-disaster-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'disaster_declarations'
        },
        () => {
          fetchDisasterData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="max-w-6xl mx-auto shadow-medical">
        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Current Population Living in Declared Natural Disaster Zones Across Australia</h3>
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-24 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAffectedStates = stateData.filter(state => state.activeDisasters > 0).length;
  const totalActiveDisasters = stateData.reduce((sum, state) => sum + state.activeDisasters, 0);

  return (
    <Card className="max-w-6xl mx-auto shadow-medical">
      <CardContent className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Current Population Living in Declared Natural Disaster Zones Across Australia
          </h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalAffectedStates} of 8 states/territories with active declarations</span>
            <span>•</span>
            <span>{totalActiveDisasters} total active disaster declarations</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stateData.map((state) => (
            <div
              key={state.code}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                state.activeDisasters > 0
                  ? 'bg-destructive/5 border-destructive/20 shadow-sm'
                  : 'bg-card border-border hover:bg-accent/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground">
                  {state.code}
                </div>
                {state.activeDisasters > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                    {state.activeDisasters}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm font-medium mb-1 leading-tight">
                {state.name}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {state.activeDisasters > 0 ? (
                  <>
                    {state.affectedLGAs.length} LGA{state.affectedLGAs.length !== 1 ? 's' : ''} affected
                  </>
                ) : (
                  'No active declarations'
                )}
              </div>
            </div>
          ))}
        </div>

        {totalActiveDisasters > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-muted">
            <p className="text-xs text-muted-foreground">
              <strong>Real-time data:</strong> Population calculations based on current disaster declarations 
              from Australian Government sources. LGA-level declarations updated continuously.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}