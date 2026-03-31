"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RepoInput from "@/components/RepoInput";
import RepoList from "@/components/RepoList";
import ConnectGithubButton from "@/components/ConnectGithubButton";
import { scanRepo, ScanResult } from "@/lib/api";

export default function ScanPage() {
    const router = useRouter();
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        // Hydrate connection state from localStorage on mount
        const storedId = localStorage.getItem("nango_connection_id");
        if (storedId) {
            setConnectionId(storedId);
        }
    }, []);

    const handleDisconnect = () => {
        localStorage.removeItem("nango_connection_id");
        setConnectionId(null);
    };

    const handleScan = async (repoUrl: string) => {
        setScanning(true);
        setError("");

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
            const result: ScanResult = await scanRepo(repoUrl);

            clearInterval(progressInterval);
            sessionStorage.setItem("scanResult", JSON.stringify(result));
            router.push("/dashboard");
        } catch (err) {
            clearInterval(progressInterval);
            let message = "Scan failed. Please try again.";
            if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
                message = "Cannot connect to the backend. Make sure the FastAPI server is running on port 8000.\n\nRun: cd backend && python main.py";
            } else if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            setScanning(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-start justify-center px-6 py-12 md:py-20">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10 animate-fade-in">
                    <h1 className="text-4xl font-black mb-4">
                        Scan a <span className="gradient-text">Repository</span>
                    </h1>
                    <p className="text-[var(--color-text-secondary)] text-lg">
                        Select an existing GitHub repo or paste a public URL to detect vulnerabilities
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full animate-fade-in" style={{ animationDelay: "0.1s" }}>

                    {/* Option 1: View Repositories */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[var(--color-accent-purple)] font-bold text-sm">
                                    1
                                </div>
                                <h2 className="text-xl font-bold">Connect GitHub</h2>
                            </div>
                            {connectionId && (
                                <button
                                    onClick={handleDisconnect}
                                    className="text-xs text-[var(--color-text-muted)] hover:text-white transition-colors uppercase tracking-wider bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] px-3 py-1.5 rounded-md"
                                >
                                    Disconnect
                                </button>
                            )}
                        </div>

                        {!connectionId ? (
                            <div className="glass-card p-8 text-center h-full flex flex-col items-center justify-center min-h-[250px] space-y-4">
                                <p className="text-[var(--color-text-secondary)] mb-2">Connect your GitHub to easily view and scan your repositories.</p>
                                <ConnectGithubButton onConnect={(id) => setConnectionId(id)} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col">
                                <RepoList connectionId={connectionId} onScan={handleScan} disabled={scanning} />
                            </div>
                        )}
                    </div>

                    {/* Option 2: Paste URL */}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center text-[var(--color-severity-low)] font-bold text-sm">
                                2
                            </div>
                            <h2 className="text-xl font-bold">Scan via URL</h2>
                        </div>
                        <div className="h-full flex flex-col">
                            <RepoInput onScan={handleScan} disabled={scanning} />

                            <div className="mt-8 p-6 glass-card border border-[rgba(255,255,255,0.05)] bg-[rgba(10,14,26,0.3)]">
                                <h3 className="font-semibold mb-2">How it works</h3>
                                <ul className="text-sm text-[var(--color-text-secondary)] space-y-2 list-disc list-inside">
                                    <li>Your code is downloaded temporarily.</li>
                                    <li>We run static analysis tools (Semgrep & Bandit).</li>
                                    <li>AI engine filters false positives.</li>
                                    <li>Code is deleted after analysis.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scanning Progress */}
                {scanning && (
                    <div className="glass-card p-8 mt-12 animate-fade-in">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent animate-spin" />
                                <div className="absolute inset-2 rounded-full border-2 border-[var(--color-accent-purple)] border-b-transparent animate-spin"
                                    style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Scanning in Progress</h3>
                                <p className="text-[var(--color-text-secondary)] text-sm">{progress}</p>
                            </div>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
                            <div className="h-full rounded-full"
                                style={{
                                    background: "linear-gradient(90deg, var(--color-accent-cyan), var(--color-accent-purple))",
                                    animation: "scan-progress 20s ease-in-out forwards",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="glass-card p-6 mt-12 animate-fade-in border-[var(--color-severity-critical)]"
                        style={{ borderColor: "rgba(239, 68, 68, 0.3)" }}>
                        <div className="flex items-center gap-3 text-[var(--color-severity-critical)]">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                            <p className="font-medium">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
