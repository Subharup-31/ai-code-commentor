'use client';

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-8 shadow-2xl text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">
                    All Set! 🎉
                </h1>

                <p className="text-gray-400 mb-8">
                    Your GitHub account has been successfully connected to VulnGuard AI.
                </p>

                <div className="bg-[#27272a] rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4">What's Next?</h2>
                    <div className="space-y-3 text-left">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📱</span>
                            <div>
                                <p className="text-white font-medium">Return to Telegram</p>
                                <p className="text-sm text-gray-400">Open the VulnGuard AI bot</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📂</span>
                            <div>
                                <p className="text-white font-medium">List Your Repos</p>
                                <p className="text-sm text-gray-400">Type <code className="bg-[#18181b] px-1 rounded">/repos</code></p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🔍</span>
                            <div>
                                <p className="text-white font-medium">Scan a Repository</p>
                                <p className="text-sm text-gray-400">Type <code className="bg-[#18181b] px-1 rounded">/scan owner/repo</code></p>
                            </div>
                        </div>
                    </div>
                </div>

                <a
                    href="https://t.me/VulnGuardAIBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.155.232.171.326.016.093.036.306.02.472z"/>
                    </svg>
                    Open Telegram Bot
                </a>

                <div className="mt-8 pt-6 border-t border-[#27272a]">
                    <p className="text-sm text-gray-500">
                        You can close this window anytime
                    </p>
                </div>
            </div>
        </div>
    );
}
