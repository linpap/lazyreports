import { BarChart3 } from 'lucide-react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <BarChart3 className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">LazySauce Analytics</h1>
          <p className="text-primary-200 mt-1">Analytics & Reporting Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-primary-200 text-sm mt-6">
          &copy; {new Date().getFullYear()} LazySauce. All rights reserved.
        </p>
      </div>
    </div>
  );
}
