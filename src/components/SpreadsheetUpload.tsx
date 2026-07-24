'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { parseSpreadsheetRow } from '@/lib/parser';
import { Igreja } from '@/lib/db';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SpreadsheetUploadProps {
  onUploadSuccess: () => void;
}

export default function SpreadsheetUpload({ onUploadSuccess }: SpreadsheetUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    parsedCount?: number;
  }>({ type: null, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'csv' && fileExtension !== 'xls') {
      setStatus({
        type: 'error',
        message: 'Formato inválido. Por favor, envie uma planilha (.xlsx, .xls ou .csv).',
      });
      return;
    }

    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            setStatus({ type: 'error', message: 'Dados da planilha vazios ou inválidos.' });
            setLoading(false);
            return;
          }

          // Read the sheet binaries as string
          let binaryString = '';
          if (typeof data === 'string') {
            binaryString = data;
          } else {
            const bytes = new Uint8Array(data as ArrayBuffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binaryString += String.fromCharCode(bytes[i]);
            }
          }

          // We can read file as base64 string to process multiple sheets natively on the server-side
          const base64Data = btoa(binaryString);

          // Send to the backend
          const res = await fetch('/api/igrejas/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64Data }),
          });

          const result = await res.json();

          if (result.success) {
            setStatus({
              type: 'success',
              message: `Sucesso! ${result.count} igrejas foram processadas, validadas e importadas/atualizadas com mapeamento vertical de coligações.`,
              parsedCount: result.count,
            });
            onUploadSuccess();
          } else {
            setStatus({
              type: 'error',
              message: result.error || 'Erro ao salvar registros no banco de dados.',
            });
          }
        } catch (err: unknown) {
          console.error(err);
          const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          setStatus({
            type: 'error',
            message: `Erro ao processar o arquivo: ${errMsg}`,
          });
        } finally {
          setLoading(false);
        }
      };

      reader.readAsBinaryString(file);
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setStatus({
        type: 'error',
        message: `Erro de leitura do arquivo: ${errMsg}`,
      });
      setLoading(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm transition-all duration-200">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <FileSpreadsheet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Upload de Planilha Regional</h2>
          <p className="text-xs text-zinc-500">Mapeamento automático de campos (.xlsx, .xls, .csv)</p>
        </div>
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          disabled={loading}
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-3 py-4 text-zinc-600">
            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium">Processando e enviando dados da planilha...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-3 py-2">
            <div className="p-3 bg-zinc-100 text-zinc-600 rounded-full">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-700">
                Arraste e solte o arquivo aqui, ou <span className="text-indigo-600">clique para buscar</span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">Colunas suportadas: Codigo, Desc Igreja, Tipo Imovel, Endereco, Bairro, Municipio, Estado, CEP, Endereco www, Lat e Long</p>
            </div>
          </div>
        )}
      </div>

      {status.type && (
        <div
          className={`mt-4 p-4 rounded-lg flex items-start space-x-3 text-sm ${
            status.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{status.type === 'success' ? 'Sucesso!' : 'Ocorreu um erro'}</p>
            <p className="text-xs opacity-90 mt-0.5">{status.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
