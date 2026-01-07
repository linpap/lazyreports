import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AnalyticsReport from './pages/reports/AnalyticsReport';
import AffiliateReport from './pages/reports/AffiliateReport';
import DomainReport from './pages/reports/DomainReport';
import LocationsReport from './pages/reports/LocationsReport';
import ConversionReport from './pages/reports/ConversionReport';
import CustomReports from './pages/reports/CustomReports';
import CustomSQL from './pages/reports/CustomSQL';
import Decode from './pages/reports/Decode';
import SearchEngineMarketing from './pages/reports/SearchEngineMarketing';
import ImportSales from './pages/reports/ImportSales';
import HashReport from './pages/reports/HashReport';
import AveragesReport from './pages/reports/AveragesReport';
import AdvertiserReport from './pages/reports/AdvertiserReport';
import DetailsReport from './pages/reports/DetailsReport';
import OffendersReport from './pages/reports/OffendersReport';
import VictimsReport from './pages/reports/VictimsReport';
import SiteConversionReport from './pages/reports/SiteConversionReport';
import ChannelSubchannelReport from './pages/reports/ChannelSubchannelReport';
import PaydayConversionReport from './pages/reports/PaydayConversionReport';
import MadrivoReport from './pages/reports/MadrivoReport';
import ClientManagement from './pages/ClientManagement';
import IPActions from './pages/IPActions';
import Settings from './pages/Settings';
import Accounts from './pages/Accounts';
import NotFound from './pages/NotFound';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route wrapper (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <Login />
            </AuthLayout>
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Reports */}
        <Route path="reports">
          <Route index element={<AnalyticsReport />} />
          <Route path="analytics" element={<AnalyticsReport />} />
          <Route path="averages" element={<AveragesReport />} />
          <Route path="affiliate" element={<AffiliateReport />} />
          <Route path="domain" element={<DomainReport />} />
          <Route path="locations" element={<LocationsReport />} />
          <Route path="conversions" element={<ConversionReport />} />
          <Route path="custom" element={<CustomReports />} />
          <Route path="sql" element={<CustomSQL />} />
          <Route path="decode" element={<Decode />} />
          <Route path="sem" element={<SearchEngineMarketing />} />
          <Route path="import-sales" element={<ImportSales />} />
          <Route path="hash" element={<HashReport />} />
          <Route path="details" element={<DetailsReport />} />
          <Route path="offenders" element={<OffendersReport />} />
          <Route path="victims" element={<VictimsReport />} />
          <Route path="site-conversion" element={<SiteConversionReport />} />
          <Route path="channel-subchannel" element={<ChannelSubchannelReport />} />
          <Route path="payday-conversion" element={<PaydayConversionReport />} />
          <Route path="madrivo" element={<MadrivoReport />} />
        </Route>

        {/* Management */}
        <Route path="clients" element={<ClientManagement />} />
        <Route path="advertisers" element={<AdvertiserReport />} />
        <Route path="ip-actions" element={<IPActions />} />

        {/* Settings & Accounts */}
        <Route path="settings" element={<Settings />} />
        <Route path="accounts" element={<Accounts />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
