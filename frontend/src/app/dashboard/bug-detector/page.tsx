"use client";

import { useState } from "react";

interface Vulnerability {
    id: string;
    file: string;
    line: number;
    issue: string;
    code_snippet: string;
    explanation: string;
    secure_fix: { description: string; code: string };
}

export default function BugDetectorSandbox() {
    const [repoUrl, setRepoUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [bugs, setBugs] = useState<Vulnerability[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fixing, setFixing] = useState(false);
    const [prUrl, setPrUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const activeExample = bugs.find(ex => ex.id === selectedId) || bugs[0];

    const handleScan = async () => {
        if (!repoUrl) return;
        setIsLoading(true);
        setError(null);
        setBugs([]);
        setPrUrl(null);
        setSelectedId(null);

        try {
            const res = await fetch("http://localhost:8000/scan-repo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repo_url: repoUrl })
            });

            if (!res.ok) {
                const errResult = await res.json();
                throw new Error(errResult.detail || "Failed to scan repository.");
            }

            const data = await res.json();

            if (data.vulnerabilities && data.vulnerabilities.length > 0) {
                setBugs(data.vulnerabilities);
                setSelectedId(data.vulnerabilities[0].id);
            } else {
                setError("No vulnerabilities detected in this repository! It is secure.");
            }
        } catch (err: any) {
            setError(err.message || "An unexpected network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFix = async () => {
        if (!activeExample || !repoUrl) return;
        setFixing(true);
        setPrUrl(null);
        setError(null);

        try {
            const res = await fetch("http://localhost:8000/apply-fix", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    repo_url: repoUrl,
                    file_path: activeExample.file,
                    line: activeExample.line,
                    secure_code: activeExample.secure_fix.code
                })
            });

            if (!res.ok) {
                const errResult = await res.json();
                throw new Error(errResult.detail || "Failed to generate Pull Request.");
            }

            const data = await res.json();
            setPrUrl(data.pr_url);
        } catch (err: any) {
            setError(err.message || "Network error while applying fix.");
        } finally {
            setFixing(false);
        }
    };

    return (
        <div className="animate-fade-in flex flex-col gap-6">
            {/* Header & Search */}
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-heading font-bold tracking-tight text-white mb-2">Real-Time Bug Detector</h1>
                    <p className="text-[#a1a1aa] max-w-2xl text-[15px] leading-relaxed mb-6">
                        Automatically scan any GitHub repository and instantly visualize critical vulnerabilities alongside AI-generated, production-ready fixes. Deploy remediation Pull Requests directly from this Sandbox in a single click.
                    </p>
                </div>

                {/* Scan Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="https://github.com/owner/repo"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-white placeholder:text-[#52525b] focus:outline-none focus:border-white transition-colors"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                    />
                    <button
                        onClick={handleScan}
                        disabled={isLoading || !repoUrl}
                        className="bg-white text-black font-bold uppercase tracking-widest text-[13px] px-8 py-3 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                Scanning
                            </>
                        ) : "Scan Repository"}
                    </button>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-[14px]">
                        {error}
                    </div>
                )}
            </div>

            {/* Instruction / Empty State */}
            {!isLoading && bugs.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[#27272a] rounded-xl bg-[#09090b]">
                    <svg className="w-12 h-12 text-[#52525b] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <h3 className="text-lg font-bold text-white mb-2">No active scan context</h3>
                    <p className="text-[#a1a1aa] text-[14px] max-w-md text-center">
                        Enter a valid public GitHub repository URL above to initiate an automated security analysis.
                    </p>
                </div>
            )}

            {/* Main Interface when bugs exist */}
            {bugs.length > 0 && activeExample && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in mt-2">

                    {/* Sidebar Selector */}
                    <div className="lg:col-span-1 flex flex-col gap-3 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                        <h3 className="text-[13px] font-bold uppercase tracking-widest text-[#71717a] mb-1 sticky top-0 bg-[#000000] z-10 py-1">Detected Bugs ({bugs.length})</h3>
                        {bugs.map((ex) => (
                            <button
                                key={ex.id}
                                onClick={() => setSelectedId(ex.id)}
                                className={`text-left px-4 py-3 rounded-lg border transition-all ${selectedId === ex.id
                                    ? "bg-[#18181b] border-[#52525b] text-white shadow-sm"
                                    : "bg-transparent border-[#27272a] text-[#a1a1aa] hover:bg-[#121214] hover:text-zinc-300"}`}
                            >
                                <span className="block text-[14px] font-bold mb-1 truncate">{ex.issue}</span>
                                <span className="block text-[12px] opacity-70 truncate" title={ex.file}>
                                    {ex.file}:{ex.line}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Sandbox Area */}
                    <div className="lg:col-span-3 flex flex-col gap-6">

                        {/* Context Panel */}
                        <div className="glass-card p-6 border-l-4 border-l-blue-500">
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                AI Intelligence Context
                            </h2>
                            <p className="text-[14px] text-[#a1a1aa] leading-relaxed">
                                {activeExample.explanation}
                            </p>
                        </div>

                        {/* Code Diff Layout */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                            {/* Vulnerable Pane */}
                            <div className="flex flex-col rounded-xl overflow-hidden border border-red-500/30 bg-[#09090b] shadow-lg">
                                <div className="px-4 py-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between">
                                    <span className="text-[12px] font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Live Vulnerability
                                    </span>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                    <pre className="font-mono text-[13px] leading-relaxed text-red-200/90 whitespace-pre">
                                        {activeExample.code_snippet}
                                    </pre>
                                </div>
                            </div>

                            {/* Secure Pane */}
                            <div className="flex flex-col rounded-xl overflow-hidden border border-emerald-500/30 bg-[#09090b] shadow-lg h-full">
                                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                                    <span className="text-[12px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Production Fix
                                    </span>
                                </div>
                                <div className="flex-1 p-4 overflow-x-auto relative group">
                                    <pre className="font-mono text-[13px] leading-relaxed text-emerald-200/90 whitespace-pre">
                                        {activeExample.secure_fix.code}
                                    </pre>

                                    {/* Quick action buttons overlay */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                                        <button
                                            onClick={handleFix}
                                            disabled={fixing || prUrl !== null}
                                            className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded shadow-xl text-[12px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 backdrop-blur-sm"
                                            title="Automatically generate a Pull Request to fix this issue in your repository"
                                        >
                                            {fixing ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                                                    Patching
                                                </>
                                            ) : prUrl ? (
                                                "Patch Deployed"
                                            ) : (
                                                "Apply Fix"
                                            )}
                                        </button>

                                        {prUrl && (
                                            <a
                                                href={prUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/30 px-4 py-2 rounded shadow-xl text-[12px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 backdrop-blur-sm animate-fade-in"
                                            >
                                                View Pull Request
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Why this matters */}
                        <div className="glass-card p-6 border-l-4 border-l-emerald-500 bg-emerald-500/5 mt-2">
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.746 3.746 0 01-3.296 1.043A3.746 3.746 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.746 3.746 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.746 3.746 0 011.043-3.296 3.745 3.745 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                                </svg>
                                Why This Achieves Production Safety
                            </h2>
                            <p className="text-[14px] text-emerald-100/80 leading-relaxed font-medium">
                                {activeExample.secure_fix.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
