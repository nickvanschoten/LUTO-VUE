/**
 * Global Unit Dictionary for LUTO 2 Scientific Visualization
 */

export function getUnitForMetric(metric: string, subCategory?: string | null): string {
    const m = metric.toLowerCase();

    if (m.includes('land use') || m.includes('area')) {
        return 'Proportion (0-1)';
    }

    if (m.includes('production')) {
        if (subCategory?.toLowerCase().includes('dairy')) {
            return 'Litres';
        }
        return 'Tonnes';
    }

    if (m.includes('economics')) {
        return 'AUD 2010';
    }

    if (m.includes('water')) {
        return 'Litres';
    }

    if (m.includes('biodiversity')) {
        return 'Pre-1750 Index';
    }

    if (m.includes('ghg')) {
        return 'tCO2e';
    }

    return 'Units';
}

export function formatMetricValue(value: number, metric: string, subCategory?: string | null): string {
    const unit = getUnitForMetric(metric, subCategory);

    if (unit === 'Proportion (0-1)') {
        return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    }

    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
