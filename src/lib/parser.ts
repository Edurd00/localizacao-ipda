import * as XLSX from 'xlsx';
import { Igreja } from './db';

/**
 * Normalizes code TOTVS values to string, stripping trailing `.0` or leading spaces
 */
export function normalizeTotvsCode(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
}

/**
 * Strict size classification based on explicit porte value or church description text
 */
export function getPorte(porteVal?: string, descVal?: string): string {
  const pNorm = (porteVal || '').toUpperCase().trim();
  // 1st priority: explicit porte column value
  if (['ESTADUAL', 'SETORIAL', 'CENTRAL', 'REGIONAL', 'LOCAL', 'CASA DE ORAÇÃO', 'ALDEIA INDIGENA'].includes(pNorm)) {
    return pNorm;
  }

  const descNorm = (descVal || '').toUpperCase().trim();

  // 2nd priority: infer by NAME PREFIX (startsWith) — most precise signal
  if (descNorm.startsWith('ESTADUAL')) return 'ESTADUAL';
  if (descNorm.startsWith('SETORIAL') || descNorm.startsWith('SECTORIAL')) return 'SETORIAL';
  if (descNorm.startsWith('CENTRAL')) return 'CENTRAL';
  if (descNorm.startsWith('REGIONAL')) return 'REGIONAL';
  if (descNorm.startsWith('ALDEIA INDIGENA') || descNorm.startsWith('ALDEIA INDÍGENA') || descNorm.startsWith('ALDEIA')) return 'ALDEIA INDIGENA';
  if (descNorm.startsWith('CASA DE ORAÇÃO') || descNorm.startsWith('CASA DE ORACAO')) return 'CASA DE ORAÇÃO';

  // 3rd priority: loose includes fallback (porte column had partial text)
  if (pNorm.includes('ESTADUAL')) return 'ESTADUAL';
  if (pNorm.includes('SETORIAL') || pNorm.includes('SECTORIAL')) return 'SETORIAL';
  if (pNorm.includes('CENTRAL')) return 'CENTRAL';
  if (pNorm.includes('REGIONAL')) return 'REGIONAL';
  if (pNorm.includes('CASA DE ORAÇÃO') || pNorm.includes('ORACAO')) return 'CASA DE ORAÇÃO';
  if (pNorm.includes('ALDEIA') || pNorm.includes('INDIGENA') || pNorm.includes('INDÍGENA')) return 'ALDEIA INDIGENA';

  return 'LOCAL';
}

/**
 * Parses a single row from a sheet (converted to JSON) and maps it to the Igreja structure.
 */
export function parseSpreadsheetRow(row: Record<string, unknown>): Igreja | null {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase()] = row[key];
  }

  const codigoVal = normalized['codigo'] || normalized['codigo_totvs'] || normalized['código'];
  if (codigoVal === undefined || codigoVal === null || codigoVal === '') {
    return null;
  }
  const codigo_totvs = normalizeTotvsCode(codigoVal);

  const rawNome = String(
    normalized['nome'] || normalized['desc igreja'] || normalized['desc_igreja'] || normalized['descrição igreja'] || normalized['descricao'] || ''
  ).trim();
  const rawPorte = String(normalized['porte'] || normalized['desc igreja'] || normalized['desc_igreja'] || '').trim();
  const porte = getPorte(rawPorte, rawNome);

  let desc_igreja = rawNome || rawPorte;
  if (porte !== 'LOCAL' && !desc_igreja.toUpperCase().startsWith(porte)) {
    desc_igreja = `${porte} - ${desc_igreja}`;
  }

  const tipo_imovel = String(
    normalized['tipo imovel'] || normalized['tipo_imovel'] || normalized['tipo_imóvel'] || ''
  ).trim();

  const endereco = String(
    normalized['endereco'] || normalized['endereço'] || ''
  ).trim();

  const bairro = String(normalized['bairro'] || '').trim();
  const municipio = String(normalized['municipio'] || normalized['município'] || '').trim();
  const estado = String(normalized['estado'] || '').trim();
  const cep = String(normalized['cep'] || '').trim();

  const link_google_maps = String(
    normalized['endereco www'] || normalized['endereço www'] || normalized['link_google_maps'] || normalized['link'] || ''
  ).trim();

  let latitude: number | null = null;
  let longitude: number | null = null;

  const latLongVal = normalized['lat e long'] || normalized['lat_long'] || normalized['lat e lng'] || normalized['lat_lng'];

  if (latLongVal !== undefined && latLongVal !== null && latLongVal !== '') {
    const strVal = String(latLongVal).trim();
    if (strVal.includes(',')) {
      const parts = strVal.split(',');
      if (parts.length >= 2) {
        const latParsed = parseFloat(parts[0].replace(',', '.').trim());
        const lngParsed = parseFloat(parts[1].replace(',', '.').trim());
        if (!isNaN(latParsed)) latitude = latParsed;
        if (!isNaN(lngParsed)) longitude = lngParsed;
      }
    } else {
      const parts = strVal.split(/\s+/);
      if (parts.length >= 2) {
        const latParsed = parseFloat(parts[0].trim());
        const lngParsed = parseFloat(parts[1].trim());
        if (!isNaN(latParsed)) latitude = latParsed;
        if (!isNaN(lngParsed)) longitude = lngParsed;
      }
    }
  }

  if (latitude === null) {
    const latVal = normalized['latitude'] || normalized['lat'];
    if (latVal !== undefined && latVal !== null && latVal !== '') {
      const parsed = parseFloat(String(latVal).replace(',', '.').trim());
      if (!isNaN(parsed)) latitude = parsed;
    }
  }

  if (longitude === null) {
    const lngVal = normalized['longitude'] || normalized['long'] || normalized['lng'];
    if (lngVal !== undefined && lngVal !== null && lngVal !== '') {
      const parsed = parseFloat(String(lngVal).replace(',', '.').trim());
      if (!isNaN(parsed)) longitude = parsed;
    }
  }

  if (latitude === 0) latitude = null;
  if (longitude === 0) longitude = null;

  return {
    codigo_totvs,
    desc_igreja,
    tipo_imovel,
    endereco,
    bairro,
    municipio,
    estado,
    cep,
    link_google_maps,
    latitude,
    longitude,
    status: 'PENDENTE',
  };
}

