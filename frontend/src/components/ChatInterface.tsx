"use client";

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

interface ChatInterfaceProps {
    isWidget?: boolean;
}

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/VulnGuardAIBot';

// Helper to map Mastra tools to beautiful Sub-Agent UI
const getAgentInfo = (toolName: string) => {
    if (toolName.includes('Github') || toolName === 'listReposTool' || toolName === 'listRepos' || toolName === 'createPrTool' || toolName === 'createPr') {
        return {
            name: "GitHub Sub-Agent",
            color: "var(--color-accent-blue)",
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
            )
        };
    }
    if (toolName.includes('Notion') || toolName === 'updateNotionTool' || toolName === 'updateNotion') {
        return {
            name: "Notion Sub-Agent",
            color: "var(--color-text-primary)",
            icon: (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.247 2.3c-.42-.373-.93-.466-1.48-.466L3.85 2.74c-.467.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.886l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933zM2.726 1.54l13.728-.933c1.68-.14 2.1.093 2.8.606l3.87 2.706c.466.327.606.747.606 1.26v15.065c0 .886-.326 1.446-1.494 1.54l-15.457.933c-.84.046-1.26-.093-1.726-.7L1.52 17.594c-.56-.746-.793-1.306-.793-1.96V3.153c0-.84.374-1.54 2-1.614z" />
                </svg>
            )
        };
    }
    if (toolName.includes('scan') || toolName === 'scanRepoTool' || toolName === 'scanRepo') {
        return {
            name: "Scanner Sub-Agent",
            color: "var(--color-severity-critical)",
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            )
        };
    }
    return {
        name: "Utility Sub-Agent",
        color: "var(--color-text-secondary)",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.054-2.073.016-1.077.11-2.003.738-2.618 1.63L3.89 20.262M10.34 15.84c.688-.06 1.386-.054 2.073.016.51.052 1 .207 1.45.449m-3.523-2.016c-1.353-.194-2.733-.194-4.086 0-1.865.267-3.411 1.488-4.225 3.161M10.34 15.84l4.286-4.286M10.34 15.84l4.286-4.286m-4.286 4.286c-.51-.052-1-.205-1.45-.449m12.37-3.69c-1.076-.11-2.002-.738-2.617-1.63L16.11 3.738M20.11 8.262c-.688.06-1.386.054-2.073-.016m-4.286 4.286l4.286-4.286m-4.286 4.286c.51.052 1 .207 1.45.449" />
            </svg>
        )
    };
};

// Extract text content from a message's parts array
function getMessageText(m: any): string {
    if (Array.isArray(m.parts)) {
        return m.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text || '')
            .join('');
    }
    if (typeof m.content === 'string' && m.content) return m.content;
    return '';
}

// Extract tool invocations from message parts
function getToolInvocations(m: any): any[] {
    if (Array.isArray(m.parts)) {
        return m.parts
            .filter((p: any) => p.type === 'tool-invocation')
            .map((p: any) => p.toolInvocation || p);
    }
    if (Array.isArray(m.toolInvocations) && m.toolInvocations.length > 0) {
        return m.toolInvocations;
    }
    return [];
}

