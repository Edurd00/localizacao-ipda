import { NextResponse } from 'next/server';
import { saveIgrejasBulk, Igreja } from '@/lib/db';

import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    // Determine the content-type.
    // If it's application/json, we fall back to standard JSON parsing.
    // If it's multipart/form-data or binary or json with base64 data, we process it as a spreadsheet.
    const contentType = request.headers.get('content-type') || '';
    let parsedChurches: Igreja[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Check if it's base64 spreadsheet import
      if (body.fileData && typeof body.fileData === 'string') {
        const fileBuffer = Buffer.from(body.fileData, 'base64');
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        parsedChurches = parseMultiSheetWorkbook(workbook);
      } else if (Array.isArray(body.igrejas)) {
        parsedChurches = body.igrejas;
      } else {
        return NextResponse.json(
          { success: false, error: 'Expected an array of churches in "igrejas" or base64 fileData.' },
          { status: 400 }
        );
      }
    } else {
      // Standard multipart form data parse
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      parsedChurches = parseMultiSheetWorkbook(workbook);
    }

    if (parsedChurches.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Nenhuma igreja válida foi encontrada ou processada na planilha.',
      });
    }

    await saveIgrejasBulk(parsedChurches);

    return NextResponse.json({
      success: true,
      count: parsedChurches.length,
      message: `${parsedChurches.length} igrejas importadas/atualizadas com sucesso com cálculo hierárquico de coligações.`,
    });
  } catch (err: unknown) {
    console.error('API Error in POST /api/igrejas/upload:', err);
    const errMsg = err instanceof Error ? err.message : 'Error importing churches';
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

/**
 * Parses all sheets of an Excel workbook sequential-wise with floating headers
 * and blank block resets to calculate parent-child relationships.
 */
function parseMultiSheetWorkbook(workbook: XLSX.WorkBook): Igreja[] {
  const parsedChurches: Igreja[] = [];
  const targetSheets = [
    'Centro Oeste',
    'Nordeste',
    'Norte',
    'Sudeste - MG',
    'Sudeste - SP',
    'Sudeste - ES - RJ',
    'Sul',
  ];

  // Resolve sheets to parse: prioritize specified ones, otherwise parse all sheets in workbook
  const sheetsToParse = targetSheets.filter((name) => workbook.SheetNames.includes(name));
  const finalSheets = sheetsToParse.length > 0 ? sheetsToParse : workbook.SheetNames;

  for (const sheetName of finalSheets) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to 2D array of rows to accurately find floating headers and empty rows
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    let headerIdx = -1;
    let colMap: Record<string, number> = {};

    // 1. Search for the floating header row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      // Normalize row values to check for columns
      const normalizedRow = row.map((val) => String(val || '').trim().toLowerCase());

      const hasCodigo = normalizedRow.includes('codigo') || normalizedRow.includes('código') || normalizedRow.includes('codigo_totvs');
      const hasDescIgreja = normalizedRow.includes('desc igreja') || normalizedRow.includes('desc_igreja') || normalizedRow.includes('descricao') || normalizedRow.includes('descrição');
      const hasEndereco = normalizedRow.includes('endereco') || normalizedRow.includes('endereço');

      if (hasCodigo && (hasDescIgreja || hasEndereco)) {
        headerIdx = i;
        // Build index mapping for known headers
        normalizedRow.forEach((colName, colIdx) => {
          if (colName === 'codigo' || colName === 'código' || colName === 'codigo_totvs') colMap['codigo'] = colIdx;
          if (colName === 'nome' || colName === 'desc igreja' || colName === 'desc_igreja' || colName === 'descricao' || colName === 'descrição') colMap['desc_igreja'] = colIdx;
          if (colName === 'endereco' || colName === 'endereço') colMap['endereco'] = colIdx;
          if (colName === 'bairro') colMap['bairro'] = colIdx;
          if (colName === 'municipio' || colName === 'município') colMap['municipio'] = colIdx;
          if (colName === 'estado') colMap['estado'] = colIdx;
          if (colName === 'cep') colMap['cep'] = colIdx;
          if (colName === 'tipo imovel' || colName === 'tipo_imovel' || colName === 'tipo_imóvel') colMap['tipo_imovel'] = colIdx;
          if (colName === 'endereco www' || colName === 'endereço www' || colName === 'link_google_maps' || colName === 'link') colMap['link_google_maps'] = colIdx;
          if (colName === 'lat e long' || colName === 'lat_long' || colName === 'lat_lng' || colName === 'latitude' || colName === 'longitude') colMap['lat_long'] = colIdx;
        });
        break;
      }
    }

    if (headerIdx === -1) {
      console.warn(`Could not identify floating header row in sheet: ${sheetName}. Trying first row.`);
      headerIdx = 0;
      colMap = { codigo: 0, desc_igreja: 1, endereco: 2, bairro: 3, municipio: 4, estado: 5, cep: 6 };
    }

    // Stateful hierarchy trackers per block family
    let currentEstadual: any = null;
    let currentSetorial: any = null;
    let currentCentral: any = null;
    let currentRegional: any = null;

    // 2. Iterate starting below the floating header row
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];

      // A line is completely empty if row is not an array, has length 0, or all elements are empty strings/nulls
      const isEmptyLine = !Array.isArray(row) || row.length === 0 || row.every((val) => val === null || val === undefined || String(val).trim() === '');

      if (isEmptyLine) {
        // Zere and reset the family trackers for the next family block
        currentEstadual = null;
        currentSetorial = null;
        currentCentral = null;
        currentRegional = null;
        continue;
      }

      // Extract cells according to column map indexes
      const getVal = (key: string): string => {
        const idx = colMap[key];
        return idx !== undefined && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
      };

      const codigoVal = getVal('codigo');
      if (!codigoVal || isNaN(Number(codigoVal)) || codigoVal.toLowerCase().includes('totvs') || codigoVal.toLowerCase().includes('legend')) {
        continue; // Skip title, header residuals, text legend rows, or invalid codes
      }

      const codigo_totvs = codigoVal;
      const desc_igreja = getVal('desc_igreja');
      const tipo_imovel = getVal('tipo_imovel');
      const endereco = getVal('endereco');
      const bairro = getVal('bairro');
      const municipio = getVal('municipio');
      const estado = getVal('estado');
      const cep = getVal('cep');
      const link_google_maps = getVal('link_google_maps');

      let latitude: number | null = null;
      let longitude: number | null = null;

      // Extract coordinates from lat_long cell
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
      };

      const descNormalized = desc_igreja.toUpperCase();

      // Apply stateful vertical hierarchy tree calculation
      if (descNormalized.includes('ESTADUAL')) {
        currentEstadual = parsed;
        currentSetorial = null;
        currentCentral = null;
        currentRegional = null;
        parsed.codigo_totvs_pai = null;
      } else if (descNormalized.includes('SETORIAL')) {
        currentSetorial = parsed;
        currentCentral = null;
        currentRegional = null;
        parsed.codigo_totvs_pai = currentEstadual ? currentEstadual.codigo_totvs : null;
      } else if (descNormalized.includes('CENTRAL')) {
        currentCentral = parsed;
        currentRegional = null;
        parsed.codigo_totvs_pai = currentSetorial
          ? currentSetorial.codigo_totvs
          : (currentEstadual ? currentEstadual.codigo_totvs : null);
      } else if (descNormalized.includes('REGIONAL')) {
        currentRegional = parsed;
        parsed.codigo_totvs_pai = currentCentral
          ? currentCentral.codigo_totvs
          : (currentSetorial
              ? currentSetorial.codigo_totvs
              : (currentEstadual ? currentEstadual.codigo_totvs : null));
      } else {
        // LOCAL, CASA DE ORAÇÃO, ALDEIA INDIGENA
        parsed.codigo_totvs_pai = currentRegional
          ? currentRegional.codigo_totvs
          : (currentCentral
              ? currentCentral.codigo_totvs
              : (currentSetorial
                  ? currentSetorial.codigo_totvs
                  : (currentEstadual ? currentEstadual.codigo_totvs : null)));
      }

      parsedChurches.push(parsed);
    }
  }

  return parsedChurches;
}
