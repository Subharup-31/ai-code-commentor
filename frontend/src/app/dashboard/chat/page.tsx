"use client";

import ChatInterface from "@/components/ChatInterface";

export default function DashboardChatPage() {
    return (
        <div className="h-full flex flex-col animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-black mb-2">
                    AI <span className="gradient-text">Orchestrator</span>
                </h1>
                <p className="text-[var(--color-text-secondary)] text-sm">
                    Chat with your Master Agent to coordinate scans, manage GitHub, and document findings to Notion.
                </p>
            </div>

            {/* Chat — full height */}
            <div className="flex-1 min-h-0">
                <ChatInterface />
            </div>
        </div>
    );
}
