"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/VulnGuardAIBot';

const navItems = [
    {
        label: "Code Commenter",
        href: "/dashboard/code-commenter",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
        ),
        description: "AI commenting",
    },
    {
        label: "Security Scan",
        href: "/dashboard",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        ),
        description: "Scan repositories",
    },
    {
        label: "Chat",
        href: "/dashboard/chat",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
        ),
        description: "AI Orchestrator",
    },
    {
        label: "Bug Detector",
        href: "/dashboard/bug-detector",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        description: "Sandbox analysis",
    },
    {
        label: "Integration",
        href: "/dashboard/integration",
        icon: (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z" />
            </svg>
        ),
        description: "Connect services",
    },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [hasConnection, setHasConnection] = useState<boolean | null>(null);

    useEffect(() => {
        const checkConnection = () => {
            setHasConnection(!!localStorage.getItem("nango_connection_id"));
        };

        checkConnection();

        // Listen to custom event for dynamic updates without page reload
        window.addEventListener('github_connection_changed', checkConnection);
        return () => window.removeEventListener('github_connection_changed', checkConnection);
    }, []);

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    // When checking connection state, don't show the layout structure to prevent flashing
    if (hasConnection === null) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#000000]">{children}</div>;
    }

    // Hide sidebar if GitHub is not connected
    if (!hasConnection) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#000000] max-w-7xl mx-auto p-6 md:p-12 w-full animate-fade-in">{children}</div>;
    }

    return (
        <div className="flex min-h-[calc(100vh-64px)] bg-[#000000] text-[var(--color-text-primary)]">
            {/* Sidebar */}
            <aside
                className={`sticky top-[64px] flex flex-col bg-[#000000] border-r border-[#27272a] z-40 overflow-hidden ${collapsed ? "w-[72px] min-w-[72px]" : "w-[260px] min-w-[260px]"}`}
                style={{ height: "calc(100vh - 64px)", transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
            >
                {/* Nav Items */}
                <nav className="flex-1 px-3 py-6 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors relative group ${active ? "bg-[#18181b] text-white" : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <div className={`flex items-center justify-center shrink-0 transition-colors ${active ? "text-white" : "text-[#71717a] group-hover:text-[#a1a1aa]"}`}>
                                    {item.icon}
                                </div>
                                {!collapsed && (
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className="text-[14px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Telegram Bot Link */}
                <div className="px-3 py-3 border-t border-[#27272a]">
                    <a
                        href={TELEGRAM_BOT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors relative group text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
                        title={collapsed ? "Telegram Bot" : undefined}
                    >
                        <div className="flex items-center justify-center shrink-0 text-[#71717a] group-hover:text-[#228be6] transition-colors">
                            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                        </div>
                        {!collapsed && (
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[14px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis">Telegram Bot</span>
                            </div>
                        )}
                        {!collapsed && (
                            <svg className="w-[14px] h-[14px] ml-auto text-[#71717a] group-hover:text-[#a1a1aa] transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                        )}
                    </a>
                </div>

                {/* Collapse Toggle */}
                <div className="px-3 py-3 border-t border-[#27272a]">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-transparent hover:bg-[#18181b] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <svg
                            className="w-[18px] h-[18px] transition-transform duration-200 shrink-0"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        {!collapsed && (
                            <span className="text-[13px] font-medium">Collapse</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 p-6 md:p-10 overflow-y-auto" style={{ height: "calc(100vh - 64px)" }}>
                <div className="max-w-[1200px] mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

