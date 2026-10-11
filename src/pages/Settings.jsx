import AccountNameForm from '@/components/settings/AccountNameForm';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import SettingSection from '@/components/settings/SettingSection';
import ThemeSelect from '@/components/settings/ThemeSelect';
import HouseholdForm from '@/components/settings/HouseholdForm';
import BankConnections from '@/components/settings/BankConnections';
import ModeIndicator from '@/components/layout/ModeIndicator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Settings" subtitle="Profile, household, connections, and appearance." />
      <div className="space-y-4">
        <SettingSection title="Account" description="Your Avera account details.">
          {user ? (
            <div className="space-y-4">
              <AccountNameForm key={user.id} />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="mt-0.5 text-base font-medium text-foreground">{user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-base text-muted-foreground">Loading your profile…</p>
          )}
          {user && (
            <Button variant="outline" className="mt-4 min-h-11 rounded-xl" onClick={() => logout()}>
              Sign out
            </Button>
          )}
        </SettingSection>

        <SettingSection title="Appearance" description="A warm, organic dark mode is available.">
          <ThemeSelect />
        </SettingSection>

        <SettingSection title="Household profile" description="Household type, pay frequency, budget style, and preferences.">
          <HouseholdForm />
        </SettingSection>

        <SettingSection title="Bank connections" description="Simulated connections only in this stage.">
          <BankConnections />
        </SettingSection>

        <SettingSection title="Demo controls" description="Data mode for this session.">
          <ModeIndicator variant="inline" />
          <p className="mt-3 text-base text-muted-foreground">
            The selected mode is remembered on this device. Your financial records and private demo workspaces are saved to your account.{' '}
            <Link to="/welcome" className="font-medium text-primary underline underline-offset-2">
              View mode options
            </Link>
          </p>
        </SettingSection>

        <SettingSection title="Privacy" description="You stay in control of your information.">
          <p className="flex items-start gap-2 text-base text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            Avera never executes payments or authorizes transfers. Demo reset removes only your demo workspace; it does not delete your account or ordinary records. Contact the app team for account deletion and retention details.
          </p>
        </SettingSection>

        <SettingSection title="Notifications" description="Reminders about upcoming bills and goals.">
          <p className="text-base text-muted-foreground">
            Bill reminders are shown in the app. Email and push notification delivery are not available.
          </p>
        </SettingSection>
      </div>
    </div>
  );
}
