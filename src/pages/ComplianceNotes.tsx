import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ComplianceNotes() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Compliance Notes</h1>
        <p className="text-muted-foreground">MBS-compliant telehealth documentation templates</p>
      </div>
      
      <Card className="shadow-medical">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            MBS Compliance Templates
          </CardTitle>
          <CardDescription>
            Generate compliant notes for GP and NP telehealth consultations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Compliance note generation system coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}