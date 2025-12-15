import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-secondary-200">404</h1>
        <h2 className="text-2xl font-bold text-secondary-900 mt-4">
          Page not found
        </h2>
        <p className="text-secondary-600 mt-2 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been
          moved or deleted.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link to="/" className="btn btn-primary">
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
