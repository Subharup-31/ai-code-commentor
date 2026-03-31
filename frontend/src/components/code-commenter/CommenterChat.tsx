"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseAndApplyComments } from "@/lib/code-utils";
// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant";
type ChatPhase = "idle" | "planning" | "awaiting_proceed" | "executing" | "done";

interface Message {
    role: MessageRole;
    content: string;
    isPlan?: boolean;   // marks it as the planning card
    isCode?: boolean;   // marks it as the live code output
}

interface CommenterChatProps {
    file: { path: string; content: string } | null;
    repo: { owner: string; repo: string } | null;
    connectionId: string | null;
    availableFiles: string[];             // flat list of repo file paths
    onCodeUpdate: (newCode: string) => void;
    onFileRequest: (path: string) => void; // ask parent to load & select this file
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract @filename mentions and map to full paths */
function resolveAtMention(input: string, availableFiles: string[]): string | null {
    const match = input.match(/@([\w.\-/]+)/);
    if (!match) return null;
    const token = match[1].toLowerCase();
    return availableFiles.find(f => f.toLowerCase().endsWith(token) || f.toLowerCase().includes(token)) ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommenterChat({
    file,
    repo,
    connectionId,
    availableFiles,
    onCodeUpdate,
    onFileRequest,
}: CommenterChatProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hi! Type **@filename** to target a file, then describe what you want — e.g. *@main.py add comments to all functions*.",
        },
    ]);
    const [input, setInput] = useState("");
    const [phase, setPhase] = useState<ChatPhase>("idle");

    // @ mention picker state
    const [showPicker, setShowPicker] = useState(false);
    const [pickerQuery, setPickerQuery] = useState("");
    const [pickerHighlight, setPickerHighlight] = useState(0);

    // Pending plan context (kept for the Proceed step)
    const pendingPlan = useRef<{ filePath: string; fileContent: string; userPrompt: string } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── @ picker filtering ──────────────────────────────────────────────────

    const filteredFiles = useCallback(() => {
        if (!pickerQuery) return availableFiles.slice(0, 12);
        const q = pickerQuery.toLowerCase();
        return availableFiles
            .filter(f => f.toLowerCase().includes(q))
            .slice(0, 12);
    }, [availableFiles, pickerQuery]);

    // Handle input change: detect @ and drive picker
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);

        const atIndex = val.lastIndexOf("@");
        if (atIndex !== -1) {
            const afterAt = val.slice(atIndex + 1);
            // Only show picker if the text after @ has no spaces (still typing filename)
            if (!afterAt.includes(" ")) {
                setPickerQuery(afterAt);
                setPickerHighlight(0);
                setShowPicker(true);
                return;
            }
        }
        setShowPicker(false);
    };

    const selectFileFromPicker = (filePath: string) => {
        const filename = filePath.split("/").pop() ?? filePath;
        // Replace everything after the last @ with the chosen filename
        const atIndex = input.lastIndexOf("@");
        const before = atIndex !== -1 ? input.slice(0, atIndex) : input;
        setInput(`${before}@${filename} `);
        setShowPicker(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showPicker) return;
        const files = filteredFiles();
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setPickerHighlight(h => Math.min(h + 1, files.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setPickerHighlight(h => Math.max(h - 1, 0));
        } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            if (files[pickerHighlight]) selectFileFromPicker(files[pickerHighlight]);
        } else if (e.key === "Escape") {
            setShowPicker(false);
        }
    };

    // ── Phase 1: Generate Plan ──────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming() || phase === "awaiting_proceed") return;

        const userMsg = input.trim();
        setInput("");
        setShowPicker(false);

        // Resolve which file to use
        const resolvedPath = resolveAtMention(userMsg, availableFiles);
        let targetFile = file;

        // If user mentioned a different file via @, load it first
        if (resolvedPath && resolvedPath !== file?.path) {
            onFileRequest(resolvedPath);
            setMessages(prev => [
                ...prev,
                { role: "user", content: userMsg },
                { role: "assistant", content: `Loading **${resolvedPath}**…` },
            ]);
            // We'll wait for the file to load via the `file` prop update (effect below handles it)
            pendingPlan.current = { filePath: resolvedPath, fileContent: "", userPrompt: userMsg };
            setPhase("planning");
            return;
        }

        if (!targetFile) {
            setMessages(prev => [
                ...prev,
                { role: "user", content: userMsg },
                { role: "assistant", content: "Please select a file first (or use **@filename** to pick one)." },
            ]);
            return;
        }

        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        await generatePlan(targetFile.path, targetFile.content, userMsg);
    };

    // When a new file loads (because user typed @filename), generate the plan
    useEffect(() => {
        if (
            phase === "planning" &&
            pendingPlan.current &&
            file &&
            file.path === pendingPlan.current.filePath &&
            pendingPlan.current.fileContent === ""
        ) {
            pendingPlan.current.fileContent = file.content;
            generatePlan(file.path, file.content, pendingPlan.current.userPrompt);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file]);

    const generatePlan = async (filePath: string, fileContent: string, userPrompt: string) => {
        setPhase("planning");
        setMessages(prev => {
            // Replace loading message if present, otherwise append
            const clone = [...prev];
            const lastIdx = clone.length - 1;
            if (clone[lastIdx]?.content.startsWith("Loading ")) {
                clone[lastIdx] = { role: "assistant", content: "Thinking up a plan…" };
            } else {
                clone.push({ role: "assistant", content: "Thinking up a plan…" });
            }
            return clone;
        });

        try {
            const res = await fetch("/api/code-commenter-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ filePath, fileContent, userPrompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const plan: string = data.plan;

            // Store for execution phase
            pendingPlan.current = { filePath, fileContent, userPrompt };

            setMessages(prev => {
                const clone = [...prev];
                clone[clone.length - 1] = {
                    role: "assistant",
                    content: plan,
                    isPlan: true,
                };
                return clone;
            });
            setPhase("awaiting_proceed");
        } catch (err: any) {
            setMessages(prev => {
                const clone = [...prev];
                clone[clone.length - 1] = { role: "assistant", content: "Error: " + err.message };
                return clone;
            });
            setPhase("idle");
        }
    };

    // ── Phase 2: Execute & stream code ────────────────────────────────────

    const handleProceed = async () => {
        if (!pendingPlan.current || phase !== "awaiting_proceed") return;

        const { filePath, fileContent, userPrompt } = pendingPlan.current;
        setPhase("executing");

        setMessages(prev => [
            ...prev,
            { role: "assistant", content: "", isCode: true },
        ]);

        try {
            const res = await fetch("/api/code-commenter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    connectionId,
                    filePath,
                    fileContent,
                    prompt: userPrompt,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (reader) {
                let accumulated = "";
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    accumulated += decoder.decode(value, { stream: true });

                    // Stream into code viewer live
                    const mergedCode = parseAndApplyComments(fileContent, accumulated);
                    onCodeUpdate(mergedCode);

                    // Update the code bubble in chat
                    setMessages(prev => {
                        const clone = [...prev];
                        const lastIdx = clone.length - 1;
                        clone[lastIdx] = { ...clone[lastIdx], content: accumulated };
                        return clone;
                    });
                }
                const finalMergedCode = parseAndApplyComments(fileContent, accumulated);
                onCodeUpdate(finalMergedCode); // final flush
            }

            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "✅ Comments applied to the code! Switch to **Diff** view to compare, then hit **Raise PR** to push to GitHub.",
                },
            ]);
            setPhase("done");
        } catch (err: any) {
            setMessages(prev => {
                const clone = [...prev];
                clone[clone.length - 1] = { ...clone[clone.length - 1], content: "Error: " + err.message };
                return clone;
            });
            setPhase("idle");
        }
    };

    const handleCancel = () => {
        pendingPlan.current = null;
        setPhase("idle");
        setMessages(prev => [
            ...prev,
            { role: "assistant", content: "No problem! Ask me anything else." },
        ]);
    };

    const isStreaming = () => phase === "planning" || phase === "executing";

    // ── Render ──────────────────────────────────────────────────────────────

    const renderMessageContent = (m: Message, idx: number) => {
        if (m.isCode) {
            return (
                <div className="font-mono text-[11px] text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto custom-scrollbar">
                    {m.content ? m.content : (
                        <span className="flex gap-1 items-center h-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </span>
                    )}
                </div>
            );
        }

        // Render simple markdown-ish: **bold**, *italic*, bullet points
        const rendered = m.content
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/\n•/g, "\n<span class='text-violet-400'>•</span>")
            .replace(/\n/g, "<br/>");

        return <span dangerouslySetInnerHTML={{ __html: rendered }} />;
    };

    const files = filteredFiles();

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
            {/* Header */}
            <div className="p-3 border-b border-[#27272a] flex items-center gap-2 shrink-0">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h2 className="text-sm font-semibold text-white/90">AI Assistant</h2>
                {isStreaming() && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-violet-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                        {phase === "planning" ? "Planning…" : "Applying comments…"}
                    </span>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                            className={`px-4 py-2.5 rounded-2xl max-w-[92%] text-sm leading-relaxed ${
                                m.role === "user"
                                    ? "bg-violet-500 text-white rounded-tr-sm"
                                    : m.isCode
                                    ? "bg-[#0d1f17] border border-emerald-500/20 text-white/90 rounded-tl-sm w-full"
                                    : m.isPlan
                                    ? "bg-[#18181b] border border-violet-500/30 text-white/90 rounded-tl-sm"
                                    : "bg-[#18181b] border border-[#27272a] text-white/90 rounded-tl-sm"
                            }`}
                        >
                            {m.isCode && (
                                <div className="text-[10px] text-emerald-400/60 font-mono mb-1.5 uppercase tracking-widest">
                                    ↳ Streaming into code viewer…
                                </div>
                            )}
                            {renderMessageContent(m, i)}
                        </div>

                        {/* Proceed / Cancel buttons appear below the plan card */}
                        {m.isPlan && phase === "awaiting_proceed" && i === messages.length - 1 && (
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={handleProceed}
                                    className="px-4 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition-all shadow-[0_0_12px_-2px_rgba(16,185,129,0.5)]"
                                >
                                    ✓ Proceed
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#27272a] bg-[#0a0a0c] shrink-0">
                {!repo ? (
                    <div className="text-xs text-center text-white/40 pb-2">Select a repository to get started.</div>
                ) : (
                    <div className="relative">
                        {/* @ File Picker Dropdown */}
                        {showPicker && files.length > 0 && (
                            <div className="absolute bottom-full mb-2 left-0 w-full bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden shadow-2xl z-50 max-h-52 overflow-y-auto custom-scrollbar">
                                <div className="px-3 py-1.5 border-b border-[#27272a] text-[10px] text-white/30 uppercase tracking-widest">
                                    Pick a file
                                </div>
                                {files.map((f, idx) => (
                                    <button
                                        key={f}
                                        onMouseDown={(e) => { e.preventDefault(); selectFileFromPicker(f); }}
                                        className={`w-full text-left px-3 py-2 text-xs font-mono truncate transition-colors ${
                                            idx === pickerHighlight
                                                ? "bg-violet-500/20 text-violet-300"
                                                : "text-white/70 hover:bg-white/5"
                                        }`}
                                    >
                                        <span className="text-violet-400 mr-1">@</span>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="relative flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                onBlur={() => setTimeout(() => setShowPicker(false), 150)}
                                placeholder={
                                    phase === "awaiting_proceed"
                                        ? "Review the plan above, then click Proceed…"
                                        : file
                                        ? `@${file.path.split("/").pop()} add comments…`
                                        : "Type @ to pick a file…"
                                }
                                disabled={isStreaming() || phase === "awaiting_proceed"}
                                className="w-full bg-[#18181b] border border-[#27272a] rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isStreaming() || phase === "awaiting_proceed"}
                                className="absolute right-2 p-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-50 disabled:bg-white/10 transition-colors"
                            >
                                {isStreaming() ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                )}
                            </button>
                        </form>

                        {/* Hint row */}
                        <div className="flex items-center gap-3 mt-1.5 px-1">
                            <span className="text-[10px] text-white/20">
                                Type <kbd className="bg-white/10 rounded px-1 font-mono">@</kbd> to mention a file
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
