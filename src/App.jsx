import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import AppLayout from '@/components/layout/AppLayout';
import Overview from '@/pages/Overview';
import BillsBudget from '@/pages/BillsBudget';
import YearlyPlan from '@/pages/YearlyPlan';
import GoalsOpportunities from '@/pages/GoalsOpportunities';
import Properties from '@/pages/Properties';
import AskAveraPage from '@/pages/AskAveraPage';
import Settings from '@/pages/Settings';
import ModeEntry from '@/pages/ModeEntry';
import { ThemeProvider } from 'next-themes';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/bills-budget" element={<BillsBudget />} />
        <Route path="/yearly-plan" element={<YearlyPlan />} />
        <Route path="/goals-opportunities" element={<GoalsOpportunities />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/ask-avera" element={<AskAveraPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/welcome" element={<ModeEntry />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App