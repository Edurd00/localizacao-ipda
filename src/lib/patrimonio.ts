import { pool, getIgrejas, saveIgrejaSingle } from './db';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://tvhclmidfphwsimnsewr.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const getSupabaseClient = () => {
  if (!supabaseKey) return null;
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
};

export interface SalvarPatrimonioItemInput {
  item_nome: string;
  quantidade: number;
  possui: string; // 'Sim' | 'Não'
  conservacao?: string; // 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM'
  observacao?: string | null;
}

export interface SalvarPatrimonioInput {
  codigo_totvs: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  cargo_responsavel?: string | null;
  ano_referencia?: number;
  observacoes?: string | null;
  itens: SalvarPatrimonioItemInput[];
}

export interface IgrejaInfoPublica {
  codigo_totvs: string;
  desc_igreja: string;
  endereco: string;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  porte?: string | null;
  dirigente_nome?: string | null;
  dirigente_telefone?: string | null;
}

// In-Memory fallback store
interface MemoryPatrimonioSubmissao {
  id: string | number;
  codigo_totvs: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  ano_referencia: number;
  data_envio: string;
  observacoes?: string | null;
  criado_em: string;
}

interface MemoryPatrimonioItem {
  id: string | number;
  submissao_id: string | number;
  item_nome: string;
  quantidade: number;
  possui: string;
  conservacao?: string | null;
  observacao?: string | null;
}

const memorySubmissoes: MemoryPatrimonioSubmissao[] = [];
const memoryItens: MemoryPatrimonioItem[] = [];

/**
 * Garante as tabelas de patrimônio no PostgreSQL se ainda não existirem
 */
let tablesEnsured = false;
async function ensurePatrimonioTables() {
  if (tablesEnsured || !pool) return;
  try {
    const ddl = `
      CREATE TABLE IF NOT EXISTS patrimonio_submissoes (
        id SERIAL PRIMARY KEY,
        codigo_totvs VARCHAR(50) NOT NULL,
        nome_responsavel VARCHAR(255),
        telefone_responsavel VARCHAR(50),
        ano_referencia INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
        data_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        observacoes TEXT,
        criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patrimonio_itens (
        id SERIAL PRIMARY KEY,
        submissao_id INT NOT NULL,
        item_nome VARCHAR(255) NOT NULL,
        quantidade NUMERIC DEFAULT 1,
        possui VARCHAR(20) DEFAULT 'Sim',
        conservacao VARCHAR(50),
        observacao TEXT,
        criado_em TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_patrimonio_submissoes_totvs ON patrimonio_submissoes (codigo_totvs);
      CREATE INDEX IF NOT EXISTS idx_patrimonio_itens_submissao ON patrimonio_itens (submissao_id);
    `;
    await pool.query(ddl);
    tablesEnsured = true;
  } catch (err) {
    console.error('Erro ao verificar/criar tabelas de patrimônio:', err);
  }
}

export interface IgrejaMinimaPublica {
  codigo_totvs: string;
  desc_igreja: string;
  endereco: string;
  bairro: string;
  municipio: string;
  estado: string;
}

/**
 * Retorna exclusivamente os dados mínimos de endereço público da igreja.
 * Não retorna telefones, e-mails ou nomes de dirigentes antigos.
 */
