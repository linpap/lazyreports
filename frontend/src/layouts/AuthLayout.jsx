export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary-800 via-secondary-900 to-secondary-950 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-500 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <img
            src="https://reporting.lazysauce.com/assets/images/logo.png"
            alt="LazySauce"
            className="h-16 w-auto mb-8"
          />
          <h1 className="text-4xl font-bold text-white text-center mb-4">
            Analytics & Reporting
          </h1>
          <p className="text-secondary-400 text-center text-lg max-w-md">
            Powerful insights and comprehensive reporting for your business performance tracking.
          </p>

          {/* Feature highlights */}
          <div className="mt-12 space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4 text-secondary-300">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span>Real-time analytics dashboard</span>
            </div>
            <div className="flex items-center gap-4 text-secondary-300">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>Revenue tracking & insights</span>
            </div>
            <div className="flex items-center gap-4 text-secondary-300">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span>Advanced fraud detection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img
              src="https://reporting.lazysauce.com/assets/images/logo.png"
              alt="LazySauce"
              className="h-12 w-auto mx-auto mb-4"
            />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-elevated p-8">
            {children}
          </div>

          {/* Footer */}
          <p className="text-center text-secondary-400 text-sm mt-6">
            &copy; {new Date().getFullYear()} LazySauce. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
