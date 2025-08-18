import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const AdminFooter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const handleAdminAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setChecking(true);
    try {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (adminUser && ['admin', 'super_admin'].includes(adminUser.role)) {
        navigate('/admin');
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Admin check failed:', error);
      toast({
        title: "Access Check Failed",
        description: "Unable to verify admin access",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <footer className="border-t bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm text-muted-foreground">
              © 2025 TeleCheck. Australian Telehealth Disaster Verification System.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => navigate('/telehealth-rules')}
                className="text-muted-foreground hover:text-primary"
              >
                Telehealth Rules
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="text-muted-foreground hover:text-primary"
              >
                Contact
              </button>
              <button
                onClick={() => navigate('/about')}
                className="text-muted-foreground hover:text-primary"
              >
                About
              </button>
            </div>
          </div>
          
          {/* Admin Access Cogwheel */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAdminAccess}
            disabled={checking}
            className="opacity-50 hover:opacity-100 transition-opacity"
            title="Admin Access"
          >
            <Settings className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground">
            <p className="mb-2">
              <strong>Important:</strong> This tool provides general information only and is not medical, legal, or billing advice. 
              Always consult your healthcare provider for eligibility and billing guidance.
            </p>
            <p>
              Data sourced from official Australian government disaster declaration websites. 
              Medicare Benefits Schedule (MBS) compliance as per Department of Health guidelines.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;