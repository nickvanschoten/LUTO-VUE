import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const MAP_LAYERS_DIR = path.join(process.cwd(), '..', 'data', 'map_layers');

// Phase 28B: Use lowercase partial matches for bulletproof file routing
const NON_AG_CLASSES = [
    'environmental planting', 'riparian', 'agroforestry', 'carbon planting', 'beccs'
];

const AM_CLASSES = [
    'solar', 'wind', 'human-induced', 'technology', 'biochar', 'savanna', 'agri-voltaic'
];

// Default metric → candidate file list
const METRIC_DEFAULT_CANDIDATES: Record<string, string[]> = {
    // Added map_area_NonAg to the fallback list as a safety net
    'Land Use': ['map_dvar_lumap', 'map_area_Ag', 'map_area_NonAg'],
    'Economics': ['map_economics_Ag_profit', 'map_economics_Sum_profit'],
    'GHG': ['map_GHG_Ag', 'map_GHG_Am'],
    'Biodiversity': ['map_bio_overall_All', 'map_bio_overall_Ag'],
    'Water Use': ['map_water_yield_Ag', 'map_water_yield_Am'],
    'Production': ['map_quantities_Sum', 'map_quantities_Ag'],
};

async function tryReadFile(name: string): Promise<string | null> {
    const filePath = path.join(MAP_LAYERS_DIR, `${name}.js`);
    try {
        const text = await fs.readFile(filePath, 'utf-8');
        return text;
    } catch (e: any) {
        return null;
    }
}

// Helper to find a dictionary key ignoring case
const findKey = (obj: any, target: string) => {
    if (!obj || typeof obj !== 'object') return null;
    const targetLow = target.toLowerCase();
    return Object.keys(obj).find(k => k.toLowerCase() === targetLow) || null;
};

// Phase 28B (Fix Base Land Uses): Siloed Spatial Payload Extractor
const extractSpatialPayload = (parsedData: any, parentCat: string | null, subCat: string | null, yearStr: string) => {
    if (!parsedData) return null;

    const pKey = parentCat && parentCat !== 'ALL' ? findKey(parsedData, parentCat) : null;
    const sKey = subCat && subCat !== 'ALL' ? subCat : null;

    // Case A: Specific Intersection Requested (e.g., Beef + Onshore Wind)
    if (pKey && sKey) {
        const parentNode = parsedData[pKey];
        const realSubKey = findKey(parentNode, sKey);

        if (realSubKey && parentNode[realSubKey]?.["ALL"]?.[yearStr]) {
            return parentNode[realSubKey]["ALL"][yearStr];
        }
        return null;
    }

    // Case B: Base Land Use Requested (e.g., Beef + ALL)
    if (pKey && !sKey) {
        const parentNode = parsedData[pKey];

        // Try flat structure first (e.g., blob["Beef - natural land"]["2050"])
        if (parentNode[yearStr]) return parentNode[yearStr];

        // Try nested structure (e.g., blob["Beef - natural land"]["ALL"]["2050"])
        if (parentNode["ALL"]?.[yearStr]) return parentNode["ALL"][yearStr];

        // Try deep nested structure
        if (parentNode["ALL"]?.["ALL"]?.[yearStr]) return parentNode["ALL"]["ALL"][yearStr];

        return null;
    }

    // Case C: Global Ag Management Requested (e.g., ALL + Onshore Wind)
    if (!pKey && sKey) {
        const globalSubKey = findKey(parsedData, sKey);
        if (globalSubKey && parsedData[globalSubKey]?.["ALL"]?.["ALL"]?.[yearStr]) {
            return parsedData[globalSubKey]["ALL"]["ALL"][yearStr];
        }
        return null;
    }

    return null;
};

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const metric = searchParams.get('metric') || '';
    const parentCat = searchParams.get('parentCat') || searchParams.get('subCat');
    const subCat = searchParams.get('subCat') || 'ALL';
    const year = searchParams.get('year') || '2050';

    console.log('[map-layer] Request:', { metric, parentCat, subCat, year });

    // Phase 28B: Smarter File Routing using the actual target requested
    // If subCat is ALL, we must route based on the parentCat!
    const targetClass = (subCat && subCat !== 'ALL') ? subCat : parentCat;
    const targetLow = targetClass ? targetClass.toLowerCase() : '';

    let candidates: string[] = [];

    if (targetLow && targetLow !== 'all') {
        if (NON_AG_CLASSES.some(c => targetLow.includes(c))) {
            candidates = ['map_area_NonAg'];
        } else if (AM_CLASSES.some(c => targetLow.includes(c))) {
            candidates = ['map_area_Am'];
        }
    }

    // Fall back to metric-based candidates if no exact override was found
    if (candidates.length === 0) {
        let defaultCands = METRIC_DEFAULT_CANDIDATES[metric] || [];
        if (targetLow && targetLow !== 'all') {
            defaultCands = defaultCands.filter(c => c !== 'map_dvar_lumap');
        }
        candidates = defaultCands;
    }

    if (candidates.length === 0) {
        console.warn('[map-layer] Unknown metric:', metric);
        return NextResponse.json({ error: `Unknown metric: ${metric}` }, { status: 400 });
    }

    let rawText: string | null = null;
    let resolvedFile = '';
    for (const name of candidates) {
        rawText = await tryReadFile(name);
        if (rawText) { resolvedFile = name; break; }
    }

    if (!rawText) {
        return NextResponse.json({ empty: true }, { status: 200 });
    }

    try {
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1) throw new Error('Could not locate JSON object boundaries.');
        const data = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));

        const payload = extractSpatialPayload(data, parentCat, subCat, year);

        if (payload && payload.img_str) {
            return NextResponse.json({
                img_str: payload.img_str,
                bounds: payload.bounds,
                year,
                file: resolvedFile
            });
        } else {
            console.warn(`[map-layer] Payload not found for path: [${parentCat}][${subCat}][${year}]`);
            return NextResponse.json({ empty: true }, { status: 200 });
        }
    } catch (e: any) {
        console.error('[map-layer] Parse error:', e.message);
        return NextResponse.json({ error: e.message || 'Failed to parse map layer file' }, { status: 500 });
    }
}