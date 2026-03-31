'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Nango from '@nangohq/frontend';

function ConnectContent() {
    const searchParams = useSearchParams();
    const tgId = searchParams.get('tg_id');

    const [status, setStatus] = useState<'loading' | 'ready' | 'connecting' | 'success' | 'error'>('loading');
    const [error, setError] = useState<string>('');
    const [nango, setNango] = useState<Nango | null>(null);

    useEffect(() => {
        if (!tgId) {
            setStatus('error');
            setError('Missing Telegram ID. Please start from the Telegram bot.');
            return;
        }

        // Initialize Nango
        const initNango = async () => {
            try {
                // Get connect session token from backend
                const response = await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegramId: tgId }),
                });

                if (!response.ok) {
                    throw new Error('Failed to create session');
                }

                const { connectSessionToken } = await response.json();

                // Initialize Nango with the session token
                const nangoInstance = new Nango({ connectSessionToken });
                setNango(nangoInstance);
                setStatus('ready');
            } catch (err: any) {
                console.error('Failed to initialize Nango:', err);
                setStatus('error');
                setError(err.message || 'Failed to initialize connection');
            }
        };

        initNango();
    }, [tgId]);

    const handleConnectGitHub = async () => {
        if (!nango || !tgId) return;

        setStatus('connecting');
        setError('');

        try {
            // Initiate OAuth flow with Telegram ID as connection ID
            const result = await nango.auth('github-getting-started', `tg_${tgId}`);

            if (result) {
                // OAuth successful, notify backend
                const response = await fetch('/api/auth/callback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        telegramId: tgId,
                        connectionId: `tg_${tgId}`,
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to complete connection');
                }

                const data = await response.json();
                setStatus('success');

                // Redirect to success page or show success message
                setTimeout(() => {
                    window.location.href = '/connect/success';
                }, 2000);
            }
        } catch (err: any) {
            console.error('OAuth error:', err);
            setStatus('error');
            setError(err.message || 'Failed to connect GitHub account');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-8 shadow-2xl">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-white text-center mb-2">
                    Connect GitHub
                </h1>
                <p className="text-gray-400 text-center mb-8">
                    Link your GitHub account to VulnGuard AI
                </p>

                {status === 'loading' && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        <p className="text-gray-400 mt-4">Initializing...</p>
                    </div>
                )}

                {status === 'ready' && (
                    <div>
                        <div className="bg-[#27272a] rounded-lg p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-gray-300">
                                    <p className="font-medium mb-1">What we'll access:</p>
                                    <ul className="list-disc list-inside space-y-1 text-gray-400">
                                        <li>Read your repositories</li>
                                        <li>Create pull requests</li>
                                        <li>Read repository contents</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConnectGitHub}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                            Connect with GitHub
                        </button>
                    </div>
                )}

                {status === 'connecting' && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        <p className="text-gray-400 mt-4">Connecting to GitHub...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Connected Successfully!</h2>
                        <p className="text-gray-400">You can now return to Telegram and start using the bot.</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Connection Failed</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-[#27272a] text-center">
                    <p className="text-sm text-gray-500">
                        Secured by Nango OAuth
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ConnectPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-8 shadow-2xl flex flex-col items-center py-16">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="text-gray-400 mt-4">Loading...</p>
                </div>
            </div>
        }>
            <ConnectContent />
        </Suspense>
    );
}
