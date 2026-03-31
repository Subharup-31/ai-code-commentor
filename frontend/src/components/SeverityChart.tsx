"use client";

import { Doughnut, PolarArea } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    RadialLinearScale,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, RadialLinearScale);

interface SeverityChartProps {
    severityCounts: Record<string, number>;
    vulnerabilities: { issue: string }[];
}

export default function SeverityChart({ severityCounts, vulnerabilities }: SeverityChartProps) {
    // ── Doughnut: Severity Distribution ────────────────────────────────────
    const severityData = {
        labels: ["Critical", "High", "Medium", "Low"],
        datasets: [
            {
                data: [
                    severityCounts.Critical || 0,
                    severityCounts.High || 0,
                    severityCounts.Medium || 0,
                    severityCounts.Low || 0,
                ],
                backgroundColor: [
                    "#ff6b6b",
                    "#ff9f43",
                    "#feca57",
                    "#1dd1a1",
                ],
                borderColor: [
                    "#09090b",
                    "#09090b",
                    "#09090b",
                    "#09090b",
                ],
                borderWidth: 2,
                hoverOffset: 6,
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    color: "#e4e4e7",
                    padding: 20,
                    usePointStyle: true,
                    pointStyleWidth: 12,
                    font: { size: 12, family: "Inter", weight: 600 },
                },
            },
            tooltip: {
                backgroundColor: "#000000",
                titleColor: "#ffffff",
                bodyColor: "#e4e4e7",
                borderColor: "#3f3f46",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
            },
        },
    };

    // ── Bar: Vulnerability Type Distribution ───────────────────────────────
    const typeCounts: Record<string, number> = {};
    vulnerabilities.forEach((v) => {
        // Extract a short label from the issue text
        const words = v.issue.split(" ").slice(0, 4).join(" ");
        const label = words.length > 30 ? words.slice(0, 30) + "…" : words;
        typeCounts[label] = (typeCounts[label] || 0) + 1;
    });

    const sortedTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const polarData = {
        labels: sortedTypes.map(([label]) => label),
        datasets: [
            {
                label: "Count",
                data: sortedTypes.map(([, count]) => count),
                backgroundColor: [
                    "rgba(59, 130, 246, 0.8)",   // blue
                    "rgba(168, 85, 247, 0.8)",   // purple
                    "rgba(255, 107, 107, 0.8)",  // red
                    "rgba(254, 202, 87, 0.8)",   // yellow
                    "rgba(29, 209, 161, 0.8)",   // green
                ],
                borderColor: "#09090b",
                borderWidth: 2,
            },
        ],
    };

    const polarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "right" as const,
                labels: {
                    color: "#e4e4e7",
                    padding: 10,
                    usePointStyle: true,
                    pointStyleWidth: 10,
                    font: { size: 11, family: "Inter", weight: 500 },
                },
            },
            tooltip: {
                backgroundColor: "#000000",
                titleColor: "#ffffff",
                bodyColor: "#e4e4e7",
                borderColor: "#3f3f46",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
            },
        },
        scales: {
            r: {
                ticks: { display: false },
                grid: { color: "#27272a" },
            },
        },
    };

    return (
        <>
            {/* Severity Pie */}
            <div className="glass-card p-6 h-full flex flex-col">
                <h3 className="text-[15px] font-heading font-bold text-white mb-6">Severity Distribution</h3>
                <div className="flex-1 min-h-[16rem] relative w-full">
                    <Doughnut data={severityData} options={doughnutOptions} />
                </div>
            </div>

            {/* Vulnerability Types Polar Area */}
            <div className="glass-card p-6 h-full flex flex-col">
                <h3 className="text-[15px] font-heading font-bold text-white mb-6">Top Issue Types</h3>
                <div className="flex-1 min-h-[16rem] relative w-full flex items-center justify-center">
                    <PolarArea data={polarData} options={polarOptions as any} />
                </div>
            </div>
        </>
    );
}

