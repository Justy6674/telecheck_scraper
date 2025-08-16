import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StatePopulationData {
  stateCode: string;
  stateName: string;
  totalPopulation: number;
  affectedPopulation: number;
  activeDisasters: number;
  affectedLGAs: string[];
}

// Australian Bureau of Statistics 2023 population estimates by state/territory
const STATE_POPULATIONS = {
  'NSW': { name: 'New South Wales', population: 8072000 },
  'VIC': { name: 'Victoria', population: 6681000 },
  'QLD': { name: 'Queensland', population: 5322000 },
  'WA': { name: 'Western Australia', population: 2785000 },
  'SA': { name: 'South Australia', population: 1820000 },
  'TAS': { name: 'Tasmania', population: 571000 },
  'ACT': { name: 'Australian Capital Territory', population: 457000 },
  'NT': { name: 'Northern Territory', population: 250000 }
};

// Average population per LGA by state (based on ABS data)
const AVERAGE_LGA_POPULATION = {
  'NSW': 62000,
  'VIC': 84000,
  'QLD': 69000,
  'WA': 194000,
  'SA': 266000,
  'TAS': 191000,
  'ACT': 457000,
  'NT': 45000
};

export function LivePopulationStats() {
  const [populationData, setPopulationData] = useState<StatePopulationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAffected, setTotalAffected] = useState(0);

  useEffect(() => {
    const fetchDisasterData = async () => {
      try {
        const { data: disasters, error } = await supabase
          .from('disaster_declarations')
          .select('state_code, lga_code, affected_areas, disaster_type')
          .eq('declaration_status', 'active');

        if (error) {
          console.error('Error fetching disaster data:', error);
          return;
        }

        // Process disaster data by state
        const stateData: { [key: string]: StatePopulationData } = {};
        
        Object.entries(STATE_POPULATIONS).forEach(([code, info]) => {
          stateData[code] = {
            stateCode: code,
            stateName: info.name,
            totalPopulation: info.population,
            affectedPopulation: 0,
            activeDisasters: 0,
            affectedLGAs: []
          };
        });

        // Calculate affected populations
        disasters?.forEach(disaster => {
          const stateCode = disaster.state_code?.toUpperCase();
          if (stateCode && stateData[stateCode]) {
            stateData[stateCode].activeDisasters++;
            
            // Estimate affected population based on LGA
            const avgPopulation = AVERAGE_LGA_POPULATION[stateCode as keyof typeof AVERAGE_LGA_POPULATION] || 50000;
            stateData[stateCode].affectedPopulation += avgPopulation;
            stateData[stateCode].affectedLGAs.push(disaster.lga_code);
          }
        });

        const sortedData = Object.values(stateData)
          .filter(state => state.activeDisasters > 0)
          .sort((a, b) => b.affectedPopulation - a.affectedPopulation);

        const total = sortedData.reduce((sum, state) => sum + state.affectedPopulation, 0);
        
        setPopulationData(sortedData);
        setTotalAffected(total);
      } catch (error) {
        console.error('Error processing disaster data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisasterData();

    // Set up real-time subscription
    const channel = supabase
      .channel('disaster-updates')
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-AU').format(num);
  };

  const getPercentage = (affected: number, total: number) => {
    return ((affected / total) * 100).toFixed(2);
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Population Impact Analysis
          </CardTitle>
          <CardDescription>Loading live disaster impact data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (populationData.length === 0) {
    return (
      <Card className="max-w-4xl mx-auto shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Population Impact Analysis
          </CardTitle>
          <CardDescription>
            Real-time population impact of declared disaster zones across Australia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No active disaster declarations currently affecting Australian populations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto shadow-medical">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Population Impact Analysis
        </CardTitle>
        <CardDescription>
          Real-time population impact of declared disaster zones across Australia
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Total Impact Summary */}
        <div className="mb-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">Total Australian Population Affected</h3>
            <Badge variant="destructive" className="text-sm">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Active Impact
            </Badge>
          </div>
          <div className="text-3xl font-bold text-destructive">
            {formatNumber(totalAffected)}
          </div>
          <p className="text-sm text-muted-foreground">
            Estimated population currently eligible for disaster telehealth exemptions
          </p>
        </div>

        {/* State-by-State Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-3">Impact by State and Territory</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {populationData.map((state) => (
              <div key={state.stateCode} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{state.stateName}</h4>
                  <Badge variant="outline">
                    {state.activeDisasters} disaster{state.activeDisasters !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Affected Population:</span>
                    <span className="font-medium text-destructive">
                      {formatNumber(state.affectedPopulation)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">State Population:</span>
                    <span>{formatNumber(state.totalPopulation)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impact Percentage:</span>
                    <span className="font-medium">
                      {getPercentage(state.affectedPopulation, state.totalPopulation)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="bg-destructive h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (state.affectedPopulation / state.totalPopulation) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Source Note */}
        <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-muted">
          <p className="text-xs text-muted-foreground">
            <strong>Data Sources:</strong> Australian Bureau of Statistics 2023 population estimates, 
            real-time disaster declarations from Australian Government sources. 
            Population impacts are estimated based on average LGA populations and may not reflect exact affected numbers.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}