import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function DisasterMap() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Disaster Map</h1>
        <p className="text-muted-foreground">Interactive map of Australian disaster declarations</p>
      </div>
      
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Australia-wide Disaster Tracking
          </CardTitle>
          <CardDescription>
            Real-time visualization of active disaster declarations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Interactive disaster mapping system coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}