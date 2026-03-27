"use client";

import { useEffect, useState, useMemo } from "react";

export interface FileTreeNode {
    path: string;
    name: string;
    type: "blob" | "tree";
    children?: FileTreeNode[];
}

interface FileTreeProps {
    connectionId: string | null;
    repo: { owner: string; repo: string; default_branch: string } | null;
    onRepoSelect: (repo: { owner: string; repo: string; default_branch: string } | null) => void;
    selectedFilePath?: string;
    onFileSelect: (path: string, content: string) => void;
    /** Called once the flat list of file paths has been loaded from the repo */
    onFilesLoaded?: (filePaths: string[]) => void;
}

export default function FileTree({ connectionId, repo, onRepoSelect, selectedFilePath, onFileSelect, onFilesLoaded }: FileTreeProps) {
    const [repos, setRepos] = useState<any[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);
    
    const [treeNodes, setTreeNodes] = useState<FileTreeNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(false);
    
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Fetch repos if no repo selected
    useEffect(() => {
        if (!connectionId || repo) return;

        let isMounted = true;
        setLoadingRepos(true);
        fetch(`/api/repos?connectionId=${encodeURIComponent(connectionId)}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setRepos(Array.isArray(data) ? data : []);
            })
            .catch(console.error)
            .finally(() => {
                if (isMounted) setLoadingRepos(false);
            });
            
        return () => { isMounted = false; };
    }, [connectionId, repo]);

    // Fetch tree if repo is selected
    useEffect(() => {
        if (!connectionId || !repo) {
            setTreeNodes([]);
            return;
        }

        let isMounted = true;
        setLoadingTree(true);
        fetch(`/api/file-content?connectionId=${encodeURIComponent(connectionId)}&owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.repo)}&branch=${encodeURIComponent(repo.default_branch)}&tree=true`)
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                if (data.tree) {
                    // Build nested structure
                    const flatTree = data.tree as { path: string; type: string }[];
                    const root: FileTreeNode[] = [];
                    const map = new Map<string, FileTreeNode>();
                    
                    flatTree.forEach(item => {
                        const parts = item.path.split("/");
                        const name = parts.pop()!;
                        const parentPath = parts.join("/");
                        
                        const node: FileTreeNode = {
                            path: item.path,
                            name,
                            type: item.type === "tree" ? "tree" : "blob",
                            ...(item.type === "tree" ? { children: [] } : {})
                        };
                        
                        map.set(item.path, node);
                        
                        if (parentPath === "") {
                            root.push(node);
                        } else {
                            const parent = map.get(parentPath);
                            if (parent && parent.children) {
                                parent.children.push(node);
                            }
                        }
                    });
                    
                    // Sort: folders first, then Alphabetical
                    const sortNodes = (nodes: FileTreeNode[]) => {
                        nodes.sort((a, b) => {
                            if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
                            return a.name.localeCompare(b.name);
                        });
                        nodes.forEach(n => {
                            if (n.children) sortNodes(n.children);
                        });
                    };
                    sortNodes(root);
                    setTreeNodes(root);
                    // Emit flat file list for @ mention picker
                    if (onFilesLoaded) {
                        const flatFiles = flatTree
                            .filter(item => item.type !== "tree")
                            .map(item => item.path);
                        onFilesLoaded(flatFiles);
                    }
                }
            })
            .catch(console.error)
            .finally(() => {
                if (isMounted) setLoadingTree(false);
            });
            
        return () => { isMounted = false; };
    }, [connectionId, repo]);

    const handleSelectRepo = (r: any) => {
        const parts = r.full_name.split("/");
        onRepoSelect({ owner: parts[0], repo: parts[1], default_branch: r.default_branch });
    };

    const handleSelectFile = async (path: string) => {
        if (!connectionId || !repo) return;
        
        try {
            const res = await fetch(`/api/file-content?connectionId=${encodeURIComponent(connectionId)}&owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.repo)}&path=${encodeURIComponent(path)}`);
            const data = await res.json();
            if (data.content !== undefined) {
                onFileSelect(path, data.content);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const toggleFolder = (path: string) => {
        const newSet = new Set(expandedFolders);
        if (newSet.has(path)) newSet.delete(path);
        else newSet.add(path);
        setExpandedFolders(newSet);
    };

    if (!repo) {
        return (
            <div className="flex flex-col h-full bg-[#0a0a0c]">
                <div className="p-4 border-b border-[#27272a]">
                    <h2 className="text-sm font-semibold text-white/90">Repositories</h2>
                </div>
                <div className="overflow-y-auto flex-1 p-2 custom-scrollbar">
                    {loadingRepos ? (
                        <div className="p-4 text-center text-sm text-white/40">Loading repos...</div>
                    ) : (
                        repos.map(r => (
                            <div 
                                key={r.full_name} 
                                onClick={() => handleSelectRepo(r)}
                                className="px-3 py-2 cursor-pointer hover:bg-white/5 rounded text-sm text-white/80 transition-colors truncate"
                            >
                                {r.full_name}
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    const renderTree = (nodes: FileTreeNode[], level = 0) => {
        return nodes.map(node => {
            const isFolder = node.type === "tree";
            const isExpanded = expandedFolders.has(node.path);
            const isSelected = selectedFilePath === node.path;
            
            return (
                <div key={node.path}>
                    <div 
                        onClick={() => isFolder ? toggleFolder(node.path) : handleSelectFile(node.path)}
                        className={`flex items-center group cursor-pointer hover:bg-white/5 py-1 px-2 rounded-sm text-[13px] transition-colors ${isSelected ? "bg-emerald-500/10 text-emerald-400" : "text-white/70"}`}
                        style={{ paddingLeft: `${level * 12 + 8}px` }}
                    >
                        <span className="w-5 shrink-0 flex items-center justify-center opacity-70 group-hover:opacity-100">
                            {isFolder ? (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isExpanded ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    )}
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            )}
                        </span>
                        <span className="truncate">{node.name}</span>
                    </div>
                    {isFolder && isExpanded && node.children && (
                        <div>
                            {renderTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
            <div className="p-3 border-b border-[#27272a] flex items-center gap-2">
                <button 
                    onClick={() => onRepoSelect(null)}
                    className="p-1 hover:bg-white/10 rounded-md text-white/50 hover:text-white transition-colors"
                    title="Back to repositories"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="truncate flex-1">
                    <h2 className="text-sm font-semibold text-white/90 truncate" title={repo.repo}>{repo.repo}</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest truncate">{repo.owner}</p>
                </div>
            </div>
            <div className="overflow-y-auto flex-1 px-1 py-2 custom-scrollbar">
                {loadingTree ? (
                    <div className="p-4 text-center text-sm text-white/40">Loading files...</div>
                ) : (
                    renderTree(treeNodes)
                )}
            </div>
        </div>
    );
}
