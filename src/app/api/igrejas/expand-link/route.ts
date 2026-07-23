import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Coordinate extraction helpers
// ---------------------------------------------------------------------------

/**
 * All known Google Maps URL patterns that carry explicit lat/lng.
 *
 * Priority order matters – try the most specific patterns first.
 *  @-23.5329,-46.6395,17z           (place / street view)
 *  q=-23.5329,-46.6395              (search by coords)
 *  ll=-23.5329,-46.6395             (older format)
 *  center=-23.5329,-46.6395         (embed)
 *  destination=-23.5329,-46.6395    (directions)
 *  !3d<lat>!4d<lng>                 (encoded in /data= segment)
 */
const COORD_PATTERNS: RegExp[] = [
  /@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]ll=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]center=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /destination=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /!3d(-?\d{1,3}\.\d{4,})!4d(-?\d{1,3}\.\d{4,})/,
];

function extractCoordsFromText(text: string): { lat: number; lng: number } | null {
  for (const pattern of COORD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
        return { lat, lng };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

/** Pick out the first http/https URL found anywhere in a block of text. */
function firstUrlIn(text: string): string | null {
  // Strip markdown-style trailing punctuation that WhatsApp sometimes wraps
  const m = text.match(/https?:\/\/[^\s"'<>)\]]+/i);
  return m ? m[0].replace(/[.,!?]+$/, '') : null;
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ---------------------------------------------------------------------------
// Manual redirect follower
// ---------------------------------------------------------------------------

/**
 * Follows up to `maxHops` HTTP redirects manually so we can inspect every
 * intermediate Location header.  This is necessary because Google's link
 * shortener sometimes issues a 302 whose Location header contains the full
 * maps URL (with coordinates), but the Fetch API's `redirect: 'follow'` hides
 * all intermediate URLs and only exposes the final response.url – which may be
 * a 200 HTML page without coordinates in its own URL.
 */
async function expandUrlManually(
  startUrl: string,
  maxHops = 8,
  timeoutMs = 8000
): Promise<{ finalUrl: string; visitedUrls: string[] }> {
  const visited: string[] = [];
  let current = startUrl;

  for (let hop = 0; hop < maxHops; hop++) {
    visited.push(current);

    let response: Response;
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',           // <── key: do NOT auto-follow
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': BROWSER_UA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
    } catch {
      // Network or timeout – return what we have so far
      break;
    }

    const status = response.status;

    // 3xx redirect – follow Location header
    if (status >= 300 && status < 400) {
      const location = response.headers.get('location');
      if (!location) break;

      // Resolve relative URLs (rare but possible)
      try {
        current = new URL(location, current).href;
      } catch {
        current = location;
      }
      continue; // next hop
    }

    // 200 (or other non-redirect) – we've reached the final page
    // response.url reflects the actual URL of this response
    current = response.url || current;

    // Try to get coordinates from the body HTML as last resort
    // (e.g., meta-refresh or og:url or initData JSON)
    if (status === 200) {
      try {
        const html = await response.text();
        // Store as a synthetic "url" for the caller to scan
        visited.push('__HTML__' + html.slice(0, 8000));
      } catch {
        /* ignore */
      }
    }

    break;
  }

  return { finalUrl: current, visitedUrls: visited };
}

// ---------------------------------------------------------------------------
// HTML coordinate mining
// ---------------------------------------------------------------------------

/**
 * Tries to extract coordinates from HTML page content using several heuristics:
 *  - og:url / canonical meta tags
 *  - meta refresh URL
 *  - JSON-LD / initData blobs embedded in script tags
 *  - Bare coordinate patterns anywhere in the first 20 KB
 */
function extractCoordsFromHtml(html: string): { lat: number; lng: number } | null {
  const snippet = html.slice(0, 20000);

  // 1. og:url or canonical
  const metaUrlPatterns = [
    /property=["']og:url["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:url["']/i,
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
  ];
  for (const p of metaUrlPatterns) {
    const m = snippet.match(p);
    if (m) {
      const coords = extractCoordsFromText(m[1]);
      if (coords) return coords;
    }
  }

  // 2. meta refresh
  const refreshMatch = snippet.match(
    /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^;]*;\s*url=([^"']+)["']/i
  );
  if (refreshMatch) {
    const coords = extractCoordsFromText(refreshMatch[1]);
    if (coords) return coords;
  }

  // 3. window.location / location.replace patterns in JS
  const jsRedirects = snippet.matchAll(/location(?:\.replace)?\s*\(?["']([^"']{20,})["']/g);
  for (const m of jsRedirects) {
    const coords = extractCoordsFromText(m[1]);
    if (coords) return coords;
  }

  // 4. Raw coordinate pattern anywhere in the snippet (covers initData JSON)
  const coords = extractCoordsFromText(snippet);
  if (coords) return coords;

  return null;
}

// ---------------------------------------------------------------------------
// Main route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput: string = (body?.url ?? '').trim();

    if (!rawInput || rawInput.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Nenhum link informado.' },
        { status: 400 }
      );
    }

    // ── Step 1: try to find a URL inside the pasted text ──────────────────
    const candidate = firstUrlIn(rawInput) ?? rawInput;

    // ── Step 2: direct extraction (long Maps URLs already have coords) ─────
    const direct = extractCoordsFromText(candidate);
    if (direct) {
      return NextResponse.json({ success: true, ...direct, expanded_url: candidate });
    }

    // ── Step 3: expand the URL manually, hop by hop ────────────────────────
    let { finalUrl, visitedUrls } = await expandUrlManually(candidate);

    // Check every URL we visited (including intermediate redirects)
    for (const url of visitedUrls) {
      if (url.startsWith('__HTML__')) {
        // This is the body HTML we captured from the final 200 response
        const html = url.slice('__HTML__'.length);
        const coords = extractCoordsFromHtml(html);
        if (coords) {
          return NextResponse.json({
            success: true,
            ...coords,
            expanded_url: finalUrl,
          });
        }
      } else {
        const coords = extractCoordsFromText(url);
        if (coords) {
          return NextResponse.json({
            success: true,
            ...coords,
            expanded_url: finalUrl,
          });
        }
      }
    }

    // ── Step 4: final-URL extraction ───────────────────────────────────────
    const finalCoords = extractCoordsFromText(finalUrl);
    if (finalCoords) {
      return NextResponse.json({ success: true, ...finalCoords, expanded_url: finalUrl });
    }

    // ── Step 5: nothing worked ─────────────────────────────────────────────
    console.warn('[expand-link] Could not extract coordinates from:', candidate, '→', finalUrl);
    return NextResponse.json(
      {
        success: false,
        error:
          'Não foi possível extrair as coordenadas do link. Peça ao dirigente para ' +
          'enviar o link longo do Google Maps (pressionar "Compartilhar" → "Copiar link") ' +
          'ou as coordenadas manualmente.',
      },
      { status: 422 }
    );
  } catch (err) {
    console.error('[expand-link] Unhandled error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar o link.' },
      { status: 500 }
    );
  }
}
