/**
 * Geocoding utilities and Rigid Geographic State Validation (UF) for Localização IPDA
 */

export interface StateInfo {
  code: string;
  name: string;
  bounds: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
}

export const STATE_MAP: Record<string, StateInfo> = {
  AC: { code: 'AC', name: 'Acre', bounds: [-11.14, -7.11, -73.99, -66.62] },
  AL: { code: 'AL', name: 'Alagoas', bounds: [-10.50, -8.81, -38.24, -35.15] },
  AP: { code: 'AP', name: 'Amapá', bounds: [-1.24, 4.48, -54.87, -49.88] },
  AM: { code: 'AM', name: 'Amazonas', bounds: [-9.82, 2.25, -73.80, -56.10] },
  BA: { code: 'BA', name: 'Bahia', bounds: [-18.35, -8.53, -46.62, -37.34] },
  CE: { code: 'CE', name: 'Ceará', bounds: [-7.85, -2.78, -41.42, -37.25] },
  DF: { code: 'DF', name: 'Distrito Federal', bounds: [-16.05, -15.50, -48.28, -47.30] },
  ES: { code: 'ES', name: 'Espírito Santo', bounds: [-21.30, -17.89, -41.88, -39.67] },
  GO: { code: 'GO', name: 'Goiás', bounds: [-19.50, -12.39, -53.25, -45.91] },
  MA: { code: 'MA', name: 'Maranhão', bounds: [-10.26, -1.05, -48.75, -41.79] },
  MT: { code: 'MT', name: 'Mato Grosso', bounds: [-18.04, -7.35, -61.63, -50.22] },
  MS: { code: 'MS', name: 'Mato Grosso do Sul', bounds: [-24.07, -17.17, -58.17, -50.92] },
  MG: { code: 'MG', name: 'Minas Gerais', bounds: [-22.92, -14.23, -51.05, -39.85] },
  PA: { code: 'PA', name: 'Pará', bounds: [-9.84, 2.53, -58.90, -46.06] },
  PB: { code: 'PB', name: 'Paraíba', bounds: [-8.30, -6.02, -38.77, -34.79] },
  PR: { code: 'PR', name: 'Paraná', bounds: [-26.72, -22.52, -54.62, -48.04] },
  PE: { code: 'PE', name: 'Pernambuco', bounds: [-9.48, -7.38, -41.35, -34.80] },
  PI: { code: 'PI', name: 'Piauí', bounds: [-10.93, -2.75, -45.99, -40.37] },
  RJ: { code: 'RJ', name: 'Rio de Janeiro', bounds: [-23.38, -20.76, -44.89, -40.96] },
  RN: { code: 'RN', name: 'Rio Grande do Norte', bounds: [-6.98, -4.83, -38.58, -34.97] },
  RS: { code: 'RS', name: 'Rio Grande do Sul', bounds: [-33.75, -27.08, -57.65, -49.69] },
  RO: { code: 'RO', name: 'Rondônia', bounds: [-13.69, -7.97, -66.62, -59.77] },
  RR: { code: 'RR', name: 'Roraima', bounds: [-1.58, 5.27, -64.81, -59.87] },
  SC: { code: 'SC', name: 'Santa Catarina', bounds: [-29.35, -25.96, -53.84, -48.35] },
  SP: { code: 'SP', name: 'São Paulo', bounds: [-25.31, -19.78, -53.11, -44.16] },
  SE: { code: 'SE', name: 'Sergipe', bounds: [-11.57, -9.51, -38.25, -36.39] },
  TO: { code: 'TO', name: 'Tocantins', bounds: [-13.47, -5.17, -50.74, -45.70] },
};

/**
 * Normalizes input state string (e.g. "BA", "Bahia", "BR-BA", "ba") to 2-letter UF code (e.g. "BA").
 */
export function normalizeUF(stateStr?: string | null): string | null {
  if (!stateStr) return null;
  const clean = stateStr.trim().toUpperCase().replace(/^BR-/, '');
  if (STATE_MAP[clean]) return clean;

  // Search by state full name
  const match = Object.values(STATE_MAP).find(
    (st) => st.name.toUpperCase() === clean || st.name.toLowerCase() === stateStr.trim().toLowerCase()
  );

  return match ? match.code : clean.length === 2 ? clean : null;
}

/**
 * Validates if coordinates and API address result strictly match target state UF.
 */
export function isResultInState(
  lat: number,
  lng: number,
  targetStateUF: string | null,
  returnedStateStr?: string | null
): boolean {
  const normalizedTarget = normalizeUF(targetStateUF);
  if (!normalizedTarget) return true; // If no target state specified, accept coordinate within Brazil

  const stateInfo = STATE_MAP[normalizedTarget];

  // 1. Rigid Coordinate Bounding Box Check (with 0.3 degree margin for border towns)
  if (stateInfo) {
    const [minLat, maxLat, minLng, maxLng] = stateInfo.bounds;
    const margin = 0.3; // ~30km tolerance for border areas
    if (
      lat < minLat - margin ||
      lat > maxLat + margin ||
      lng < minLng - margin ||
      lng > maxLng + margin
    ) {
      console.warn(
        `[Geocoding Lock Rejected] Point (${lat}, ${lng}) is outside bounding box for UF ${normalizedTarget}`
      );
      return false;
    }
  }

  // 2. State Name / Code Match Check (if API returned explicit state field)
  if (returnedStateStr) {
    const returnedUF = normalizeUF(returnedStateStr);
    if (returnedUF && returnedUF !== normalizedTarget) {
      console.warn(
        `[Geocoding Lock Rejected] API returned state "${returnedStateStr}" (${returnedUF}) which does not match target UF "${normalizedTarget}"`
      );
      return false;
    }
  }

  return true;
}
