'use client';

import dynamic from 'next/dynamic';

const GeneralMapComponent = dynamic(() => import('@/components/GeneralMapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-screen bg-zinc-50">
      <div className="flex flex-col items-center space-y-3">
        <svg className="animate-spin h-9 w-9 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs text-zinc-500 font-bold">Carregando Mapa Geral das Igrejas Validadas...</p>
      </div>
    </div>
  ),
});

export default function MapaGeralPage() {
  return <GeneralMapComponent />;
}
