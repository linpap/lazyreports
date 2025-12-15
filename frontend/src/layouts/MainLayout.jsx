import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  BarChart3,
  LayoutDashboard,
  FileText,
  Users,
  Globe,
  MapPin,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Code,
  Database,
  Key,
  Search,
  Upload,
  Hash,
  Calculator,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Reports',
    icon: FileText,
    children: [
      { name: 'Analytics', href: '/reports/analytics', icon: BarChart3 },
      { name: 'Averages', href: '/reports/averages', icon: Calculator },
      { name: 'Decode', href: '/reports/decode', icon: Key },
      { name: 'Search Engine Marketing', href: '/reports/sem', icon: Search },
      { name: 'Import Sales', href: '/reports/import-sales', icon: Upload },
      { name: 'Hash Report', href: '/reports/hash', icon: Hash },
      { name: 'Affiliate', href: '/reports/affiliate', icon: Users },
      { name: 'Domain', href: '/reports/domain', icon: Globe },
      { name: 'Locations', href: '/reports/locations', icon: MapPin },
      { name: 'Conversions', href: '/reports/conversions', icon: TrendingUp },
      { name: 'Custom Reports', href: '/reports/custom', icon: FileText },
      { name: 'Custom SQL', href: '/reports/sql', icon: Database },
    ],
  },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'IP Actions', href: '/ip-actions', icon: Shield },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function NavItem({ item, mobile = false }) {
  const [open, setOpen] = useState(false);
  const baseClass = mobile
    ? 'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors'
    : 'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors';

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`${baseClass} w-full text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900`}
        >
          <item.icon className="w-5 h-5 mr-3" />
          {item.name}
          <ChevronDown
            className={`w-4 h-4 ml-auto transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && (
          <div className="mt-1 ml-4 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                className={({ isActive }) =>
                  `${baseClass} ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                  }`
                }
              >
                <child.icon className="w-4 h-4 mr-3" />
                {child.name}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `${baseClass} ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
        }`
      }
    >
      <item.icon className="w-5 h-5 mr-3" />
      {item.name}
    </NavLink>
  );
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-secondary-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-secondary-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="ml-2 text-lg font-semibold text-secondary-900">
              LazySauce
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-secondary-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-secondary-200">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-medium">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-secondary-900">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-secondary-500 capitalize">
                {user?.role || 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-secondary-200">
          <div className="flex items-center justify-between h-full px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-secondary-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-secondary-600">
                Welcome, {user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
