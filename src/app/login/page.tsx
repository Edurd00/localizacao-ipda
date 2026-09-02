'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { ArrowLeft, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submitAuth = async (loginEmail: string, loginPass: string) => {
    if (!loginEmail || !loginPass) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Login bem-sucedido! Redirecionando...');
        setTimeout(() => {
          window.location.href = '/validacao';
        }, 1000);
      } else {
        toast.error(data.error || 'Falha ao autenticar.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitAuth(email, password);
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    submitAuth(demoEmail, demoPass);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <Toaster position="top-right" richColors closeButton />

      {/* Back button to public map */}
      <div className="absolute top-6 left-6">
        <a
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 shadow-xs transition-all hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Mapa Geral</span>
        </a>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/img/logo.png"
            alt="GeoManager Enterprise"
            className="h-16 w-auto object-contain shadow-md"
          />
        </div>
        <h2 className="mt-6 text-center text-2xl font-black text-zinc-900 tracking-tight flex items-center justify-center gap-1.5">
          Painel GeoManager Enterprise <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500 animate-pulse" />
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500 font-semibold uppercase tracking-wider">
          Geolocalizações • Área Restrita da Equipe
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-zinc-200/80 rounded-2xl sm:px-10 space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Endereço de E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
                  placeholder="ex: admin@ipda.com.br"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <div className="mt-1 relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-zinc-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 text-xs text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium transition-all"
                  placeholder="Sua senha secreta"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Acessar Painel</span>
                )}
              </button>
            </div>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-zinc-500">Acesso Rápido (Portfólio)</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin@geomanager.com', 'admin123')}
              className="w-full flex justify-center py-2.5 px-4 border border-purple-200 rounded-xl shadow-xs text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Entrar como Gestor (Admin)
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('viewer@geomanager.com', 'viewer123')}
              className="w-full flex justify-center py-2.5 px-4 border border-zinc-300 rounded-xl shadow-xs text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Entrar como Leitor (Viewer)
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-center">
            <span className="text-[10px] text-zinc-400 font-medium">
              Acesso estritamente restrito a equipe de Gestão de Dados.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
