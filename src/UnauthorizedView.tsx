import React from 'react';

const UnauthorizedView: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-stone-50 text-center px-4">
    <div className="max-w-md rounded-lg bg-white p-8 shadow-md ring-1 ring-stone-200">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase">403 — Access Denied</h1>
      <p className="text-stone-500 mt-2 text-sm leading-relaxed">
        Your credentials do not have the required permissions to view this page.
      </p>
      <a
        href="/"
        className="mt-5 inline-block text-xs font-bold tracking-wider uppercase text-[#A37F2B] hover:text-[#1E4620] transition-colors"
      >
        &larr; Return to Dashboard
      </a>
    </div>
  </div>
);

export default UnauthorizedView;