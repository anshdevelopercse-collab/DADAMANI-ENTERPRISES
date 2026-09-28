import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center">
        {/* Glowing 404 */}
        <div className="relative mb-8">
          <div className="text-9xl font-black text-slate-800 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-9xl font-black bg-gradient-to-br from-sky-400 to-blue-600 bg-clip-text text-transparent opacity-20 blur-sm select-none">
              404
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="w-16 h-16 text-sky-500 opacity-80 animate-pulse" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Please check the URL or return
          to the dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-all duration-200 hover:scale-105 shadow-lg shadow-sky-900/40"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-all duration-200 border border-slate-700 hover:border-slate-600"
          >
            Go Back
          </button>
        </div>

        <div className="mt-12 text-slate-700 text-sm">
          Dada Mani Enterprise Operations Management System
        </div>
      </div>
    </div>
  );
};
