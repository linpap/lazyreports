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
  Bell,
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

function NavItem({ item, mobile = false, onNavigate }) {
  const [open, setOpen] = useState(false);
  const baseClass = mobile
    ? 'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200'
    : 'flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200';

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`${baseClass} w-full text-secondary-600 hover:bg-primary-50 hover:text-primary-600`}
        >
          <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          <ChevronDown
            className={`w-4 h-4 ml-auto transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-1 ml-4 pl-4 border-l-2 border-secondary-100 space-y-1">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${baseClass} ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-soft'
                      : 'text-secondary-600 hover:bg-primary-50 hover:text-primary-600'
                  }`
                }
              >
                <child.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="truncate">{child.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${baseClass} ${
          isActive
            ? 'bg-primary-500 text-white shadow-soft'
            : 'text-secondary-600 hover:bg-primary-50 hover:text-primary-600'
        }`
      }
    >
      <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
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

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-900/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-elevated transform transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-secondary-100 flex-shrink-0">
          <div className="flex items-center">
            <img
              src="https://reporting.lazysauce.com/assets/images/logo.png"
              alt="LazySauce"
              className="h-10 w-auto"
            />
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-2 rounded-xl hover:bg-secondary-100 transition-colors"
          >
            <X className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => (
            <NavItem key={item.name} item={item} onNavigate={closeSidebar} />
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-secondary-100 flex-shrink-0 bg-gradient-to-t from-secondary-50 to-white">
          <div className="flex items-center p-3 rounded-xl bg-white shadow-card mb-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-soft">
              <span className="text-white font-semibold text-lg">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-semibold text-secondary-900 truncate">
                {user?.username || 'User'}
              </p>
              <p className="text-xs text-secondary-500 capitalize truncate">
                {user?.role || 'User'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-secondary-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-secondary-100">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-secondary-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-secondary-600" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-xl hover:bg-secondary-100 transition-colors">
                <Bell className="w-5 h-5 text-secondary-500" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full"></span>
              </button>
              <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-secondary-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-secondary-900">
                    {user?.username}
                  </p>
                  <p className="text-xs text-secondary-500 capitalize">
                    {user?.role || 'User'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-soft">
                  <span className="text-white font-semibold">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