/**
 * Parses all non-empty sheets of an Excel workbook sequential-wise with floating headers,
 * maintaining stateful vertical parent-child hierarchy across rows.
 */
export function parseWorkbook(workbook: XLSX.WorkBook): Igreja[] {
  const parsedChurches: Igreja[] = [];

  // Iterate over ALL sheet names present in workbook
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to 2D array of rows
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (!rows || rows.length === 0) continue;

    let headerIdx = -1;
    const colMap: Record<string, number> = {};

    // 1. Search for the floating header row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const normalizedRow = row.map((val) => String(val || '').trim().toLowerCase());

      const hasCodigo = normalizedRow.some((col) =>
        ['codigo', 'código', 'codigo_totvs', 'codigo totvs', 'totvs', 'cod', 'cód'].includes(col)
      );
      const hasNomeOrDesc = normalizedRow.some((col) =>
        col.includes('nome') || col.includes('desc') || col.includes('igreja') || col.includes('endereco') || col.includes('endereço')
      );

      if (hasCodigo && hasNomeOrDesc) {
        headerIdx = i;
        normalizedRow.forEach((colName, colIdx) => {
          if (['codigo', 'código', 'codigo_totvs', 'codigo totvs', 'totvs', 'cod', 'cód'].includes(colName)) {
            colMap['codigo'] = colIdx;
          }
          if (['desc igreja', 'desc_igreja', 'desc igrejas', 'desc_igrejas', 'descrição igreja', 'descricao igreja', 'porte'].includes(colName)) {
            colMap['porte'] = colIdx;
          }
          if (['nome', 'nome da igreja', 'igreja', 'descricao', 'descrição'].includes(colName)) {
            colMap['nome'] = colIdx;
          }
          if (['endereco', 'endereço', 'logradouro', 'rua', 'end'].some((alias) => colName === alias || colName.includes('endereco') || colName.includes('endereço'))) {
            if (colMap['endereco'] === undefined) colMap['endereco'] = colIdx;
          }
          if (colName.includes('bairro')) colMap['bairro'] = colIdx;
          if (colName.includes('municipio') || colName.includes('município') || colName.includes('cidade')) colMap['municipio'] = colIdx;
          if (colName === 'estado' || colName === 'uf') colMap['estado'] = colIdx;
          if (colName.includes('cep')) colMap['cep'] = colIdx;
          if (colName.includes('tipo')) colMap['tipo_imovel'] = colIdx;
          if (colName.includes('link') || colName.includes('www') || colName.includes('maps') || colName.includes('url')) colMap['link_google_maps'] = colIdx;
          if (colName.includes('lat') && colName.includes('long')) colMap['lat_long'] = colIdx;
          else if (colName.includes('lat') || colName === 'latitude') colMap['latitude'] = colIdx;
          else if (colName.includes('long') || colName.includes('lng') || colName === 'longitude') colMap['longitude'] = colIdx;
        });
        break;
      }
    }

    if (headerIdx === -1) {
      continue; // Skip sheet if no header row found
    }

    // Stateful vertical hierarchy trackers per sheet block
    let activeEstadual: Igreja | null = null;
    let activeSetorial: Igreja | null = null;
    let activeCentral: Igreja | null = null;
    let activeRegional: Igreja | null = null;

    // 2. Iterate starting below header row
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];

      const isEmptyLine =
        !Array.isArray(row) ||
        row.length === 0 ||
        row.every((val) => val === null || val === undefined || String(val).trim() === '');

      // IMPORTANT: Empty lines do NOT reset activeEstadual / activeSetorial trackers!
      if (isEmptyLine) {
        continue;
      }

      const getVal = (key: string): string => {
        const idx = colMap[key];
        return idx !== undefined && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      };

      const rawCodigo = getVal('codigo');
      const codigo_totvs = normalizeTotvsCode(rawCodigo);

      // Skip title rows, legends, headers residuals, or non-numeric invalid codes
      const cStr = String(codigo_totvs || '').toLowerCase();
      if (!codigo_totvs || isNaN(Number(codigo_totvs)) || cStr.includes('totvs') || cStr.includes('legend')) {
        continue;
      }

      const rawNome = getVal('nome');
      const rawPorte = getVal('porte');
      const porte = getPorte(rawPorte, rawNome);

      let desc_igreja = rawNome || rawPorte;
      if (porte !== 'LOCAL' && !desc_igreja.toUpperCase().startsWith(porte)) {
        desc_igreja = `${porte} - ${desc_igreja}`;
      }

      const tipo_imovel = getVal('tipo_imovel');
      const endereco = getVal('endereco');
      const bairro = getVal('bairro');
      const municipio = getVal('municipio');
      const estado = getVal('estado');
      const cep = getVal('cep');
      const link_google_maps = getVal('link_google_maps');

      let latitude: number | null = null;
      let longitude: number | null = null;

      const latLongVal = getVal('lat_long');
      if (latLongVal) {
        if (latLongVal.includes(',')) {
          const parts = latLongVal.split(',');
          if (parts.length >= 2) {
            const latParsed = parseFloat(parts[0].replace(',', '.').trim());
            const lngParsed = parseFloat(parts[1].replace(',', '.').trim());
            if (!isNaN(latParsed)) latitude = latParsed;
            if (!isNaN(lngParsed)) longitude = lngParsed;
          }
        } else {
          const parts = latLongVal.split(/\s+/);
          if (parts.length >= 2) {
            const latParsed = parseFloat(parts[0].trim());
            const lngParsed = parseFloat(parts[1].trim());
            if (!isNaN(latParsed)) latitude = latParsed;
            if (!isNaN(lngParsed)) longitude = lngParsed;
          }
        }
      }

      if (latitude === null && colMap['latitude'] !== undefined) {
        const latVal = getVal('latitude');
        if (latVal) {
          const parsed = parseFloat(latVal.replace(',', '.'));
          if (!isNaN(parsed)) latitude = parsed;
        }
      }
      if (longitude === null && colMap['longitude'] !== undefined) {
        const lngVal = getVal('longitude');
        if (lngVal) {
          const parsed = parseFloat(lngVal.replace(',', '.'));
          if (!isNaN(parsed)) longitude = parsed;
        }
      }

      const parsed: Igreja = {
        codigo_totvs,
        desc_igreja,
        tipo_imovel,
        endereco,
        bairro,
        municipio,
        estado,
        cep,
        link_google_maps,
        latitude: latitude === 0 ? null : latitude,
        longitude: longitude === 0 ? null : longitude,
        status: 'PENDENTE',
        porte,
      };

      // Hierarchical vertical tree calculation rules:
      if (porte === 'ESTADUAL') {
        parsed.codigo_totvs_pai = null;
        activeEstadual = parsed;
        activeSetorial = null;
        activeCentral = null;
        activeRegional = null;
      } else if (porte === 'SETORIAL') {
        parsed.codigo_totvs_pai = activeEstadual ? activeEstadual.codigo_totvs : null;
        activeSetorial = parsed;
        activeCentral = null;
        activeRegional = null;
      } else if (porte === 'CENTRAL') {
        parsed.codigo_totvs_pai = activeSetorial
          ? activeSetorial.codigo_totvs
          : (activeEstadual ? activeEstadual.codigo_totvs : null);
        activeCentral = parsed;
        activeRegional = null;
      } else if (porte === 'REGIONAL') {
        parsed.codigo_totvs_pai = activeCentral
          ? activeCentral.codigo_totvs
          : (activeSetorial
              ? activeSetorial.codigo_totvs
              : (activeEstadual ? activeEstadual.codigo_totvs : null));
        activeRegional = parsed;
      } else {
        // LOCAL, CASA DE ORAÇÃO, ALDEIA INDÍGENA, etc.
        parsed.codigo_totvs_pai = activeRegional
          ? activeRegional.codigo_totvs
          : (activeCentral
              ? activeCentral.codigo_totvs
              : (activeSetorial
                  ? activeSetorial.codigo_totvs
                  : (activeEstadual ? activeEstadual.codigo_totvs : null)));
      }

      parsedChurches.push(parsed);
    }
  }

  return parsedChurches;
}
