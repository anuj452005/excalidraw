import { useState, useEffect, useRef } from 'react';
import { pagesApi, blocksApi } from '../services/api';
import TextBlock from '../components/blocks/TextBlock';
import CodeBlock from '../components/blocks/CodeBlock';
import DrawingBlock from '../components/blocks/DrawingBlock';
import ImageBlock from '../components/blocks/ImageBlock';
import html2pdf from 'html2pdf.js';
import './CanvasEditor.css';

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

interface CanvasEditorProps {
    pageId: string | null;
}

export default function CanvasEditor({ pageId }: CanvasEditorProps) {
    const [page, setPage] = useState<Page | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (pageId) {
            loadPage();
        } else {
            setPage(null);
        }
    }, [pageId]);

    const loadPage = async () => {
        if (!pageId) return;
        setIsLoading(true);
        try {
            const response = await pagesApi.getById(pageId);
            setPage(response.data.page);
            setTitle(response.data.page.title);
        } catch (error) {
            console.error('Failed to load page:', error);
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

    const exportToPdf = async () => {
        if (!contentRef.current || !page) return;

        setIsExporting(true);
        try {
            const opt = {
                margin: 10,
                filename: `${page.title}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
            };

            await html2pdf().set(opt).from(contentRef.current).save();
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
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

        setPage({
            ...page,
            blocks: page.blocks.map(b =>
                b.id === blockId ? { ...b, content } : b
            )
        });

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

    if (!pageId) {
        return (
            <div className="canvas-empty">
                <div className="empty-icon">📝</div>
                <h2>Select or create a page</h2>
                <p>Choose a page from the sidebar or create a new one to start writing</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="canvas-loading">
                <div className="spinner"></div>
                Loading...
            </div>
        );
    }

    if (!page) {
        return (
            <div className="canvas-empty">
                <p>Page not found</p>
            </div>
        );
    }

    return (
        <div className="canvas-container">
            <header className="canvas-header">
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

                <div className="header-actions">
                    {isSaving && <span className="saving-indicator">Saving...</span>}
                    <button
                        onClick={exportToPdf}
                        disabled={isExporting}
                        className="export-btn"
                    >
                        {isExporting ? '📄...' : '📄 PDF'}
                    </button>
                </div>
            </header>

            <div className="canvas-content" ref={contentRef}>
                {page.blocks.map((block) => (
                    <div key={block.id} className="block-wrapper">
                        <div className="block-controls">
                            <span className="block-type-label">{block.type}</span>
                            <button onClick={() => deleteBlock(block.id)} className="block-delete-btn">
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

                <div className="add-block-bar">
                    <button onClick={() => addBlock('text')} className="add-btn">
                        📝 Text
                    </button>
                    <button onClick={() => addBlock('code')} className="add-btn">
                        💻 Code
                    </button>
                    <button onClick={() => addBlock('drawing')} className="add-btn">
                        🎨 Drawing
                    </button>
                    <button onClick={() => addBlock('image')} className="add-btn">
                        🖼️ Image
                    </button>
                </div>
            </div>
        </div>
    );
}