export async function obterIgrejaMinima(totvs: string): Promise<IgrejaMinimaPublica | null> {
  const cleanTotvs = (totvs || '').trim();
  if (!cleanTotvs) return null;

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT codigo_totvs, desc_igreja, endereco, bairro, municipio, estado
         FROM igrejas
         WHERE LOWER(codigo_totvs) = $1
         LIMIT 1`,
        [cleanTotvs]
      );
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        return {
          codigo_totvs: row.codigo_totvs,
          desc_igreja: row.desc_igreja,
          endereco: row.endereco || '',
          bairro: row.bairro || '',
          municipio: row.municipio || '',
          estado: row.estado || '',
        };
      }
    } catch (err) {
      console.error('Postgres error in obterIgrejaMinima:', err);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('igrejas')
        .select('codigo_totvs, desc_igreja, endereco, bairro, municipio, estado')
        .ilike('codigo_totvs', cleanTotvs)
        .limit(1);
      if (!error && data && data.length > 0) {
        const row = data[0];
        return {
          codigo_totvs: row.codigo_totvs,
          desc_igreja: row.desc_igreja,
          endereco: row.endereco || '',
          bairro: row.bairro || '',
          municipio: row.municipio || '',
          estado: row.estado || '',
        };
      }
    } catch (supaErr) {
      console.error('Supabase error in obterIgrejaMinima:', supaErr);
    }
  }

  // Fallback via getIgrejas
  try {
    const list = await getIgrejas({ search: cleanTotvs });
    const found = list.data.find(
      (ig) => ig.codigo_totvs.toLowerCase() === cleanTotvs.toLowerCase()
    );
    if (found) {
      return {
        codigo_totvs: found.codigo_totvs,
        desc_igreja: found.desc_igreja,
        endereco: found.endereco || '',
        bairro: found.bairro || '',
        municipio: found.municipio || '',
        estado: found.estado || '',
      };
    }
  } catch (memErr) {
    console.error('Fallback error in obterIgrejaMinima:', memErr);
  }

  return null;
}

/**
 * Busca os dados da igreja pelo código TOTVS
 */
export async function obterIgrejaPorTotvs(totvs: string): Promise<IgrejaInfoPublica | null> {
  const cleanTotvs = (totvs || '').trim();
  if (!cleanTotvs) return null;

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT codigo_totvs, desc_igreja, endereco, bairro, municipio, estado, cep, porte, dirigente_nome, dirigente_telefone
         FROM igrejas
         WHERE LOWER(codigo_totvs) = $1
         LIMIT 1`,
        [cleanTotvs]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows[0] as IgrejaInfoPublica;
      }
    } catch (err) {
      console.error('Postgres error in obterIgrejaPorTotvs:', err);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('igrejas')
        .select('codigo_totvs, desc_igreja, endereco, bairro, municipio, estado, cep, porte, dirigente_nome, dirigente_telefone')
        .ilike('codigo_totvs', cleanTotvs)
        .limit(1);
      if (!error && data && data.length > 0) {
        return data[0] as IgrejaInfoPublica;
      }
    } catch (supaErr) {
      console.error('Supabase error in obterIgrejaPorTotvs:', supaErr);
    }
  }

  // Fallback via getIgrejas
  try {
    const list = await getIgrejas({ search: cleanTotvs });
    const found = list.data.find(
      (ig) => ig.codigo_totvs.toLowerCase() === cleanTotvs.toLowerCase()
    );
    if (found) {
      return {
        codigo_totvs: found.codigo_totvs,
        desc_igreja: found.desc_igreja,
        endereco: found.endereco || '',
        bairro: found.bairro || '',
        municipio: found.municipio || '',
        estado: found.estado || '',
        cep: found.cep || '',
        porte: found.porte || null,
        dirigente_nome: found.dirigente_nome || null,
        dirigente_telefone: found.dirigente_telefone || null,
      };
    }
  } catch (memErr) {
    console.error('Fallback error in obterIgrejaPorTotvs:', memErr);
  }

  return null;
}

/**
 * Busca a última submissão de patrimônio e seus itens para o TOTVS informado
 */
export async function obterPatrimonioCompleto(totvs: string) {
  const cleanTotvs = (totvs || '').trim();
  if (!cleanTotvs) return null;

  await ensurePatrimonioTables();

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('patrimonio_submissoes')
        .select('*, patrimonio_itens(*)')
        .ilike('codigo_totvs', cleanTotvs)
        .order('ano_referencia', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        return data[0];
      }
    } catch (err) {
      console.error('Supabase error in obterPatrimonioCompleto:', err);
    }
  }

  if (pool) {
    try {
      const query = `
        SELECT s.*,
          COALESCE(
            json_agg(i.*) FILTER (WHERE i.id IS NOT NULL),
            '[]'::json
          ) AS patrimonio_itens
        FROM patrimonio_submissoes s
        LEFT JOIN patrimonio_itens i ON s.id = i.submissao_id
        WHERE LOWER(s.codigo_totvs) = $1
        GROUP BY s.id
        ORDER BY s.ano_referencia DESC
        LIMIT 1
      `;
      const res = await pool.query(query, [cleanTotvs]);
      if (res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
    } catch (poolErr) {
      console.error('Postgres error in obterPatrimonioCompleto:', poolErr);
    }
  }

  // Fallback in-memory
  const sub = memorySubmissoes
    .filter((s) => s.codigo_totvs === cleanTotvs)
    .sort((a, b) => b.ano_referencia - a.ano_referencia)[0];

  if (sub) {
    const itens = memoryItens.filter((i) => i.submissao_id === sub.id);
    return {
      ...sub,
      patrimonio_itens: itens,
    };
  }

  return null;
}

