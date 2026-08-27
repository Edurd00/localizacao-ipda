'use client';

import { useState, useEffect } from 'react';
import GeneralMapWrapper from '@/components/GeneralMapWrapper';

export default function MapaGeralPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUserRole(data.role);
        }
      })
      .catch((err) => console.error('Error fetching session:', err));
  }, []);

  return (
    <main className="w-full h-screen overflow-hidden">
      <GeneralMapWrapper isAuthenticated={isAuthenticated} userRole={userRole} />
    </main>
  );
}
