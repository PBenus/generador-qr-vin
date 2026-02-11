import { NextResponse } from 'next/server';
import Papa from 'papaparse';

// Force dynamic rendering — do NOT try to pre-render at build time
// Triggering redeploy to verify environment variables
export const dynamic = 'force-dynamic';

const CSV_URL = process.env.NEXT_PUBLIC_CSV_URL?.trim();

// Cache the VINs for 60 seconds to avoid excessive requests
let cachedVins = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

async function fetchVins() {
    if (!CSV_URL) {
        throw new Error('NEXT_PUBLIC_CSV_URL no está configurada en las variables de entorno');
    }

    const now = Date.now();
    if (cachedVins && now - cacheTimestamp < CACHE_DURATION) {
        return cachedVins;
    }

    console.log('Fetching CSV from:', CSV_URL);

    const response = await fetch(CSV_URL, {
        next: { revalidate: 60 },
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('CSV fetch failed:', response.status, text);
        throw new Error(`Error de Google Sheets: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();

    if (!csvText || csvText.length < 10) {
        throw new Error('El CSV recibido está vacío o es demasiado corto');
    }

    const parsed = Papa.parse(csvText, {
        skipEmptyLines: true,
    });

    // VINs are in column B (index 1), starting from row 5 (index 4)
    const vins = [];
    const seenVins = new Set();

    for (let i = 4; i < parsed.data.length; i++) {
        const row = parsed.data[i];
        if (row && row[1]) {
            const vin = String(row[1]).trim().toUpperCase();
            if (vin && vin.length > 0 && !seenVins.has(vin)) {
                seenVins.add(vin);
                vins.push(vin);
            }
        }
    }

    cachedVins = vins;
    cacheTimestamp = now;

    return vins;
}

export async function GET(request) {
    try {
        const vins = await fetchVins();

        // Optional: filter by query parameter
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim().toUpperCase() || '';

        let results = vins;
        if (query) {
            results = vins.filter((vin) => vin.endsWith(query) || vin.includes(query));
            results = results.slice(0, 30); // Limit results
        }

        return NextResponse.json({
            total: vins.length,
            results: results,
        });
    } catch (error) {
        console.error('Error fetching VINs:', error);
        return NextResponse.json(
            { error: error.message || 'Error desconocido al obtener los VINs' },
            { status: 500 }
        );
    }
}
