import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

// Root data directory — process.cwd() = .../LUTO-VUE/luto2_ui at runtime
const ROOT_DATA_DIR = path.join(process.cwd(), '..', 'data');

/**
 * Checks whether a child entry inside ROOT_DATA_DIR is a valid LUTO-VUE scenario.
 * A valid scenario is a directory that contains a `data/` subfolder.
 * Anything else (files, empty folders, hidden entries, zip artifacts, etc.) is silently ignored.
 */
async function isValidScenario(entryName: string): Promise<boolean> {
    // Ignore hidden OS artifacts (e.g., .DS_Store dirs, __MACOSX)
    if (entryName.startsWith('.') || entryName.startsWith('_')) return false;

    const entryPath = path.join(ROOT_DATA_DIR, entryName);

    try {
        const stat = await fs.stat(entryPath);
        if (!stat.isDirectory()) return false;

        // A valid scenario must contain a `data/` subfolder
        const innerDataPath = path.join(entryPath, 'data');
        const innerStat = await fs.stat(innerDataPath);
        return innerStat.isDirectory();
    } catch {
        // stat throws ENOENT or EACCES — not a valid scenario, skip silently
        return false;
    }
}

export async function GET() {
    try {
        let entries: string[];

        try {
            entries = await fs.readdir(ROOT_DATA_DIR);
        } catch (e: any) {
            // Root data directory doesn't exist yet — return empty list, not a 500
            console.warn('[scenarios] Root data directory not found:', ROOT_DATA_DIR, e.message);
            return NextResponse.json([], { status: 200 });
        }

        // Fan-out validation checks in parallel for performance
        const validationResults = await Promise.all(
            entries.map(async (entry) => ({
                entry,
                valid: await isValidScenario(entry),
            }))
        );

        const scenarios = validationResults
            .filter(({ valid }) => valid)
            .map(({ entry }) => ({
                id: entry,
                label: entry,
            }))
            // Sort chronologically — folder names are date-prefixed (YYYYMMDD_*)
            .sort((a, b) => a.id.localeCompare(b.id));

        console.log(`[scenarios] Discovered ${scenarios.length} valid scenario(s):`, scenarios.map(s => s.id));

        return NextResponse.json(scenarios, { status: 200 });
    } catch (e: any) {
        // Catch-all: unexpected errors should never crash the dashboard
        console.error('[scenarios] Unexpected error during scan:', e.message);
        return NextResponse.json([], { status: 200 });
    }
}
