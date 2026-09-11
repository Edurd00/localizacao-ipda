import React from 'react';
import type { Metadata } from 'next';
import PatrimonioClientForm from './[totvs]/PatrimonioClientForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Declaração de Patrimônio da Igreja | IPDA',
  description: 'Preenchimento e declaração pública de bens e patrimônio das igrejas locais IPDA.',
};

export default function Page() {
  return <PatrimonioClientForm totvs="" />;
}
