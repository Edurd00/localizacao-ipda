import { NextRequest, NextResponse } from 'next/server';

/**
 * Extracts latitude and longitude from a Google Maps URL string using regex.
 * Handles multiple URL patterns:
 *  - https://www.google.com/maps/@lat,lng,...
 *  - https://www.google.com/maps?q=lat,lng
 *  - https://maps.google.com/maps?ll=lat,lng
 *  - https://www.google.com/maps/place/.../@lat,lng,...
 */
function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    // @lat,lng — most common in full URLs and place links
    /@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // q=lat,lng
    /[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // ll=lat,lng
    /[?&]ll=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // center=lat,lng
    /[?&]center=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
    // destination=lat,lng  (directions links)
    /destination=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return { lat, lng };
      }
    }
  }

  return null;
}

/**
 * Checks if a URL is a shortened Google Maps link that must be expanded server-side.
 */
function isShortened(url: string): boolean {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawInput: string = body?.url ?? '';

    if (!rawInput || rawInput.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Nenhum link informado.' },
        { status: 400 }
      );
    }

    // 1. Extract any URL-like substring from the pasted text (message from WhatsApp, etc.)
    const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
    const foundUrls = rawInput.match(urlRegex) || [];

    // Prioritise shortened links, otherwise take the first found URL
    const candidate =
      foundUrls.find((u) => isShortened(u)) ||
      foundUrls.find((u) => /google\.com\/maps|maps\.google/i.test(u)) ||
      foundUrls[0] ||
      rawInput.trim();

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: 'Nenhum link de mapa encontrado no texto colado.' },
        { status: 422 }
      );
    }

    // 2. Try to extract coordinates directly (long URLs already contain them)
    const directCoords = extractCoordsFromUrl(candidate);
    if (directCoords) {
      return NextResponse.json({ success: true, ...directCoords, expanded_url: candidate });
    }

    // 3. Shortened URL — follow redirects server-side to get the final URL
    if (isShortened(candidate)) {
      try {
        const response = await fetch(candidate, {
          method: 'HEAD',
          redirect: 'follow',
          // 5 second timeout via AbortSignal
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; LocalizacaoIPDA/1.0; +https://ipda.com.br)',
          },
        });

        const finalUrl = response.url;

        if (finalUrl && finalUrl !== candidate) {
          const coords = extractCoordsFromUrl(finalUrl);
          if (coords) {
            return NextResponse.json({ success: true, ...coords, expanded_url: finalUrl });
          }
        }

        // HEAD didn't give us a body URL with coords — fall back to GET
        const getResponse = await fetch(candidate, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; LocalizacaoIPDA/1.0; +https://ipda.com.br)',
          },
        });

        const getUrl = getResponse.url;
        if (getUrl) {
          const coords = extractCoordsFromUrl(getUrl);
          if (coords) {
            return NextResponse.json({ success: true, ...coords, expanded_url: getUrl });
          }

          // Also try parsing body HTML for a canonical or redirect meta
          const html = await getResponse.text();
          const canonicalMatch = html.match(
            /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i
          );
          if (canonicalMatch) {
            const coords2 = extractCoordsFromUrl(canonicalMatch[1]);
            if (coords2) {
              return NextResponse.json({ success: true, ...coords2, expanded_url: canonicalMatch[1] });
            }
          }
        }
      } catch (fetchErr) {
        console.error('Error expanding shortened URL:', fetchErr);
        return NextResponse.json(
          {
            success: false,
            error:
              'Não foi possível expandir o link encurtado. Verifique sua conexão e tente novamente.',
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Não foi possível extrair coordenadas deste link. Tente colar o link longo direto do Google Maps.',
      },
      { status: 422 }
    );
  } catch (err) {
    console.error('expand-link API error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar o link.' },
      { status: 500 }
    );
  }
}
