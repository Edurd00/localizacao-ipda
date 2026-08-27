import GeneralMapWrapper from '@/components/GeneralMapWrapper';

export default function MapaGeralPage() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <GeneralMapWrapper isAuthenticated={false} />
    </main>
  );
}
