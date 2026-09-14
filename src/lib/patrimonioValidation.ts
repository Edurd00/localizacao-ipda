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

export const DDDS_VALIDOS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24',
  '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46',
  '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

export function validarTelefoneComDdd(telefone: string): { valido: boolean; erro?: string; digitos?: string } {
  const digitos = (telefone || '').replace(/\D/g, '');
  if (!digitos) {
    return { valido: false, erro: 'O telefone/WhatsApp de contato é obrigatório.' };
  }
  if (digitos.length < 10 || digitos.length > 11) {
    return {
      valido: false,
      erro: 'O telefone deve conter entre 10 e 11 dígitos numéricos (com DDD).',
    };
  }
  const ddd = digitos.slice(0, 2);
  if (!DDDS_VALIDOS.has(ddd)) {
    return {
      valido: false,
      erro: `O DDD (${ddd}) informado não é válido no Brasil.`,
    };
  }
  return { valido: true, digitos };
}

export function validarDadosGerais(dados: Partial<DadosGeraisForm>): ErrosValidacao {
  const erros: ErrosValidacao = {};

  const nome = (dados.nome_responsavel || '').trim();
  if (!nome) {
    erros.nome_responsavel = 'O nome completo do dirigente é obrigatório.';
  } else if (nome.length < 3) {
    erros.nome_responsavel = 'O nome deve ter no mínimo 3 caracteres.';
  }

  const telVal = validarTelefoneComDdd(dados.telefone_responsavel || '');
  if (!telVal.valido && telVal.erro) {
    erros.telefone_responsavel = telVal.erro;
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
