"use client";

import { useState, useEffect, useCallback } from "react";
import FileTree from "@/components/code-commenter/FileTree";
import CodeViewer from "@/components/code-commenter/CodeViewer";
import CommenterChat from "@/components/code-commenter/CommenterChat";

export default function CodeCommenterPage() {
    const [connectionId, setConnectionId] = useState<string | null>(null);
    const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string; default_branch: string } | null>(null);
    const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null);
    const [commentedCode, setCommentedCode] = useState<string | null>(null);
    // Flat list of all file paths in the repo — fed to CommenterChat for @ mention picker
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);

    // Check Nango connection on mount
    useEffect(() => {
        const id = localStorage.getItem("nango_connection_id");
        if (id) setConnectionId(id);
    }, []);

    // When a new file is selected from the tree (or via @ mention), clear previous AI output
    const handleFileSelect = (path: string, content: string) => {
        setSelectedFile({ path, content });
        setCommentedCode(null);
    };

    // CommenterChat asks us to load a file (via @ mention)
    const handleFileRequest = useCallback(async (filePath: string) => {
        if (!connectionId || !selectedRepo) return;
        try {
            const res = await fetch(
                `/api/file-content?connectionId=${encodeURIComponent(connectionId)}&owner=${encodeURIComponent(selectedRepo.owner)}&repo=${encodeURIComponent(selectedRepo.repo)}&path=${encodeURIComponent(filePath)}`
            );
            const data = await res.json();
            if (data.content !== undefined) {
                setSelectedFile({ path: filePath, content: data.content });
                setCommentedCode(null);
            }
        } catch (err) {
            console.error("Failed to load file via @mention:", err);
        }
    }, [connectionId, selectedRepo]);

    // Clear file list when repo changes
    const handleRepoSelect = (repo: { owner: string; repo: string; default_branch: string } | null) => {
        setSelectedRepo(repo);
        setAvailableFiles([]);
        setSelectedFile(null);
        setCommentedCode(null);
    };

    if (!connectionId) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4 font-heading">GitHub Connection Required</h2>
                    <p className="text-[var(--color-text-secondary)] mb-6">
                        Please connect your GitHub account from the Security Scan tab first.
                    </p>
                    <a href="/dashboard" className="px-6 py-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors font-medium border border-emerald-500/20">
                        Go to Connect
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-140px)] w-full overflow-hidden flex flex-col pt-2 pb-6">
            <div className="mb-4">
                <h1 className="text-2xl font-heading font-black tracking-tight">AI Code Commenter</h1>
                <p className="text-[var(--color-text-secondary)] text-sm mt-1">
                    Select a repository, choose a file, and chat with AI to generate comprehensive comments.
                </p>
            </div>
            
            <div className="flex-1 grid grid-cols-[280px_1fr_320px] gap-4 min-h-0">
                {/* Left Panel: File Tree */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col min-h-0 shadow-lg shadow-black/20 relative">
                    <FileTree 
                        connectionId={connectionId} 
                        repo={selectedRepo}
                        onRepoSelect={handleRepoSelect}
                        selectedFilePath={selectedFile?.path}
                        onFileSelect={handleFileSelect}
                        onFilesLoaded={setAvailableFiles}
                    />
                </div>

                {/* Center Panel: Code Viewer — receives live AI output */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col min-h-0 shadow-lg shadow-black/20">
                    <CodeViewer 
                        file={selectedFile}
                        repo={selectedRepo}
                        connectionId={connectionId}
                        commentedCode={commentedCode}
                    />
                </div>

                {/* Right Panel: AI Chat */}
                <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden flex flex-col min-h-0 shadow-lg shadow-black/20">
                    <CommenterChat 
                        file={selectedFile} 
                        repo={selectedRepo}
                        connectionId={connectionId}
                        availableFiles={availableFiles}
                        onCodeUpdate={setCommentedCode}
                        onFileRequest={handleFileRequest}
                    />
                </div>
            </div>
        </div>
    );
}
