"use client";

import { useEffect, useState, useRef } from "react";

interface CodeViewerProps {
    file: { path: string; content: string } | null;
    repo: { owner: string; repo: string } | null;
    connectionId: string | null;
    /** Live AI-generated commented code streamed from CommenterChat */
    commentedCode?: string | null;
}

export default function CodeViewer({ file, repo, connectionId, commentedCode }: CodeViewerProps) {
    const [mode, setMode] = useState<"code" | "diff">("code");
    const [editableCode, setEditableCode] = useState("");
    const [isRaisingPR, setIsRaisingPR] = useState(false);
    const [prUrl, setPrUrl] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLDivElement>(null);

    // When a new file is selected, reset to its original content
    useEffect(() => {
        if (file) {
            setEditableCode(file.content);
            setPrUrl(null);
            setMode("code");
        } else {
            setEditableCode("");
        }
    }, [file]);

    // ✅ When AI streams commented code, apply it live to the editor
    useEffect(() => {
        if (commentedCode) {
            setEditableCode(commentedCode);
        }
    }, [commentedCode]);

    const handleScroll = () => {
        if (preRef.current && textareaRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const handleRaisePR = async () => {
        if (!file || !repo || !connectionId || editableCode === file.content) return;
        
        setIsRaisingPR(true);
        try {
            const res = await fetch("/api/create-pr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionId,
                    owner: repo.owner,
                    repo: repo.repo,
                    filePath: file.path,
                    newContent: editableCode,
                })
            });
            const data = await res.json();
            if (data.pullRequestUrl) {
                setPrUrl(data.pullRequestUrl);
            } else {
                alert("Failed to create PR: " + (data.error || "Unknown error"));
            }
        } catch (e: any) {
            alert("Error creating PR: " + e.message);
        } finally {
            setIsRaisingPR(false);
        }
    };

    if (!file) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-white/40">
                <svg className="w-12 h-12 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Select a file to view and comment</p>
            </div>
        );
    }

    const hasChanges = file.content !== editableCode;

    return (
        <div className="flex flex-col h-full">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-[#27272a] bg-[#0a0a0c]">
                <div className="flex items-center gap-4">
                    <h2 className="text-sm font-mono text-white/90 truncate flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate max-w-[300px]" title={file.path}>{file.path}</span>
                        {hasChanges && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="AI comments applied"></span>}
                    </h2>
                    
                    <div className="flex items-center gap-1 bg-[#18181b] p-0.5 rounded-lg border border-[#27272a]">
                        <button 
                            onClick={() => setMode("code")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "code" ? "bg-[#27272a] text-white shadow-sm" : "text-white/50 hover:text-white"}`}
                        >
                            Code
                        </button>
                        <button 
                            onClick={() => setMode("diff")}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "diff" ? "bg-[#27272a] text-white shadow-sm" : "text-white/50 hover:text-white"}`}
                        >
                            Diff
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {prUrl ? (
                        <a href={prUrl} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-md hover:bg-emerald-500/20 transition-all">
                            View PR ↗
                        </a>
                    ) : (
                        <button
                            onClick={handleRaisePR}
                            disabled={!hasChanges || isRaisingPR}
                            className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all flex items-center gap-2 ${
                                hasChanges && !isRaisingPR 
                                ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]" 
                                : "bg-white/5 text-white/30 cursor-not-allowed border border-white/5"
                            }`}
                        >
                            {isRaisingPR ? (
                                <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                    Creating PR…
                                </>
                            ) : "Raise PR"}
                        </button>
                    )}
                </div>
            </div>

            {/* Code Editor Area */}
            <div className="flex-1 min-h-0 relative bg-[#0a0a0c]">
                {mode === "code" ? (
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Syntax-highlighted background overlay */}
                        <div 
                            ref={preRef}
                            className="absolute inset-0 p-4 font-mono text-[13px] leading-relaxed overflow-hidden pointer-events-none whitespace-pre text-emerald-400"
                            style={{ tabSize: 4 }}
                        >
                            {editableCode}
                        </div>
                        {/* Transparent editable textarea on top */}
                        <textarea
                            ref={textareaRef}
                            value={editableCode}
                            onChange={(e) => setEditableCode(e.target.value)}
                            onScroll={handleScroll}
                            className="absolute inset-0 p-4 w-full h-full font-mono text-[13px] leading-relaxed bg-transparent text-transparent caret-white resize-none outline-none z-10 custom-scrollbar"
                            spellCheck="false"
                            style={{ tabSize: 4 }}
                        />
                    </div>
                ) : (
                    // Side-by-side Diff View: original vs AI-commented
                    <div className="absolute inset-0 overflow-hidden flex flex-col sm:flex-row">
                        <div className="flex-1 border-r border-[#27272a] flex flex-col h-full bg-[#18181b]/30">
                            <div className="text-xs font-mono font-medium text-white/40 p-2 border-b border-[#27272a] bg-[#0a0a0c]">Original</div>
                            <pre className="p-4 overflow-auto custom-scrollbar flex-1 font-mono text-[12px] text-white/70">
                                <code>{file.content}</code>
                            </pre>
                        </div>
                        <div className="flex-1 flex flex-col h-full bg-[#18181b]/10">
                            <div className="text-xs font-mono font-medium text-emerald-400/70 p-2 border-b border-[#27272a] bg-[#0a0a0c] flex items-center gap-2">
                                AI Commented
                                {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                            </div>
                            <pre className="p-4 overflow-auto custom-scrollbar flex-1 font-mono text-[12px] text-white/90">
                                <code>{editableCode}</code>
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