/**
 * Salva ou atualiza a submissão de patrimônio e seus itens
 */
export async function salvarSubmissaoPatrimonio(input: SalvarPatrimonioInput): Promise<{
  submissao_id: string | number;
  codigo_totvs: string;
  ano_referencia: number;
  itens_salvos: number;
}> {
  const cleanTotvs = (input.codigo_totvs || '').trim();
  if (!cleanTotvs) {
    throw new Error('Código TOTVS da igreja é obrigatório.');
  }

  const igreja = await obterIgrejaPorTotvs(cleanTotvs);
  if (!igreja) {
    throw new Error(`Igreja com código TOTVS "${cleanTotvs}" não encontrada no sistema.`);
  }

  const anoReferencia = input.ano_referencia || new Date().getFullYear();
  const nomeResponsavel = (input.nome_responsavel || '').trim();
  const telefoneResponsavel = (input.telefone_responsavel || '').trim();
  const observacoes = input.observacoes?.trim() || null;
  const itens = input.itens || [];
  await ensurePatrimonioTables();

  // Tentativa 1: PostgreSQL via pool com transação segura (BEGIN / COMMIT)
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verifica se já existe submissão para este TOTVS no mesmo ano de referência
      const existingSubRes = await client.query(
        `SELECT id FROM patrimonio_submissoes WHERE LOWER(codigo_totvs) = $1 AND ano_referencia = $2 LIMIT 1`,
        [cleanTotvs, anoReferencia]
      );

      let submissaoId: number;

      if (existingSubRes.rows.length > 0) {
        submissaoId = existingSubRes.rows[0].id;
        await client.query(
          `UPDATE patrimonio_submissoes
           SET nome_responsavel = $1,
               telefone_responsavel = $2,
               data_envio = CURRENT_TIMESTAMP,
               observacoes = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [nomeResponsavel, telefoneResponsavel, observacoes, submissaoId]
        );

        // Remove itens antigos para reinserção limpa e atualizada
        await client.query(`DELETE FROM patrimonio_itens WHERE submissao_id = $1`, [submissaoId]);
      } else {
        const insertSubRes = await client.query(
          `INSERT INTO patrimonio_submissoes (
             codigo_totvs, nome_responsavel, telefone_responsavel, ano_referencia, data_envio, observacoes
           ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
           RETURNING id`,
          [cleanTotvs, nomeResponsavel, telefoneResponsavel, anoReferencia, observacoes]
        );
        submissaoId = insertSubRes.rows[0].id;
      }

      // Inserção dos itens
      let itensCount = 0;
      for (const item of itens) {
        const itemNome = (item.item_nome || '').trim();
        if (!itemNome) continue;

        const qtd = Number(item.quantidade) || 1;
        const possui = item.possui?.trim() || 'Sim';
        const conservacao = item.conservacao?.trim() || 'BOM';
        const obs = item.observacao?.trim() || null;

        await client.query(
          `INSERT INTO patrimonio_itens (submissao_id, item_nome, quantidade, possui, conservacao, observacao)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [submissaoId, itemNome, qtd, possui, conservacao, obs]
        );
        itensCount++;
      }

      // Sincronização condicional do contato do dirigente na tabela public.igrejas
      // APENAS SE dirigente_nome ou dirigente_telefone estiverem nulos ou vazios
      await client.query(
        `UPDATE public.igrejas
         SET dirigente_nome = CASE WHEN dirigente_nome IS NULL OR TRIM(dirigente_nome) = '' THEN $1 ELSE dirigente_nome END,
             dirigente_telefone = CASE WHEN dirigente_telefone IS NULL OR TRIM(dirigente_telefone) = '' THEN $2 ELSE dirigente_telefone END,
             updated_at = NOW()
         WHERE LOWER(codigo_totvs) = LOWER($3)
           AND ((dirigente_nome IS NULL OR TRIM(dirigente_nome) = '') OR (dirigente_telefone IS NULL OR TRIM(dirigente_telefone) = ''))`,
        [nomeResponsavel, telefoneResponsavel, cleanTotvs]
      );

      await client.query('COMMIT');

      return {
        submissao_id: submissaoId,
        codigo_totvs: cleanTotvs,
        ano_referencia: anoReferencia,
        itens_salvos: itensCount,
      };
    } catch (pgErr) {
      await client.query('ROLLBACK');
      console.error('Erro na transação Postgres de patrimônio:', pgErr);
      throw pgErr;
    } finally {
      client.release();
    }
  }

  // Tentativa 2: Supabase Client
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: existingSub } = await supabase
        .from('patrimonio_submissoes')
        .select('id')
        .ilike('codigo_totvs', cleanTotvs)
        .eq('ano_referencia', anoReferencia)
        .limit(1);

      let submissaoId: string | number;

      if (existingSub && existingSub.length > 0) {
        submissaoId = existingSub[0].id;
        await supabase
          .from('patrimonio_submissoes')
          .update({
            nome_responsavel: nomeResponsavel,
            telefone_responsavel: telefoneResponsavel,
            data_envio: new Date().toISOString(),
            observacoes,
          })
          .eq('id', submissaoId);

        await supabase.from('patrimonio_itens').delete().eq('submissao_id', submissaoId);
      } else {
        const { data: insertedSub, error: insertErr } = await supabase
          .from('patrimonio_submissoes')
          .insert({
            codigo_totvs: cleanTotvs,
            nome_responsavel: nomeResponsavel,
            telefone_responsavel: telefoneResponsavel,
            ano_referencia: anoReferencia,
            data_envio: new Date().toISOString(),
            observacoes,
          })
          .select('id')
          .single();

        if (insertErr || !insertedSub) {
          throw new Error(insertErr?.message || 'Falha ao inserir submissão no Supabase');
        }
        submissaoId = insertedSub.id;
      }

      const rowsToInsert = itens
        .filter((it) => Boolean(it.item_nome && it.item_nome.trim()))
        .map((it) => ({
          submissao_id: submissaoId,
          item_nome: it.item_nome.trim(),
          quantidade: Number(it.quantidade) || 1,
          possui: it.possui?.trim() || 'Sim',
          conservacao: it.conservacao?.trim() || 'BOM',
          observacao: it.observacao?.trim() || null,
        }));

      if (rowsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('patrimonio_itens').insert(rowsToInsert);
        if (itemsErr) {
          console.warn('Aviso ao inserir itens no Supabase:', itemsErr);
        }
      }

      // Sincroniza o dirigente na tabela igrejas no Supabase se estiver nulo ou vazio
      if (nomeResponsavel) {
        try {
          const { data: curIg } = await supabase
            .from('igrejas')
            .select('dirigente_nome, dirigente_telefone')
            .ilike('codigo_totvs', cleanTotvs)
            .limit(1);

          if (curIg && curIg.length > 0) {
            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (!curIg[0].dirigente_nome || !curIg[0].dirigente_nome.trim()) {
              updates.dirigente_nome = nomeResponsavel;
            }
            if (!curIg[0].dirigente_telefone || !curIg[0].dirigente_telefone.trim()) {
              updates.dirigente_telefone = telefoneResponsavel;
            }
            if (Object.keys(updates).length > 1) {
              await supabase
                .from('igrejas')
                .update(updates)
                .ilike('codigo_totvs', cleanTotvs);
            }
          }
        } catch (dirErr) {
          console.warn('Aviso ao atualizar dirigente no Supabase:', dirErr);
        }
      }

      return {
        submissao_id: submissaoId,
        codigo_totvs: cleanTotvs,
        ano_referencia: anoReferencia,
        itens_salvos: rowsToInsert.length,
      };
    } catch (supaErr) {
      console.error('Erro ao salvar no Supabase:', supaErr);
      throw supaErr;
    }
  }

  // Fallback 3: In-Memory DB
  let subId = `sub_${Date.now()}`;
  const existingIdx = memorySubmissoes.findIndex(
    (s) => s.codigo_totvs === cleanTotvs && s.ano_referencia === anoReferencia
  );

  if (existingIdx !== -1) {
    subId = String(memorySubmissoes[existingIdx].id);
    memorySubmissoes[existingIdx] = {
      ...memorySubmissoes[existingIdx],
      nome_responsavel: nomeResponsavel,
      telefone_responsavel: telefoneResponsavel,
      data_envio: new Date().toISOString(),
      observacoes,
    };
    // Remove itens anteriores
    for (let i = memoryItens.length - 1; i >= 0; i--) {
      if (memoryItens[i].submissao_id === subId) {
        memoryItens.splice(i, 1);
      }
    }
  } else {
    memorySubmissoes.push({
      id: subId,
      codigo_totvs: cleanTotvs,
      nome_responsavel: nomeResponsavel,
      telefone_responsavel: telefoneResponsavel,
      ano_referencia: anoReferencia,
      data_envio: new Date().toISOString(),
      observacoes,
      criado_em: new Date().toISOString(),
    });
  }

  let itensCount = 0;
  itens.forEach((it) => {
    if (!it.item_nome) return;
    memoryItens.push({
      id: `item_${Date.now()}_${Math.random()}`,
      submissao_id: subId,
      item_nome: it.item_nome.trim(),
      quantidade: Number(it.quantidade) || 1,
      possui: it.possui?.trim() || 'Sim',
      conservacao: it.conservacao?.trim() || 'BOM',
      observacao: it.observacao?.trim() || null,
    });
    itensCount++;
  });

  // Sincroniza dirigente na memória (equivalente ao UPDATE public.igrejas no Postgres)
  try {
    await saveIgrejaSingle(
      { codigo_totvs: cleanTotvs },
      {
        dirigente_nome: nomeResponsavel,
        dirigente_telefone: telefoneResponsavel,
      }
    );
  } catch {
    // Não-crítico em modo in-memory; ignora silenciosamente
  }

  return {
    submissao_id: subId,
    codigo_totvs: cleanTotvs,
    ano_referencia: anoReferencia,
    itens_salvos: itensCount,
  };
}


