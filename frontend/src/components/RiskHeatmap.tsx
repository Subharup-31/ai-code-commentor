"use client";

import { Vulnerability } from "@/lib/api";

interface RiskHeatmapProps {
    vulnerabilities: Vulnerability[];
}

interface FileRisk {
    file: string;
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    maxCvss: number;
}

export default function RiskHeatmap({ vulnerabilities }: RiskHeatmapProps) {
    // Aggregate vulnerabilities per file
    const fileMap = new Map<string, FileRisk>();

    vulnerabilities.forEach((v) => {
        const existing = fileMap.get(v.file) || {
            file: v.file,
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            maxCvss: 0,
        };
        existing.total++;
        existing.maxCvss = Math.max(existing.maxCvss, v.cvss_score);

        if (v.severity === "Critical") existing.critical++;
        else if (v.severity === "High") existing.high++;
        else if (v.severity === "Medium") existing.medium++;
        else existing.low++;

        fileMap.set(v.file, existing);
    });

    const files = Array.from(fileMap.values()).sort((a, b) => b.maxCvss - a.maxCvss);

    const getRiskColor = (cvss: number) => {
        if (cvss >= 9) return { bg: "rgba(255, 107, 107, 0.1)", border: "rgba(255, 107, 107, 0.3)", text: "var(--color-severity-critical)" };
        if (cvss >= 7) return { bg: "rgba(255, 159, 67, 0.1)", border: "rgba(255, 159, 67, 0.3)", text: "var(--color-severity-high)" };
        if (cvss >= 4) return { bg: "rgba(254, 202, 87, 0.1)", border: "rgba(254, 202, 87, 0.3)", text: "var(--color-severity-medium)" };
        return { bg: "rgba(29, 209, 161, 0.1)", border: "rgba(29, 209, 161, 0.3)", text: "var(--color-severity-low)" };
    };

    return (
        <div className="glass-card p-6 h-full flex flex-col">
            <h3 className="text-[15px] font-heading font-bold text-white mb-6">Risk Heatmap by File</h3>

            {files.length === 0 ? (
                <div className="flex-1 flex items-center justify-center min-h-[16rem]">
                    <p className="text-[13px] text-[var(--color-text-muted)] text-center">No data available</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3 flex-1 overflow-y-auto min-h-[16rem]">
                    {files.map((file, i) => {
                        const colors = getRiskColor(file.maxCvss);
                        return (
                            <div
                                key={file.file}
                                className="rounded-lg p-4 transition-colors cursor-default animate-fade-in group hover:bg-[#18181b]"
                                style={{
                                    background: colors.bg,
                                    border: `1px solid ${colors.border}`,
                                    animationDelay: `${i * 0.03}s`,
                                }}
                                title={`${file.file}\nCVSS: ${file.maxCvss}\nVulnerabilities: ${file.total}`}
                            >
                                <p className="text-[12px] font-mono truncate mb-2 text-[var(--color-text-primary)] group-hover:text-white transition-colors">
                                    {file.file.split("/").pop()}
                                </p>
                                <p className="text-2xl font-bold font-heading" style={{ color: colors.text }}>
                                    {file.total}
                                </p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 font-medium">
                                    Max CVSS: {file.maxCvss.toFixed(1)}
                                </p>
                                {/* Severity mini dots */}
                                <div className="flex gap-1.5 mt-3">
                                    {file.critical > 0 && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-severity-critical)' }} title={`${file.critical} Critical`} />}
                                    {file.high > 0 && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-severity-high)' }} title={`${file.high} High`} />}
                                    {file.medium > 0 && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-severity-medium)' }} title={`${file.medium} Medium`} />}
                                    {file.low > 0 && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-severity-low)' }} title={`${file.low} Low`} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-[var(--color-border)]">
                <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">Risk</span>
                {[
                    { label: "Critical", color: "var(--color-severity-critical)" },
                    { label: "High", color: "var(--color-severity-high)" },
                    { label: "Medium", color: "var(--color-severity-medium)" },
                    { label: "Low", color: "var(--color-severity-low)" },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 border border-[#27272a] bg-[#18181b] px-2 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

