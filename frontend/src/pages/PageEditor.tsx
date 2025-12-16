import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pagesApi, blocksApi } from '../services/api';
import TextBlock from '../components/blocks/TextBlock';
import CodeBlock from '../components/blocks/CodeBlock';
import DrawingBlock from '../components/blocks/DrawingBlock';
import ImageBlock from '../components/blocks/ImageBlock';
import './PageEditor.css';

interface Block {
    id: string;
    pageId: string;
    type: 'text' | 'code' | 'drawing' | 'image';
    content: any;
    orderIndex: number;
}

interface Page {
    id: string;
    title: string;
    blocks: Block[];
}

export default function PageEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [page, setPage] = useState<Page | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (id) {
            loadPage();
        }
    }, [id]);

    const loadPage = async () => {
        try {
            const response = await pagesApi.getById(id!);
            setPage(response.data.page);
            setTitle(response.data.page.title);
        } catch (error) {
            console.error('Failed to load page:', error);
            navigate('/');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTitleSave = async () => {
        if (!title.trim() || !page) return;

        setIsSaving(true);
        try {
            await pagesApi.update(page.id, { title: title.trim() });
            setPage({ ...page, title: title.trim() });
            setEditingTitle(false);
        } catch (error) {
            console.error('Failed to update title:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const addBlock = async (type: Block['type']) => {
        if (!page) return;

        try {
            const orderIndex = page.blocks.length;
            const content = type === 'text' ? { text: '' } :
                type === 'code' ? { code: '', language: 'javascript', output: '' } :
                    type === 'drawing' ? { data: null } :
                        { url: '', localData: undefined };

            const response = await blocksApi.create({
                pageId: page.id,
                type,
                content,
                orderIndex
            });

            setPage({
                ...page,
                blocks: [...page.blocks, response.data.block]
            });
        } catch (error) {
            console.error('Failed to add block:', error);
        }
    };

    const updateBlock = async (blockId: string, content: any) => {
        if (!page) return;

        // Update local state immediately
        setPage({
            ...page,
            blocks: page.blocks.map(b =>
                b.id === blockId ? { ...b, content } : b
            )
        });

        // Save to backend
        try {
            await blocksApi.update(blockId, { content });
        } catch (error) {
            console.error('Failed to update block:', error);
        }
    };

    const deleteBlock = async (blockId: string) => {
        if (!page) return;

        try {
            await blocksApi.delete(blockId);
            setPage({
                ...page,
                blocks: page.blocks.filter(b => b.id !== blockId)
            });
        } catch (error) {
            console.error('Failed to delete block:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="editor-loading">
                <div className="spinner"></div>
                Loading page...
            </div>
        );
    }

    if (!page) {
        return (
            <div className="editor-error">
                Page not found
            </div>
        );
    }

    return (
        <div className="editor-container">
            <header className="editor-header">
                <button onClick={() => navigate('/')} className="back-btn">
                    ← Back
                </button>
                <div className="title-area">
                    {editingTitle ? (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                            autoFocus
                            className="title-input"
                        />
                    ) : (
                        <h1 onClick={() => setEditingTitle(true)} className="page-title">
                            {page.title}
                        </h1>
                    )}
                </div>
                {isSaving && <span className="saving-indicator">Saving...</span>}
            </header>

            <main className="editor-main">
                <div className="blocks-container">
                    {page.blocks.map((block) => (
                        <div key={block.id} className="block-wrapper">
                            <div className="block-controls">
                                <span className="block-type-label">{block.type}</span>
                                <button
                                    onClick={() => deleteBlock(block.id)}
                                    className="block-delete-btn"
                                >
                                    🗑️
                                </button>
                            </div>

                            {block.type === 'text' && (
                                <TextBlock
                                    content={block.content}
                                    onChange={(content) => updateBlock(block.id, content)}
                                />
                            )}

                            {block.type === 'code' && (
                                <CodeBlock
                                    content={block.content}
                                    onChange={(content) => updateBlock(block.id, content)}
                                />
                            )}

                            {block.type === 'drawing' && (
                                <DrawingBlock
                                    content={block.content}
                                    onChange={(content) => updateBlock(block.id, content)}
                                />
                            )}

                            {block.type === 'image' && (
                                <ImageBlock
                                    content={block.content}
                                    onChange={(content) => updateBlock(block.id, content)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="add-block-section">
                    <p>Add block:</p>
                    <div className="block-buttons">
                        <button onClick={() => addBlock('text')} className="block-type-btn">
                            📝 Text
                        </button>
                        <button onClick={() => addBlock('code')} className="block-type-btn">
                            💻 Code
                        </button>
                        <button onClick={() => addBlock('drawing')} className="block-type-btn">
                            🎨 Drawing
                        </button>
                        <button onClick={() => addBlock('image')} className="block-type-btn">
                            🖼️ Image
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
