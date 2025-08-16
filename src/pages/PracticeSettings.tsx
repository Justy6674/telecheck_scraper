import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function PracticeSettings() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Practice Settings</h1>
        <p className="text-muted-foreground">Configure your practice details and subscription</p>
      </div>
      
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Practice Configuration
          </CardTitle>
          <CardDescription>
            Manage practice details, provider types, and subscription settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Practice configuration system coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}