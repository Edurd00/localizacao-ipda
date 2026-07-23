import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers: coordinate extraction from URL strings
// ---------------------------------------------------------------------------

const URL_COORD_PATTERNS: RegExp[] = [
  /@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]ll=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /[?&]center=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /destination=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  /!3d(-?\d{1,3}\.\d{4,})!4d(-?\d{1,3}\.\d{4,})/,
];

function coordsFromUrl(url: string): [number, number] | null {
  for (const p of URL_COORD_PATTERNS) {
    const m = url.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001) return [lat, lng];
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers: coordinate extraction from HTML body
// ---------------------------------------------------------------------------

/**
 * Tries every pattern we know that Google Maps embeds coordinates in HTML.
 * The order matters – most precise / reliable patterns first.
 */
function coordsFromHtml(html: string): [number, number] | null {
  // Work on a slice to keep regex fast on huge pages
  const body = html.slice(0, 60_000);

  const htmlPatterns: RegExp[] = [
    // 1. og:image staticmap URL with percent-encoded comma
    /staticmap[^"']*center=(-?\d{1,3}\.\d{4,})%2C(-?\d{1,3}\.\d{4,})/i,
    // 2. og:image staticmap with literal comma
    /staticmap[^"']*center=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/i,
    // 3. og:url or canonical with embedded coordinates
    /(?:og:url|canonical)[^>]*content="[^"]*@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/i,
    /content="[^"]*@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})[^"]*"[^>]*property="og:url"/i,
    // 4. JSON "lat":..., "lng":...  (APP_INITIALIZATION_STATE or similar)
    /"lat"\s*:\s*(-?\d{1,3}\.\d{4,})\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d{4,})/,
    // 5. JSON [lat,lng] arrays inside initData blobs
    /\[\s*(-?\d{1,3}\.\d{6,})\s*,\s*(-?\d{1,3}\.\d{6,})\s*,\s*\d/,
    // 6. !1d<lat>!2d<lng> (proto-encoded URL segment)
    /!1d(-?\d{1,3}\.\d{4,})!2d(-?\d{1,3}\.\d{4,})/,
    // 7. "center":{"lat":...,"lng":...} in embedded JSON
    /"center"\s*:\s*\{\s*"lat"\s*:\s*(-?\d{1,3}\.\d{4,})\s*,\s*"lng"\s*:\s*(-?\d{1,3}\.\d{4,})/,
    // 8. ?q=lat,lng inside any string in the HTML
    /[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // 9. @lat,lng anywhere in the HTML
    /@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  ];

  for (const p of htmlPatterns) {
    const m = body.match(p);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      // Sanity-check: Brazil bounding box (-34 to 5 lat, -74 to -34 lng)
      if (!isNaN(lat) && !isNaN(lng) && lat >= -35 && lat <= 6 && lng >= -75 && lng <= -34) {
        return [lat, lng];
      }
      // Accept coordinates outside Brazil too (international use is possible)
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001) {
        return [lat, lng];
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Manual redirect follower (catches Location header before fetch absorbs it)
// ---------------------------------------------------------------------------

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const FETCH_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  // Provide a cookie-consent cookie that some Google endpoints require
  Cookie: 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyNDA1MDktMF9SQzEaAmVuIAEaBgiA'; 
};

async function expandManually(
  startUrl: string,
  maxHops = 10
): Promise<{ hops: string[]; finalHtml: string | null }> {
  const hops: string[] = [startUrl];
  let current = startUrl;
  let finalHtml: string | null = null;

  for (let i = 0; i < maxHops; i++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(9000),
        headers: FETCH_HEADERS,
      });
    } catch {
      break;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      try { current = new URL(loc, current).href; } catch { current = loc; }
      hops.push(current);
      continue;
    }

    // Non-redirect response – grab the HTML body
    current = res.url || current;
    if (current && !hops.includes(current)) hops.push(current);
    try { finalHtml = await res.text(); } catch { /* ignore */ }
    break;
  }

  return { hops, finalHtml };
}

// ---------------------------------------------------------------------------
// Second pass: follow with redirect:'follow' to let the runtime handle it,
// then try HTML mining on the final page.
// ---------------------------------------------------------------------------

async function fetchFollowAndMine(url: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(9000),
      headers: FETCH_HEADERS,
    });

    // Check response.url (may differ from url if redirected)
    const finalUrl = res.url || url;
    const urlCoords = coordsFromUrl(finalUrl);
    if (urlCoords) return urlCoords;

    const html = await res.text();
    return coordsFromHtml(html);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main API route
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput: string = (body?.url ?? '').trim();

    if (!rawInput || rawInput.length < 5) {
      return NextResponse.json({ success: false, error: 'Nenhum link informado.' }, { status: 400 });
    }

    // Extract first URL from possibly a WhatsApp message blob
    const urlMatch = rawInput.match(/https?:\/\/[^\s"'<>)\]]+/i);
    const candidate = (urlMatch ? urlMatch[0] : rawInput).replace(/[.,!?]+$/, '');

    // ── Pass 1: try extracting directly from the pasted URL (long links) ──
    const direct = coordsFromUrl(candidate);
    if (direct) {
      return NextResponse.json({
        success: true, lat: direct[0], lng: direct[1],
        latitude: direct[0], longitude: direct[1],
        expanded_url: candidate,
      });
    }

    // ── Pass 2: manual hop-by-hop redirect following ───────────────────────
    console.info('[expand-link] Expanding (manual):', candidate);
    const { hops, finalHtml } = await expandManually(candidate);

    for (const hop of hops) {
      const c = coordsFromUrl(hop);
      if (c) {
        return NextResponse.json({
          success: true, lat: c[0], lng: c[1],
          latitude: c[0], longitude: c[1],
          expanded_url: hop,
        });
      }
    }

    if (finalHtml) {
      const c = coordsFromHtml(finalHtml);
      if (c) {
        return NextResponse.json({
          success: true, lat: c[0], lng: c[1],
          latitude: c[0], longitude: c[1],
          expanded_url: hops[hops.length - 1] ?? candidate,
        });
      }
    }

    // ── Pass 3: auto-follow redirect (different runtime path, may work when
    //            manual doesn't due to TLS/gzip differences) ─────────────────
    console.info('[expand-link] Pass 3 fetch+follow for:', candidate);
    const p3 = await fetchFollowAndMine(candidate);
    if (p3) {
      return NextResponse.json({
        success: true, lat: p3[0], lng: p3[1],
        latitude: p3[0], longitude: p3[1],
        expanded_url: candidate,
      });
    }

    // ── All passes failed ──────────────────────────────────────────────────
    console.warn('[expand-link] All passes failed for:', candidate, 'hops:', hops);
    return NextResponse.json(
      {
        success: false,
        error:
          'Não foi possível extrair as coordenadas do link. ' +
          'Peça ao dirigente para enviar o link longo do Google Maps ' +
          '(toque em "Compartilhar" → "Copiar link") ou as coordenadas diretamente.',
      },
      { status: 422 }
    );
  } catch (err) {
    console.error('[expand-link] Error:', err);
    return NextResponse.json({ success: false, error: 'Erro interno ao processar o link.' }, { status: 500 });
  }
}
