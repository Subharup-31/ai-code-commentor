"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RepoInput from "@/components/RepoInput";
import RepoList from "@/components/RepoList";
import ConnectGithubButton from "@/components/ConnectGithubButton";
import { scanRepo, ScanResult } from "@/lib/api";
import SeverityChart from "@/components/SeverityChart";
import VulnerabilityTable from "@/components/VulnerabilityTable";
import RiskHeatmap from "@/components/RiskHeatmap";

export default function DashboardScanPage() {
    const router = useRouter();
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState("");
    const [result, setResult] = useState<ScanResult | null>(null);

    useEffect(() => {
        const storedId = localStorage.getItem("nango_connection_id");
        if (storedId) setConnectionId(storedId);

        const stored = sessionStorage.getItem("scanResult");
        if (stored) setResult(JSON.parse(stored));
    }, []);

    const handleDisconnect = () => {
        localStorage.removeItem("nango_connection_id");
        setConnectionId(null);
        window.dispatchEvent(new Event('github_connection_changed'));
    };

    const handleScan = async (repoUrl: string) => {
        setScanning(true);
        setError("");
        setResult(null);

        const steps = [
            "Fetching repository from GitHub API...",
            "Downloading source files...",
            "Running security analysis (Semgrep)...",
            "Running security analysis (Bandit)...",
            "Mapping CVE vulnerabilities...",
            "Generating AI-powered analysis...",
            "Assembling results...",
        ];

        let stepIndex = 0;
        const progressInterval = setInterval(() => {
            if (stepIndex < steps.length) {
                setProgress(steps[stepIndex]);
                stepIndex++;
            }
        }, 3000);

        try {
            setProgress(steps[0]);
            const scanResult: ScanResult = await scanRepo(repoUrl);
            clearInterval(progressInterval);
            sessionStorage.setItem("scanResult", JSON.stringify(scanResult));
            setResult(scanResult);
            setScanning(false);
        } catch (err) {
            clearInterval(progressInterval);
            let message = "Scan failed. Please try again.";
            if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
                message = "Cannot connect to the backend. Make sure the FastAPI server is running on port 8000.";
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            setScanning(false);
        }
    };

    return (
        <div className="animate-fade-in pb-12">
            {/* Header */}
            <div className="mb-10 pb-6 border-b border-[var(--color-border)]">
                <h1 className="text-3xl font-heading font-black tracking-tight mb-2">
                    Start Scan
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm">
                    Connect GitHub or provide a public URL to perform a comprehensive vulnerability analysis.
                </p>
            </div>

            {/* Scan Options */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                {/* Option 1: Connect GitHub */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded bg-[#27272a] flex items-center justify-center text-white font-semibold text-xs border border-[#3f3f46]">
                                1
                            </div>
                            <h2 className="text-lg font-heading font-bold tracking-tight">Connect GitHub</h2>
                        </div>
                        {connectionId && (
                            <button
                                onClick={handleDisconnect}
                                className="text-xs font-medium text-[var(--color-text-muted)] hover:text-white transition-colors uppercase tracking-wider bg-[#18181b] hover:bg-[#27272a] px-3 py-1.5 rounded-md border border-[var(--color-border)]"
                            >
                                Disconnect
                            </button>
                        )}
                    </div>

                    {!connectionId ? (
                        <div className="glass-card p-8 text-center flex flex-col items-center justify-center min-h-[220px] space-y-5">
                            <p className="text-[var(--color-text-secondary)] text-sm mb-2 max-w-sm">
                                Authenticate with GitHub to authorize CodeComm AI to access your private and public repositories.
                            </p>
                            <ConnectGithubButton onConnect={(id) => setConnectionId(id)} />
                        </div>
                    ) : (
                        <RepoList connectionId={connectionId} onScan={handleScan} disabled={scanning} />
                    )}
                </div>

                {/* Option 2: Paste URL */}
                <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-[#27272a] flex items-center justify-center text-white font-semibold text-xs border border-[#3f3f46]">
                            2
                        </div>
                        <h2 className="text-lg font-heading font-bold tracking-tight">Scan Public URL</h2>
                    </div>

                    <RepoInput onScan={handleScan} disabled={scanning} />

                    <div className="px-5 py-4 rounded-xl border border-[var(--color-border)] bg-[#101014]">
                        <h3 className="font-semibold font-heading text-sm mb-3">Analysis Protocol</h3>
                        <ul className="text-[13px] text-[var(--color-text-secondary)] space-y-2.5">
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span> Source code is retrieved into an ephemeral container.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span> Multi-engine static analysis (Semgrep, Bandit) executed.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span> AI model processes findings to determine exploitability.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span> All downloaded code is securely destroyed post-scan.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Scanning Progress */}
            {scanning && (
                <div className="glass-card p-6 mb-10 animate-fade-in border-[#3f3f46] shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-5 mb-5">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                        </div>
                        <div>
                            <h3 className="text-[15px] font-semibold tracking-tight">Analysis in progress</h3>
                            <p className="text-[var(--color-text-secondary)] text-sm mt-0.5">{progress}</p>
                        </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-[#18181b]">
                        <div className="h-full rounded-full bg-white relative overflow-hidden"
                            style={{
                                animation: "scan-progress 20s cubic-bezier(0.1, 0, 0.2, 1) forwards",
                            }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.5),transparent)] animate-[pulse-glow_2s_infinite]" />
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="glass-card p-4 mb-10 animate-fade-in border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-3 text-red-400">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {result && (
                <div className="animate-fade-in mt-16 border-t border-[var(--color-border)] pt-12">
                    {/* Results Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-2xl font-heading font-black tracking-tight mb-2">
                                Scan Report
                            </h2>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[var(--color-border)] inline-flex">
                                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                                </svg>
                                <span className="text-[var(--color-text-primary)] font-mono text-[13px]">
                                    {result.repo_url}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                        {[
                            { label: "Total Issues", value: result.total_vulnerabilities, accent: "#ffffff" },
                            { label: "Critical", value: result.severity_counts.Critical || 0, accent: "var(--color-severity-critical)" },
                            { label: "High", value: result.severity_counts.High || 0, accent: "var(--color-severity-high)" },
                            { label: "Medium", value: result.severity_counts.Medium || 0, accent: "var(--color-severity-medium)" },
                            { label: "Low", value: result.severity_counts.Low || 0, accent: "var(--color-severity-low)" },
                        ].map((card, i) => (
                            <div key={card.label} className="glass-card p-5 relative overflow-hidden" style={{ animationDelay: `${i * 0.05}s` }}>
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: card.accent, opacity: 0.8 }} />
                                <span className="text-[11px] text-[var(--color-text-muted)] font-semibold uppercase tracking-widest block mb-2">
                                    {card.label}
                                </span>
                                <p className="text-3xl font-heading font-bold" style={{ color: card.accent }}>
                                    {card.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Visualizations Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                        <SeverityChart severityCounts={result.severity_counts} vulnerabilities={result.vulnerabilities} />
                        <RiskHeatmap vulnerabilities={result.vulnerabilities} />
                    </div>

                    {/* Vulnerability Table */}
                    <div>
                        <VulnerabilityTable
                            vulnerabilities={result.vulnerabilities}
                            repoUrl={result.repo_url}
                            connectionId={connectionId}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

