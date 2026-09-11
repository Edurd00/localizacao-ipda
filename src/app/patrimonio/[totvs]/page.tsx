import React from 'react';
import type { Metadata } from 'next';
import PatrimonioClientForm from './PatrimonioClientForm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ totvs: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  return {
    title: `Declaração de Patrimônio - TOTVS ${resolved.totvs} | IPDA`,
    description: `Preenchimento e declaração pública de bens e patrimônio para igreja código TOTVS ${resolved.totvs}.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ totvs: string }>;
}) {
  const resolved = await params;
  return <PatrimonioClientForm totvs={resolved.totvs} />;
}
