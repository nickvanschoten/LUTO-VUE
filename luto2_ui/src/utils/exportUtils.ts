export const exportChartToCSV = (seriesData: any[], title: string) => {
    if (!seriesData || seriesData.length === 0) return;

    let csvContent = "Series,Year,Value\n";

    seriesData.forEach(series => {
        if (!series || !series.name || !Array.isArray(series.data)) return;
        series.data.forEach((tuple: any) => {
            const year = tuple[0];
            const val = tuple[1];
            const safeName = `"${series.name.replace(/"/g, '""')}"`;
            csvContent += `${safeName},${year},${val}\n`;
        });
    });

    triggerDownload(csvContent, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`);
};

export const exportChoroplethToCSV = (dataDict: Record<string, number>, year: number, title: string) => {
    if (!dataDict || Object.keys(dataDict).length === 0) return;

    let csvContent = "NRM_Region,Year,Value\n";
    Object.entries(dataDict).forEach(([region, val]) => {
        const safeRegion = `"${region.replace(/"/g, '""')}"`;
        csvContent += `${safeRegion},${year},${val}\n`;
    });

    triggerDownload(csvContent, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_map_export.csv`);
};

const triggerDownload = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
