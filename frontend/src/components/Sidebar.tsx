import { useState, useEffect } from 'react';
import { foldersApi, pagesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface Page {
    id: string;
    title: string;
    updatedAt: string;
}

interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    pages: Page[];
    children: Folder[];
    _count: { children: number };
}

interface SidebarProps {
    onPageSelect: (pageId: string) => void;
    selectedPageId?: string;
}

export default function Sidebar({ onPageSelect, selectedPageId }: SidebarProps) {
    const { user, logout } = useAuth();
    const [folders, setFolders] = useState<Folder[]>([]);
    const [rootPages, setRootPages] = useState<Page[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [parentFolderId, setParentFolderId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [foldersRes, pagesRes] = await Promise.all([
                foldersApi.getAll(),
                pagesApi.getAll()
            ]);
            setFolders(foldersRes.data.folders || []);

            // Get pages not in any folder
            const allPages = pagesRes.data.pages || [];
            const pagesInFolders = new Set<string>();

            const collectPagesFromFolders = (folderList: Folder[]) => {
                folderList.forEach(folder => {
                    folder.pages.forEach(page => pagesInFolders.add(page.id));
                    if (folder.children) collectPagesFromFolders(folder.children);
                });
            };
            collectPagesFromFolders(foldersRes.data.folders || []);

            setRootPages(allPages.filter((p: Page) => !pagesInFolders.has(p.id)));
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const createFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await foldersApi.create({
                name: newFolderName.trim(),
                parentId: parentFolderId || undefined
            });
            setNewFolderName('');
            setIsCreatingFolder(false);
            setParentFolderId(null);
            loadData();
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
    };

    const deleteFolder = async (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this folder? Pages inside will be moved to root.')) return;

        try {
            await foldersApi.delete(folderId);
            loadData();
        } catch (error) {
            console.error('Failed to delete folder:', error);
        }
    };

    const createPage = async (folderId?: string) => {
        try {
            const response = await pagesApi.create({ title: 'Untitled' });
            const newPage = response.data.page;

            if (folderId) {
                await foldersApi.movePage(newPage.id, folderId);
            }

            loadData();
            onPageSelect(newPage.id);
        } catch (error) {
            console.error('Failed to create page:', error);
        }
    };

    const deletePage = async (pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this page?')) return;

        try {
            await pagesApi.delete(pageId);
            loadData();
        } catch (error) {
            console.error('Failed to delete page:', error);
        }
    };

    const renderFolder = (folder: Folder, depth = 0) => {
        const isExpanded = expandedFolders.has(folder.id);

        return (
            <div key={folder.id} className="folder-item" style={{ marginLeft: depth * 16 }}>
                <div className="folder-header" onClick={() => toggleFolder(folder.id)}>
                    <span className="folder-icon">{isExpanded ? '📂' : '📁'}</span>
                    <span className="folder-name">{folder.name}</span>
                    <div className="folder-actions">
                        <button onClick={() => { setParentFolderId(folder.id); setIsCreatingFolder(true); }} title="Add subfolder">
                            📁+
                        </button>
                        <button onClick={() => createPage(folder.id)} title="Add page">
                            📄+
                        </button>
                        <button onClick={(e) => deleteFolder(folder.id, e)} title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>

                {isExpanded && (
                    <div className="folder-contents">
                        {folder.children?.map(child => renderFolder(child, depth + 1))}
                        {folder.pages?.map(page => (
                            <div
                                key={page.id}
                                className={`page-item ${selectedPageId === page.id ? 'selected' : ''}`}
                                onClick={() => onPageSelect(page.id)}
                                style={{ marginLeft: (depth + 1) * 16 }}
                            >
                                <span className="page-icon">📄</span>
                                <span className="page-name">{page.title}</span>
                                <button className="delete-btn" onClick={(e) => deletePage(page.id, e)}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>📝 BlockNote</h2>
                <div className="user-info">
                    <span>{user?.username}</span>
                    <button onClick={logout} title="Logout">🚪</button>
                </div>
            </div>

            <div className="sidebar-actions">
                <button onClick={() => createPage()} className="new-page-btn">
                    + New Page
                </button>
                <button onClick={() => setIsCreatingFolder(true)} className="new-folder-btn">
                    + New Folder
                </button>
            </div>

            {isCreatingFolder && (
                <div className="new-folder-input">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                        autoFocus
                    />
                    <button onClick={createFolder}>✓</button>
                    <button onClick={() => { setIsCreatingFolder(false); setParentFolderId(null); }}>✕</button>
                </div>
            )}

            <div className="sidebar-content">
                {folders.map(folder => renderFolder(folder))}

                {rootPages.length > 0 && (
                    <div className="root-pages">
                        {folders.length > 0 && <div className="divider">Pages</div>}
                        {rootPages.map(page => (
                            <div
                                key={page.id}
                                className={`page-item ${selectedPageId === page.id ? 'selected' : ''}`}
                                onClick={() => onPageSelect(page.id)}
                            >
                                <span className="page-icon">📄</span>
                                <span className="page-name">{page.title}</span>
                                <button className="delete-btn" onClick={(e) => deletePage(page.id, e)}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
