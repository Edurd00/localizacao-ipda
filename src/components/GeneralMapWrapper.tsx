'use client';

import dynamic from 'next/dynamic';

const GeneralMapWrapper = dynamic(() => import('./GeneralMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-slate-900">
      <svg className="animate-spin h-9 w-9 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-xs font-bold text-zinc-700 dark:text-slate-300">Carregando mapa interativo...</p>
    </div>
  ),
});

export default GeneralMapWrapper;
