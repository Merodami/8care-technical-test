import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '8Care - Authentication',
  description: 'Sign in or create an account',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">8Care</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Healthcare Role Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
