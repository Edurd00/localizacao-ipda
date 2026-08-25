// Força o Next.js a sempre executar o renderizador em tempo de requisição
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import GeneralMapWrapper from '@/components/GeneralMapWrapper';

export default function LandingPage() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <GeneralMapWrapper />
    </main>
  );
}
