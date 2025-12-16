import { useState, useEffect, useRef } from 'react';
import { pagesApi, blocksApi } from '../services/api';
import TextBlock from './blocks/TextBlock';
import CodeBlock from './blocks/CodeBlock';
import DrawingBlock from './blocks/DrawingBlock';
import ImageBlock from './blocks/ImageBlock';
import html2pdf from 'html2pdf.js';
import './InfiniteCanvas.css';

interface BlockPosition {
    x: number;
    y: number;
    width: number;
    height: number;
}

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

interface InfiniteCanvasProps {
    pageId: string | null;
}

const DEFAULT_BLOCK_SIZE = { width: 400, height: 200 };
const GRID_SIZE = 20;

export default function InfiniteCanvas({ pageId }: InfiniteCanvasProps) {
    const [page, setPage] = useState<Page | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [title, setTitle] = useState('');
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [draggingBlock, setDraggingBlock] = useState<string | null>(null);
    const [resizingBlock, setResizingBlock] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLDivElement>(null);
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

    const getBlockPosition = (block: Block): BlockPosition => {
        return block.content?.position || {
            x: 100 + (block.orderIndex % 3) * 450,
            y: 100 + Math.floor(block.orderIndex / 3) * 250,
            width: DEFAULT_BLOCK_SIZE.width,
            height: DEFAULT_BLOCK_SIZE.height
        };
    };

    const updateBlockPosition = async (blockId: string, position: Partial<BlockPosition>) => {
        if (!page) return;

        const block = page.blocks.find(b => b.id === blockId);
        if (!block) return;

        const currentPos = getBlockPosition(block);
        const newPosition = { ...currentPos, ...position };

        const newContent = { ...block.content, position: newPosition };

        setPage({
            ...page,
            blocks: page.blocks.map(b =>
                b.id === blockId ? { ...b, content: newContent } : b
            )
        });

        try {
            await blocksApi.update(blockId, { content: newContent });
        } catch (error) {
            console.error('Failed to update block position:', error);
        }
    };

    const addBlock = async (type: Block['type']) => {
        if (!page) return;

        // Calculate center position
        const centerX = (-offset.x + (canvasRef.current?.clientWidth || 800) / 2) / scale - DEFAULT_BLOCK_SIZE.width / 2;
        const centerY = (-offset.y + (canvasRef.current?.clientHeight || 600) / 2) / scale - DEFAULT_BLOCK_SIZE.height / 2;

        const position: BlockPosition = {
            x: Math.round(centerX / GRID_SIZE) * GRID_SIZE,
            y: Math.round(centerY / GRID_SIZE) * GRID_SIZE,
            width: DEFAULT_BLOCK_SIZE.width,
            height: type === 'drawing' ? 350 : DEFAULT_BLOCK_SIZE.height
        };

        const baseContent = type === 'text' ? { text: '' } :
            type === 'code' ? { code: '', language: 'javascript', output: '' } :
                type === 'drawing' ? { data: null } :
                    { url: '', localData: undefined };

        try {
            const response = await blocksApi.create({
                pageId: page.id,
                type,
                content: { ...baseContent, position },
                orderIndex: page.blocks.length
            });

            setPage({
                ...page,
                blocks: [...page.blocks, response.data.block]
            });
            setSelectedBlock(response.data.block.id);
        } catch (error) {
            console.error('Failed to add block:', error);
        }
    };

    const updateBlockContent = async (blockId: string, newContent: any) => {
        if (!page) return;

        const block = page.blocks.find(b => b.id === blockId);
        if (!block) return;

        const mergedContent = { ...block.content, ...newContent };

        setPage({
            ...page,
            blocks: page.blocks.map(b =>
                b.id === blockId ? { ...b, content: mergedContent } : b
            )
        });

        try {
            await blocksApi.update(blockId, { content: mergedContent });
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
            if (selectedBlock === blockId) {
                setSelectedBlock(null);
            }
        } catch (error) {
            console.error('Failed to delete block:', error);
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
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
            };
            await html2pdf().set(opt).from(contentRef.current).save();
        } catch (error) {
            console.error('PDF export failed:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Canvas pan handlers
    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            setSelectedBlock(null);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            setOffset({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
        }

        if (draggingBlock && page) {
            const block = page.blocks.find(b => b.id === draggingBlock);
            if (block) {
                const pos = getBlockPosition(block);
                const dx = (e.clientX - dragStart.x) / scale;
                const dy = (e.clientY - dragStart.y) / scale;
                updateBlockPosition(draggingBlock, {
                    x: Math.round((pos.x + dx) / GRID_SIZE) * GRID_SIZE,
                    y: Math.round((pos.y + dy) / GRID_SIZE) * GRID_SIZE
                });
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        }

        if (resizingBlock && page) {
            const block = page.blocks.find(b => b.id === resizingBlock);
            if (block) {
                const pos = getBlockPosition(block);
                const dx = (e.clientX - dragStart.x) / scale;
                const dy = (e.clientY - dragStart.y) / scale;
                updateBlockPosition(resizingBlock, {
                    width: Math.max(200, pos.width + dx),
                    height: Math.max(100, pos.height + dy)
                });
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        }
    };

    const handleCanvasMouseUp = () => {
        setIsPanning(false);
        setDraggingBlock(null);
        setResizingBlock(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(prev => Math.min(2, Math.max(0.25, prev * delta)));
        }
    };

    const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        setSelectedBlock(blockId);
        setDraggingBlock(blockId);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleResizeMouseDown = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        setResizingBlock(blockId);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    if (!pageId) {
        return (
            <div className="canvas-empty">
                <div className="empty-icon">📝</div>
                <h2>Select or create a page</h2>
                <p>Choose a page from the sidebar to start editing</p>
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
        return <div className="canvas-empty"><p>Page not found</p></div>;
    }

    return (
        <div className="infinite-canvas-container">
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

                <div className="toolbar">
                    <button onClick={() => addBlock('text')} className="tool-btn" title="Add Text">
                        📝
                    </button>
                    <button onClick={() => addBlock('code')} className="tool-btn" title="Add Code">
                        💻
                    </button>
                    <button onClick={() => addBlock('drawing')} className="tool-btn" title="Add Drawing">
                        🎨
                    </button>
                    <button onClick={() => addBlock('image')} className="tool-btn" title="Add Image">
                        🖼️
                    </button>
                    <div className="divider"></div>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="tool-btn" title="Zoom In">
                        🔍+
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.max(0.25, s - 0.1))} className="tool-btn" title="Zoom Out">
                        🔍-
                    </button>
                    <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="tool-btn" title="Reset View">
                        ⌂
                    </button>
                    <div className="divider"></div>
                    <button onClick={exportToPdf} disabled={isExporting} className="export-btn">
                        {isExporting ? '...' : '📄 PDF'}
                    </button>
                </div>

                {isSaving && <span className="saving-indicator">Saving...</span>}
            </header>

            <div
                ref={canvasRef}
                className="infinite-canvas"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleWheel}
            >
                <div className="canvas-background" />
                <div
                    ref={contentRef}
                    className="canvas-content"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        transformOrigin: '0 0'
                    }}
                >
                    {page.blocks.map((block) => {
                        const pos = getBlockPosition(block);
                        const isSelected = selectedBlock === block.id;

                        return (
                            <div
                                key={block.id}
                                className={`canvas-block ${isSelected ? 'selected' : ''}`}
                                style={{
                                    left: pos.x,
                                    top: pos.y,
                                    width: pos.width,
                                    height: pos.height
                                }}
                                onClick={(e) => { e.stopPropagation(); setSelectedBlock(block.id); }}
                            >
                                <div
                                    className="block-drag-handle"
                                    onMouseDown={(e) => handleBlockMouseDown(e, block.id)}
                                >
                                    <span className="block-type-badge">{block.type}</span>
                                    <button
                                        className="block-delete-btn"
                                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="block-content">
                                    {block.type === 'text' && (
                                        <TextBlock
                                            content={block.content}
                                            onChange={(content) => updateBlockContent(block.id, content)}
                                        />
                                    )}
                                    {block.type === 'code' && (
                                        <CodeBlock
                                            content={block.content}
                                            onChange={(content) => updateBlockContent(block.id, content)}
                                        />
                                    )}
                                    {block.type === 'drawing' && (
                                        <DrawingBlock
                                            content={block.content}
                                            onChange={(content) => updateBlockContent(block.id, content)}
                                        />
                                    )}
                                    {block.type === 'image' && (
                                        <ImageBlock
                                            content={block.content}
                                            onChange={(content) => updateBlockContent(block.id, content)}
                                        />
                                    )}
                                </div>

                                <div
                                    className="resize-handle"
                                    onMouseDown={(e) => handleResizeMouseDown(e, block.id)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
