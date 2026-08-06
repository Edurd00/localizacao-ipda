'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isDanger = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200 text-left">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl border ${
              isDanger
                ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/60 dark:text-rose-400'
                : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/60 dark:text-amber-400'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">{title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-350 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-650 dark:text-slate-300 leading-relaxed">
          {message}
        </p>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-zinc-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 text-white font-bold text-xs rounded-xl shadow-md transition-all ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10 active:scale-[0.98]'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/10 active:scale-[0.98]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
