import { NextResponse } from 'next/server';
import Papa from 'papaparse';

// Force dynamic rendering — do NOT try to pre-render at build time
export const dynamic = 'force-dynamic';

const CSV_URL = process.env.NEXT_PUBLIC_CSV_URL;

// Cache the VINs for 60 seconds to avoid excessive requests
let cachedVins = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

async function fetchVins() {
    const now = Date.now();
    if (cachedVins && now - cacheTimestamp < CACHE_DURATION) {
        return cachedVins;
    }

    const response = await fetch(CSV_URL, {
        next: { revalidate: 60 },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();

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
            { error: 'Error al obtener los VINs del spreadsheet' },
            { status: 500 }
        );
    }
}