/**
 * Verifica se já existe uma submissão de patrimônio para o TOTVS no ano informado
 */
export async function verificarSubmissaoAnual(totvs: string, ano: number = new Date().getFullYear()): Promise<boolean> {
  const cleanTotvs = (totvs || '').trim();
  if (!cleanTotvs) return false;

  await ensurePatrimonioTables();

  if (pool) {
    try {
      const res = await pool.query(
        `SELECT id FROM patrimonio_submissoes
         WHERE LOWER(codigo_totvs) = LOWER($1)
           AND ano_referencia = EXTRACT(YEAR FROM CURRENT_DATE)
         LIMIT 1`,
        [cleanTotvs]
      );
      return res.rows.length > 0;
    } catch (err) {
      console.error('Postgres error in verificarSubmissaoAnual:', err);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('patrimonio_submissoes')
        .select('id')
        .ilike('codigo_totvs', cleanTotvs)
        .eq('ano_referencia', ano)
        .limit(1);

      if (!error && data && data.length > 0) {
        return true;
      }
    } catch (supaErr) {
      console.error('Supabase error in verificarSubmissaoAnual:', supaErr);
    }
  }

  const found = memorySubmissoes.find(
    (s) => s.codigo_totvs.toLowerCase() === cleanTotvs.toLowerCase() && s.ano_referencia === ano
  );
  return Boolean(found);
}


