"use client";

import { useState } from "react";

interface RepoInputProps {
    onScan: (repoUrl: string) => void;
    disabled?: boolean;
}

export default function RepoInput({ onScan, disabled }: RepoInputProps) {
    const [url, setUrl] = useState("");
    const [isValid, setIsValid] = useState(true);

    const validateUrl = (value: string) => {
        if (!value) return true;
        const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/;
        return githubRegex.test(value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url.trim()) return;

        if (!validateUrl(url)) {
            setIsValid(false);
            return;
        }

        setIsValid(true);
        onScan(url.trim());
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-2 relative">
                <div className="flex-1 relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                        </svg>
                    </div>
                    <input
                        id="repo-url-input"
                        type="url"
                        value={url}
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setIsValid(true);
                        }}
                        placeholder="https://github.com/owner/repository"
                        className="w-full pl-12 pr-4 py-3 bg-[#000000] border border-[#27272a] focus:border-[#52525b] focus:ring-1 focus:ring-[#52525b] transition-all text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none text-[15px] rounded-xl shadow-sm"
                        disabled={disabled}
                    />
                </div>
                <button
                    id="scan-button"
                    type="submit"
                    disabled={disabled || !url.trim()}
                    className="btn-primary text-[15px] px-8 py-3 whitespace-nowrap flex items-center justify-center gap-2 rounded-xl h-full shadow-sm"
                >
                    {disabled ? (
                        <>
                            <svg className="w-4 h-4 animate-spin opacity-70" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Scanning...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4 text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            Scan Target
                        </>
                    )}
                </button>
            </div>

            {!isValid && (
                <p className="text-red-500 text-[13px] font-medium mt-2 animate-fade-in flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Invalid GitHub URL
                </p>
            )}
        </form>
    );
}
