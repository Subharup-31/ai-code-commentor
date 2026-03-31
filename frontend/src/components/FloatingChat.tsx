"use client";

import { useState } from "react";
import ChatInterface from "./ChatInterface";

export default function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 shadow-2xl rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[rgba(10,14,26,0.95)] backdrop-blur-xl animate-fade-in origin-bottom-right">
                    <ChatInterface isWidget={true} />
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all btn-gradient"
                aria-label="Toggle Chat"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
