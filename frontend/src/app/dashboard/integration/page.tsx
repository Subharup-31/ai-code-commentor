"use client";

import { useState, useEffect } from "react";
import Nango from "@nangohq/frontend";

export default function IntegrationPage() {
    const [githubConnected, setGithubConnected] = useState(false);
    const [notionConnected, setNotionConnected] = useState(false);
    const [loadingNotion, setLoadingNotion] = useState(false);

    useEffect(() => {
        const ghId = localStorage.getItem("nango_connection_id");
        if (ghId) setGithubConnected(true);

        const notionId = localStorage.getItem("nango_notion_connection_id");
        if (notionId || process.env.NEXT_PUBLIC_NOTION_OVERRIDE === 'true') setNotionConnected(true);
    }, []);

    const handleConnectNotion = async () => {
        setLoadingNotion(true);
        try {
            const storedConnectionId = localStorage.getItem("nango_connection_id");
            const connectionId = storedConnectionId || `user-${Math.random().toString(36).substring(2, 10)}`;

            // Fetch session token from backend
            const tokenResponse = await fetch("/api/nango/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connectionId }),
            });

            if (!tokenResponse.ok) throw new Error("Failed to generate session token");

            const { connectSessionToken } = await tokenResponse.json();
            const nango = new Nango({ connectSessionToken });

            const result = await nango.auth("notion");
            const nangoConnectionId = result.connectionId || connectionId;
            localStorage.setItem("nango_notion_connection_id", nangoConnectionId);
            setNotionConnected(true);
        } catch (error) {
            console.error("Notion auth error:", error);
            alert("Failed to connect Notion. Please try again.");
        } finally {
            setLoadingNotion(false);
        }
    };

    const handleDisconnectNotion = () => {
        localStorage.removeItem("nango_notion_connection_id");
        setNotionConnected(false);
    };

    const integrations = [
        {
            name: "GitHub",
            description: "Connect your repositories to scan for vulnerabilities and manage pull requests.",
            icon: (
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
            ),
            connected: githubConnected,
            color: "#24292F",
            accentColor: "var(--color-text-primary)",
            onConnect: () => {
                // Redirect to scan page to connect GitHub
                window.location.href = "/dashboard";
            },
            onDisconnect: () => {
                localStorage.removeItem("nango_connection_id");
                setGithubConnected(false);
                window.dispatchEvent(new Event('github_connection_changed'));
            },
        },
        {
            name: "Notion",
            description: "Export vulnerability reports and scan findings directly to your Notion workspace.",
            icon: (
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.247 2.3c-.42-.373-.93-.466-1.48-.466L3.85 2.74c-.467.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.886l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.453-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.513.28-.886.747-.933zM2.726 1.54l13.728-.933c1.68-.14 2.1.093 2.8.606l3.87 2.706c.466.327.606.747.606 1.26v15.065c0 .886-.326 1.446-1.494 1.54l-15.457.933c-.84.046-1.26-.093-1.726-.7L1.52 17.594c-.56-.746-.793-1.306-.793-1.96V3.153c0-.84.374-1.54 2-1.614z" />
                </svg>
            ),
            connected: notionConnected,
            color: "#000000",
            accentColor: "var(--color-text-primary)",
            onConnect: handleConnectNotion,
            onDisconnect: handleDisconnectNotion,
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black mb-2">
                    <span className="gradient-text">Integrations</span>
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm">
                    Connect your tools and services to supercharge VulnGuard AI.
                </p>
            </div>

            {/* Integration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration, i) => (
                    <div
                        key={integration.name}
                        className="glass-card p-6 animate-fade-in relative overflow-hidden"
                        style={{ animationDelay: `${i * 0.1}s` }}
                    >
                        {/* Status indicator */}
                        <div className="absolute top-4 right-4">
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${integration.connected
                                ? "bg-[rgba(34,197,94,0.15)] text-[var(--color-severity-low)] border border-[rgba(34,197,94,0.3)]"
                                : "bg-[rgba(100,116,139,0.15)] text-[var(--color-text-muted)] border border-[rgba(100,116,139,0.2)]"
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${integration.connected ? "bg-[var(--color-severity-low)] animate-pulse" : "bg-[var(--color-text-muted)]"
                                    }`} />
                                {integration.connected ? "Connected" : "Not connected"}
                            </div>
                        </div>

                        {/* Icon */}
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                            style={{
                                background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))`,
                                color: integration.accentColor,
                            }}>
                            {integration.icon}
                        </div>

                        {/* Info */}
                        <h3 className="text-xl font-bold mb-2">{integration.name}</h3>
                        <p className="text-[var(--color-text-secondary)] text-sm mb-6 leading-relaxed">
                            {integration.description}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                            {integration.connected ? (
                                <>
                                    <button
                                        disabled
                                        className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm bg-[rgba(34,197,94,0.1)] text-[var(--color-severity-low)] border border-[rgba(34,197,94,0.2)] cursor-default flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Connected
                                    </button>
                                    <button
                                        onClick={integration.onDisconnect}
                                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-severity-critical)] hover:bg-[rgba(239,68,68,0.1)] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(239,68,68,0.3)] transition-all"
                                    >
                                        Disconnect
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={integration.onConnect}
                                    disabled={integration.name === "Notion" && loadingNotion}
                                    className="flex-1 btn-gradient px-6 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {integration.name === "Notion" && loadingNotion ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                                            </svg>
                                            Connect {integration.name}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Footer */}
            <div className="mt-8 glass-card p-5 border border-[rgba(6,182,212,0.1)] bg-[rgba(6,182,212,0.03)]">
                <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-[var(--color-accent-cyan)] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">Secure Connections</p>
                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                            All integrations use OAuth 2.0 via Nango. Your credentials are never stored on our servers — tokens are securely managed through Nango&apos;s encrypted vault.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
