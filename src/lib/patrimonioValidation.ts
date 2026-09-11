export interface DadosGeraisForm {
  codigo_totvs: string;
  nome_responsavel: string;
  telefone_responsavel: string;
  cargo_responsavel: string;
  ano_referencia: number;
  observacoes?: string;
}

export interface ItemPatrimonialForm {
  id: string;
  item_nome: string;
  categoria: string;
  quantidade: number;
  possui: boolean;
  conservacao: 'ÓTIMO' | 'BOM' | 'REGULAR' | 'RUIM';
  observacao?: string;
  isCustom?: boolean;
}

export interface FotoPatrimonialForm {
  id: string;
  nome: string;
  tamanho: number;
  previewUrl: string;
  legenda?: string;
}

export interface ErrosValidacao {
  [campo: string]: string;
}

export function validarDadosGerais(dados: Partial<DadosGeraisForm>): ErrosValidacao {
  const erros: ErrosValidacao = {};

  const nome = (dados.nome_responsavel || '').trim();
  if (!nome) {
    erros.nome_responsavel = 'O nome completo do dirigente é obrigatório.';
  } else if (nome.length < 3) {
    erros.nome_responsavel = 'O nome deve ter no mínimo 3 caracteres.';
  }

  const telefoneLimpo = (dados.telefone_responsavel || '').replace(/\D/g, '');
  if (!telefoneLimpo) {
    erros.telefone_responsavel = 'O telefone/WhatsApp de contato é obrigatório.';
  } else if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    erros.telefone_responsavel = 'Informe um telefone válido com DDD (10 ou 11 dígitos).';
  }

  const ano = Number(dados.ano_referencia);
  if (!ano || ano < 2020 || ano > 2035) {
    erros.ano_referencia = 'Ano de referência deve estar entre 2020 e 2035.';
  }

  return erros;
}

export function formatarTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (!nums) return '';
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
}
