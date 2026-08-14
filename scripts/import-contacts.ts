import fs from 'fs';
import path from 'path';
import { upsertContactsBulk } from '../src/lib/db';
import { revalidatePath } from 'next/cache';

export async function processContactsCsvContent(csvContent: string) {
  // Normalize newlines and strip BOM
  const cleanContent = csvContent.replace(/^\uFEFF/, '');
  const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { success: false, message: 'O arquivo CSV está vazio.', count: 0 };
  }

  // Detect delimiter (; or ,)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const headers = headerLine.split(delimiter).map((h) => h.trim().toUpperCase());

  // Find column indices
  let totvsIdx = headers.findIndex((h) => h.includes('TOTVS') || h.includes('CODIGO'));
  let dirigenteIdx = headers.findIndex((h) => h.includes('DIRIGENTE') || h.includes('NOME'));
  let telefoneIdx = headers.findIndex((h) => h.includes('TELEFONE') || h.includes('FONE') || h.includes('WHATSAPP'));

  // Fallback defaults if headers missing/unclear
  if (totvsIdx === -1) totvsIdx = 0;
  if (dirigenteIdx === -1) dirigenteIdx = 1;
  if (telefoneIdx === -1) telefoneIdx = 2;

  const contactsToUpsert: Array<{
    codigo_totvs: string;
    dirigente_nome: string | null;
    dirigente_telefone: string | null;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((col) => col.trim());
    if (row.length === 0) continue;

    const rawTotvs = row[totvsIdx] || '';
    const rawDirigente = row[dirigenteIdx] || '';
    const rawTelefone = row[telefoneIdx] || '';

    // Clean TOTVS code (string without quotes)
    const totvs = rawTotvs.replace(/^"+|"+$/g, '').trim();

    if (!totvs || totvs.toUpperCase() === 'TOTVS') continue;

    contactsToUpsert.push({
      codigo_totvs: totvs,
      dirigente_nome: rawDirigente.replace(/^"+|"+$/g, '').trim() || null,
      dirigente_telefone: rawTelefone.replace(/^"+|"+$/g, '').trim() || null,
    });
  }

  console.log(`Parsed ${contactsToUpsert.length} contacts from CSV.`);

  if (contactsToUpsert.length === 0) {
    return { success: false, message: 'Nenhum contato válido encontrado no arquivo.', count: 0 };
  }

  const result = await upsertContactsBulk(contactsToUpsert);

  try {
    revalidatePath('/api/igrejas/validadas');
    revalidatePath('/organizacao');
    revalidatePath('/gestao');
  } catch (revalErr) {
    console.warn('Revalidation notice (non-fatal):', revalErr);
  }

  return {
    success: true,
    message: `Importação realizada com sucesso! ${result.updatedCount} igrejas atualizadas, ${result.insertedCount} novas inseridas.`,
    count: result.updatedCount + result.insertedCount,
    updatedCount: result.updatedCount,
    insertedCount: result.insertedCount,
  };
}

async function runDirectImportScript() {
  console.log('--- Iniciando Carga Inicial de Contatos CSV ---');
  const csvPath = path.join(process.cwd(), 'relatorio_igrejas_2026-08-14.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`Arquivo CSV não encontrado em: ${csvPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const res = await processContactsCsvContent(fileContent);
  console.log('Resultado da Carga:', res);
  console.log('--- Finalizado com Sucesso ---');
}

if (require.main === module) {
  runDirectImportScript().catch((err) => {
    console.error('Erro na carga de contatos:', err);
    process.exit(1);
  });
}