export default function ChatInterface({ isWidget = false }: ChatInterfaceProps = {}) {
    // Read from localStorage synchronously to avoid timing issues
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const connectionIdRef = useRef<string | null>(null);

    // Keep the ref in sync
    useEffect(() => {
        connectionIdRef.current = connectionId;
    }, [connectionId]);

    // Initialize connection and listen for changes
    useEffect(() => {
        setMounted(true);
        const storedId = localStorage.getItem("nango_connection_id");
        setConnectionId(storedId);

        const handleStorageChange = () => {
            const currentId = localStorage.getItem("nango_connection_id");
            setConnectionId(currentId);
        };
        window.addEventListener('github_connection_changed', handleStorageChange);
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('github_connection_changed', handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const transport = useMemo(
        () =>
            new TextStreamChatTransport({
                api: '/api/chat',
                body: () => ({ connectionId: connectionIdRef.current || connectionId || 'unconnected_user' }),
            }),
        [connectionId]
    );

    const [input, setInput] = useState('');

    const chat = useChat({
        transport,
        onError: (err: any) => {
            console.error("Chat error:", err);
            const errorMessage = err?.message || String(err);
            setMessages((prev: any) => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `⚠️ Error: ${errorMessage}. Please check your API keys and try again.`,
                parts: [{ type: 'text', text: `⚠️ Error: ${errorMessage}. Please check your API keys and try again.` }]
            }] as any);
        }
    } as any) as any;

    const { messages, setMessages, sendMessage, status } = chat;
    const isLoading = status === 'streaming' || status === 'submitted';

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }, []);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault?.();
        if (!input?.trim() || isLoading) return;
        const text = input.trim();
        setInput('');
        sendMessage({ text });
    }, [input, isLoading, sendMessage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleFormSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        handleSubmit(e);
    }, [handleSubmit]);

    const handleQuickAction = useCallback((text: string) => {
        if (isLoading) return;
        setInput('');
        sendMessage({ text });
    }, [isLoading, sendMessage]);

    return (
        <div className={`flex flex-col ${isWidget ? "h-[500px] w-[350px] sm:w-[400px]" : "h-full w-full"} mx-auto glass-card border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden bg-[rgba(10,14,26,0.5)] shadow-2xl relative`}>

            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.1)] relative"
                        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))" }}>
                        <svg className="w-6 h-6 text-[var(--color-accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--color-bg-card)] bg-[var(--color-severity-low)] animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">Master Orchestrator</h2>
                        <p className="text-xs text-[var(--color-text-secondary)]">Multi-Agent Control Hub</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Telegram Redirect Button */}
                    <a
                        href={TELEGRAM_BOT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(0,136,204,0.08)] border border-[rgba(0,136,204,0.2)] hover:bg-[rgba(0,136,204,0.15)] hover:border-[rgba(0,136,204,0.4)] transition-all group"
                        title="Chat on Telegram"
                    >
                        <svg className="w-3.5 h-3.5 text-[#0088cc] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#0088cc]">
                            Telegram
                        </span>
                    </a>
                    {/* Connection Status */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                        <div className={`w-1.5 h-1.5 rounded-full ${connectionId ? 'bg-[var(--color-severity-low)]' : 'bg-[var(--color-severity-high)]'}`} />
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-text-muted)]">
                            {connectionId ? 'Connected' : 'Read-Only'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar z-10">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade-in relative pt-12 pb-16">
                        {/* Empty State Node Map */}
                        <div className="relative w-full max-w-sm mx-auto mb-10 h-32 flex justify-center items-center">
                            <svg className="absolute inset-0 w-full h-full text-[rgba(255,255,255,0.05)] pointer-events-none" style={{ zIndex: 0 }}>
                                <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[pulse_3s_ease-in-out_infinite]" />
                                <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
                                <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[pulse_3s_ease-in-out_infinite_1s]" />
                            </svg>
                            <div className="absolute w-16 h-16 rounded-2xl flex items-center justify-center border border-[rgba(99,102,241,0.3)] shadow-[0_0_30px_rgba(99,102,241,0.2)] z-10"
                                style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1), rgba(139,92,246,0.1))", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                                <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </div>
                            <div className="absolute w-10 h-10 rounded-xl bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] flex items-center justify-center z-10"
                                style={{ top: "80%", left: "20%", transform: "translate(-50%, -50%)" }}>
                                {getAgentInfo('scanRepoTool').icon}
                            </div>
                            <div className="absolute w-10 h-10 rounded-xl bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center z-10"
                                style={{ top: "10%", left: "50%", transform: "translate(-50%, -50%)" }}>
                                {getAgentInfo('listReposTool').icon}
                            </div>
                            <div className="absolute w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center z-10"
                                style={{ top: "80%", left: "80%", transform: "translate(-50%, -50%)" }}>
                                {getAgentInfo('updateNotionTool').icon}
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-2">Orchestration Hub</h3>
                        <p className="text-[var(--color-text-secondary)] text-sm max-w-sm mx-auto leading-relaxed text-center">
                            I am your Master Agent. Send a message to orchestrate scans, manage GitHub PRs, and document findings to Notion.
                        </p>

                        <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm w-full opacity-60">
                            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-xs text-center cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleQuickAction("List my repositories")}>
                                &quot;List my repositories&quot;
                            </div>
                            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] text-xs text-center cursor-pointer hover:bg-[rgba(255,255,255,0.05)] transition-colors" onClick={() => handleQuickAction("Scan my main repo")}>
                                &quot;Scan my main repo&quot;
                            </div>
                        </div>
                    </div>
                ) : (
                    (messages || []).map((m: any) => {
                        const textContent = getMessageText(m);
                        const toolInvocations = getToolInvocations(m);

                        return (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                                {m.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.1)] mr-3 mt-1"
                                        style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))" }}>
                                        <svg className="w-4 h-4 text-[var(--color-accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                        </svg>
                                    </div>
                                )}

                                <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {textContent && (
                                        <div className={`rounded-2xl px-5 py-3 shadow-lg ${m.role === 'user'
                                            ? 'bg-gradient-to-br from-[var(--color-accent-purple)] to-[var(--color-accent-cyan)] text-white ml-12'
                                            : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[var(--color-text-primary)]'
                                            }`}>
                                            <div className="text-sm prose prose-invert max-w-none prose-p:my-1 prose-pre:bg-[rgba(0,0,0,0.3)] prose-pre:border prose-pre:border-[rgba(255,255,255,0.1)] prose-a:text-[var(--color-accent-cyan)] prose-a:no-underline hover:prose-a:underline whitespace-pre-wrap">
                                                {textContent}
                                            </div>
                                        </div>
                                    )}

                                    {toolInvocations.length > 0 && (
                                        <div className="flex flex-col gap-2 w-full mt-1">
                                            {toolInvocations.map((tool: any) => {
                                                const subAgent = getAgentInfo(tool.toolName);
                                                const isComplete = tool.state === 'result' || 'result' in tool;

                                                return (
                                                    <div key={tool.toolCallId} className={`flex flex-col gap-0 rounded-xl border overflow-hidden transition-all duration-500 ${isComplete ? 'border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]' : 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.05)] shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}>
                                                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]">
                                                            <div className="flex items-center justify-center w-6 h-6 rounded bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-[var(--color-accent-cyan)] shrink-0">
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                                </svg>
                                                            </div>
                                                            <div className="flex-1 h-px bg-[rgba(255,255,255,0.1)] relative overflow-hidden hidden sm:block">
                                                                {!isComplete && (
                                                                    <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)] to-transparent animate-[scan-progress_2s_ease-in-out_infinite]" />
                                                                )}
                                                                {isComplete && (
                                                                    <div className="absolute top-0 left-0 h-full w-full bg-[rgba(255,255,255,0.1)]" />
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline" style={{ color: subAgent.color }}>{subAgent.name}</span>
                                                                <div className="flex items-center justify-center w-6 h-6 rounded shrink-0 relative" style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.05), transparent)`, color: subAgent.color }}>
                                                                    {subAgent.icon}
                                                                    {!isComplete && (
                                                                        <div className="absolute inset-0 border border-current rounded opacity-50 animate-ping" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="px-4 py-3 flex items-start gap-3">
                                                            {!isComplete ? (
                                                                <>
                                                                    <svg className="w-4 h-4 animate-spin text-[var(--color-accent-cyan)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                    </svg>
                                                                    <p className="text-sm font-medium text-white">Delegating task to {subAgent.name}...</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-4 h-4 text-[var(--color-severity-low)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-[var(--color-text-secondary)]">Task completed by {subAgent.name}</p>
                                                                        <div className="mt-1.5 p-2 rounded bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.02)] max-w-full overflow-x-auto custom-scrollbar">
                                                                            <pre className="text-xs text-[var(--color-text-muted)] font-mono whitespace-pre-wrap word-break">
                                                                                {typeof tool.result === 'object' ? JSON.stringify(tool.result, null, 2).substring(0, 150) + (JSON.stringify(tool.result).length > 150 ? '...' : '') : String(tool.result || '').substring(0, 150)}
                                                                            </pre>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                    <div className="flex justify-start animate-fade-in pl-11">
                        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl px-5 py-3 shadow-lg">
                            <div className="flex gap-1.5 items-center h-5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-cyan)] animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-purple)] animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-blue)] animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)] z-10 backdrop-blur-md">
                <form onSubmit={handleFormSubmit} className="flex gap-3 max-w-3xl mx-auto">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-purple)] rounded-xl blur opacity-25 group-focus-within:opacity-50 transition-opacity" />
                        <input
                            className="relative w-full bg-[rgba(15,19,35,0.9)] border border-[rgba(255,255,255,0.1)] rounded-xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-[var(--color-accent-purple)] transition-all placeholder:text-[rgba(255,255,255,0.3)]"
                            value={input}
                            onChange={handleInputChange}
                            placeholder={connectionId ? "Ask the orchestrator to list repos, scan code, or create a PR..." : "Ask a question or connect GitHub for full features..."}
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !input || !input.trim()}
                        className="btn-gradient px-6 py-3.5 rounded-xl text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center shrink-0 min-w-[110px] transition-all"
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Wait...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>Send</span>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                </svg>
                            </div>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
