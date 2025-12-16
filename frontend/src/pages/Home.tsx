import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { pagesApi } from '../services/api';
import './Home.css';

interface Page {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    _count: { blocks: number };
}

export default function Home() {
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newTitle, setNewTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            const response = await pagesApi.getAll();
            setPages(response.data.pages);
        } catch (error) {
            console.error('Failed to load pages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        setIsCreating(true);
        try {
            const response = await pagesApi.create({ title: newTitle.trim() });
            navigate(`/page/${response.data.page.id}`);
        } catch (error) {
            console.error('Failed to create page:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeletePage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this page?')) return;

        try {
            await pagesApi.delete(id);
            setPages(pages.filter(p => p.id !== id));
        } catch (error) {
            console.error('Failed to delete page:', error);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="home-container">
            <header className="home-header">
                <div className="header-left">
                    <h1>📝 My Notes</h1>
                </div>
                <div className="header-right">
                    <span className="user-name">@{user?.username}</span>
                    <button onClick={logout} className="logout-btn">Logout</button>
                </div>
            </header>

            <main className="home-main">
                <section className="create-section">
                    <form onSubmit={handleCreatePage} className="create-form">
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Create a new page..."
                            className="create-input"
                        />
                        <button type="submit" className="create-btn" disabled={isCreating || !newTitle.trim()}>
                            {isCreating ? 'Creating...' : '+ New Page'}
                        </button>
                    </form>
                </section>

                <section className="pages-section">
                    {isLoading ? (
                        <div className="loading">Loading your pages...</div>
                    ) : pages.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📄</div>
                            <h2>No pages yet</h2>
                            <p>Create your first page to get started!</p>
                        </div>
                    ) : (
                        <div className="pages-grid">
                            {pages.map((page) => (
                                <div key={page.id} className="page-card" onClick={() => navigate(`/page/${page.id}`)}>
                                    <div className="page-card-header">
                                        <h3>{page.title}</h3>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeletePage(page.id);
                                            }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="page-card-meta">
                                        <span className="block-count">{page._count.blocks} blocks</span>
                                        <span className="page-date">{formatDate(page.updatedAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