/**
 * Corrige manualmente o Código TOTVS de uma submissão de patrimônio existente
 */
export async function corrigirTotvsPatrimonio(
  submissaoId: string | number,
  novoCodigoTotvs: string
): Promise<{ success: boolean; message: string }> {
  const cleanTotvs = (novoCodigoTotvs || '').trim();
  if (!cleanTotvs) {
    throw new Error('O novo código TOTVS é obrigatório.');
  }

  const igreja = await obterIgrejaPorTotvs(cleanTotvs);
  if (!igreja) {
    throw new Error(`A congregação com código TOTVS "${cleanTotvs}" não foi encontrada no sistema.`);
  }

  await ensurePatrimonioTables();

  if (pool) {
    const res = await pool.query(
      `UPDATE patrimonio_submissoes
       SET codigo_totvs = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id`,
      [cleanTotvs, submissaoId]
    );

    if (!res.rows || res.rows.length === 0) {
      throw new Error(`Submissão de patrimônio #${submissaoId} não encontrada.`);
    }

    return { success: true, message: 'Código TOTVS corrigido com sucesso!' };
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('patrimonio_submissoes')
      .update({ codigo_totvs: cleanTotvs, updated_at: new Date().toISOString() })
      .eq('id', submissaoId)
      .select('id');

    if (error || !data || data.length === 0) {
      throw new Error(error?.message || `Submissão de patrimônio #${submissaoId} não encontrada.`);
    }

    return { success: true, message: 'Código TOTVS corrigido com sucesso!' };
  }

  const sub = memorySubmissoes.find((s) => String(s.id) === String(submissaoId));
  if (!sub) {
    throw new Error(`Submissão de patrimônio #${submissaoId} não encontrada.`);
  }
  sub.codigo_totvs = cleanTotvs;

  return { success: true, message: 'Código TOTVS corrigido com sucesso!' };
}
