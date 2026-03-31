"use client";

import { useEffect, useState } from "react";
import { GithubRepo } from "@/lib/github";

interface RepoListProps {
    connectionId: string | null;
    onScan: (repoUrl: string) => void;
    disabled?: boolean;
}

export default function RepoList({ connectionId, onScan, disabled }: RepoListProps) {
    const [repos, setRepos] = useState<GithubRepo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadRepos = async () => {
            if (!connectionId) return;

            setLoading(true);
            setError("");
            try {
                const response = await fetch(`/api/repos?connectionId=${encodeURIComponent(connectionId)}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch repositories.");
                }
                const data = await response.json();
                setRepos(data);
            } catch (err: any) {
                setError(err.message || "Failed to fetch repositories. Please try reconnecting GitHub.");
            } finally {
                setLoading(false);
            }
        };

        if (connectionId) {
            loadRepos();
        } else {
            setLoading(false);
        }
    }, [connectionId]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <svg className="w-8 h-8 animate-spin text-[var(--color-accent-cyan)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-[var(--color-severity-critical)] bg-[rgba(239,68,68,0.1)] rounded-xl border border-[rgba(239,68,68,0.3)]">
                {error}
            </div>
        );
    }

    if (!connectionId) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-[15px] font-heading font-bold mb-2 text-white">Select Repository</h3>
            <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {repos.length === 0 ? (
                    <p className="text-[var(--color-text-muted)] text-[13px] text-center py-6">No repositories found.</p>
                ) : (
                    repos.map((repo) => (
                        <div key={repo.full_name} className="p-4 rounded-xl flex items-center justify-between transition-colors bg-[#09090b] hover:bg-[#121214] border border-[#27272a]">
                            <div className="pr-4">
                                <h4 className="font-semibold text-[14px] flex items-center gap-2 text-white leading-tight">
                                    <svg className="w-3.5 h-3.5 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                                    </svg>
                                    {repo.name}
                                    {repo.private && (
                                        <span className="text-[10px] uppercase font-bold tracking-widest bg-[#18181b] border border-[#3f3f46] px-2 py-0.5 rounded text-[#a1a1aa]">Private</span>
                                    )}
                                </h4>
                                <p className="text-[12px] font-mono text-[var(--color-text-muted)] mt-1 truncate max-w-[200px] sm:max-w-[240px]" title={repo.full_name}>{repo.full_name}</p>
                            </div>
                            <button
                                onClick={() => onScan(repo.clone_url)}
                                disabled={disabled}
                                className="btn-secondary px-4 py-2 text-[13px] whitespace-nowrap shadow-sm disabled:opacity-50"
                            >
                                Analyze
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
