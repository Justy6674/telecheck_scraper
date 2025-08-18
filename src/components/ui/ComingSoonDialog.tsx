import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComingSoonDialog({ open, onOpenChange }: ComingSoonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl">
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-2xl">Login Coming Soon!</DialogTitle>
          <DialogDescription className="text-center space-y-4">
            <p className="text-lg">
              TeleCheck practitioner accounts will be available <strong>prior to November 1st, 2025</strong>
            </p>
            <div className="flex items-center justify-center gap-2 p-3 bg-accent/20 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">Stay tuned for updates!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We're putting the finishing touches on practitioner authentication and billing systems 
              to ensure full MBS compliance for the November 2025 telehealth rule changes.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}