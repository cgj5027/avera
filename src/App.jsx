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
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate, useLocation } from 'react-router-dom';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import { ThemeProvider } from 'next-themes';

export const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, checkAppState } = useAuth();
  const location = useLocation();
  const publicRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const loginPath = '/login?returnTo=' + encodeURIComponent(location.pathname + location.search);
  if (!publicRoute && (isLoadingPublicSettings || isLoadingAuth)) return <LoadingState label="Checking your account" />;
  if (!publicRoute && authError && authError.type !== 'auth_required') {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    return <ErrorState message="We couldn't verify your account. Please try again." onRetry={checkAppState} />;
  }
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to={loginPath} replace />} />}>
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
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
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