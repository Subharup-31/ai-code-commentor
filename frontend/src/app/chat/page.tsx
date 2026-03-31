import ChatInterface from "@/components/ChatInterface";

export default function ChatPage() {
    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 py-12 md:py-20 animate-fade-in text-white pt-16">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-black mb-4">
                    AI <span className="gradient-text">Orchestrator</span>
                </h1>
                <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl mx-auto">
                    Chat with your Master Agent to coordinate code scans, manage GitHub, and document findings to Notion.
                </p>
            </div>

            <div className="w-full">
                <ChatInterface />
            </div>
        </div>
    );
}
