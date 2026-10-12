import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function SignOutButton() {
  const { logout } = useAuth();
  return (
    <Button type="button" variant="outline" className="min-h-11 shrink-0 rounded-xl" onClick={() => logout()}>
      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
      Sign out
    </Button>
  );
}
