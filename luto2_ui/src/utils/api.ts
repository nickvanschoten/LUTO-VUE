import { tableFromIPC } from 'apache-arrow';

const API_ROOT = 'http://localhost:8000/api/v1';

export async function fetchScenarios() {
    const res = await fetch(`${API_ROOT}/scenarios`);
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
}

export async function fetchSummary(scenarioId: string) {
    const res = await fetch(`${API_ROOT}/scenarios/${scenarioId}/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
}

/**
 * Heavy Path: Fetches Apache Arrow IPC stream and parses to a native Arrow Table.
 */
export async function fetchSpatialData(
    scenarioId: string,
    year: number,
    variables: string[],
    bbox?: number[]
) {
    const params = new URLSearchParams({
        year: year.toString(),
        variables: variables.join(',')
    });

    // Attach bounds dynamically to trigger backend high-resolution query
    if (bbox && bbox.length === 4) {
        params.append('bbox', bbox.join(','));
    }

    const res = await fetch(`${API_ROOT}/scenarios/${scenarioId}/spatial?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch spatial Arrow buffer');

    // High performance Arrow IPC Unpacker
    const arrayBuffer = await res.arrayBuffer();
    return tableFromIPC(arrayBuffer);
}

/**
 * Comparator Engine API connection
 */
export async function fetchComparatorData(
    baseId: string,
    targetId: string,
    year: number,
    variables: string[],
    bbox?: number[]
) {
    const params = new URLSearchParams({
        base: baseId,
        target: targetId,
        year: year.toString(),
        variables: variables.join(',')
    });

    if (bbox && bbox.length === 4) {
        params.append('bbox', bbox.join(','));
    }

    const res = await fetch(`${API_ROOT}/compare?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch comparator Arrow buffer');

    const arrayBuffer = await res.arrayBuffer();
    return tableFromIPC(arrayBuffer);
}
