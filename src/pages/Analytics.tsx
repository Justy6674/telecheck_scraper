import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">Practice verification and compliance analytics</p>
      </div>
      
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Practice Performance
          </CardTitle>
          <CardDescription>
            Verification trends and compliance reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Analytics dashboard coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}