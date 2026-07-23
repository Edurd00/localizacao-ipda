import { Igreja } from './db';

/**
 * Parses a single row from a sheet (converted to JSON) and maps it to the Igreja structure.
 */
export function parseSpreadsheetRow(row: Record<string, unknown>): Igreja | null {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(row)) {
    normalized[key.trim().toLowerCase()] = row[key];
  }

  // Get field values with fallback casing
  const codigoVal = normalized['codigo'] || normalized['codigo_totvs'] || normalized['código'];
  if (codigoVal === undefined || codigoVal === null || codigoVal === '') {
    return null; // A church must have a unique identifier code
  }
  const codigo_totvs = String(codigoVal).trim();

  const desc_igreja = String(
    normalized['desc igreja'] || normalized['desc_igreja'] || normalized['descrição igreja'] || normalized['descricao'] || ''
  ).trim();

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

  // Parse Lat e Long column
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
      // In case it's space-separated or similar
      const parts = strVal.split(/\s+/);
      if (parts.length >= 2) {
        const latParsed = parseFloat(parts[0].trim());
        const lngParsed = parseFloat(parts[1].trim());
        if (!isNaN(latParsed)) latitude = latParsed;
        if (!isNaN(lngParsed)) longitude = lngParsed;
      }
    }
  }

  // Fallbacks to separate latitude/longitude columns if present or if Lat e Long parsing failed
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
