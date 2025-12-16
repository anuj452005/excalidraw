import { useState, useEffect, useRef, useCallback } from 'react';
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

const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
    text: { width: 400, height: 150 },
    code: { width: 500, height: 350 },
    drawing: { width: 600, height: 400 },
    image: { width: 400, height: 300 }
};

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
    const [dragState, setDragState] = useState<{
        blockId: string;
        startX: number;
        startY: number;
        startPos: BlockPosition;
        mode: 'drag' | 'resize';
    } | null>(null);

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

    const getBlockPosition = useCallback((block: Block): BlockPosition => {
        const defaultSize = DEFAULT_SIZES[block.type] || DEFAULT_SIZES.text;
        return block.content?.position || {
            x: 100 + (block.orderIndex % 3) * 450,
            y: 100 + Math.floor(block.orderIndex / 3) * 280,
            width: defaultSize.width,
            height: defaultSize.height
        };
    }, []);

    const saveBlockPosition = async (blockId: string, position: BlockPosition) => {
        if (!page) return;

        const block = page.blocks.find(b => b.id === blockId);
        if (!block) return;

        const newContent = { ...block.content, position };

        try {
            await blocksApi.update(blockId, { content: newContent });
        } catch (error) {
            console.error('Failed to save block position:', error);
        }
    };

    const addBlock = async (type: Block['type']) => {
        if (!page) return;

        const size = DEFAULT_SIZES[type];
        const centerX = (-offset.x + (canvasRef.current?.clientWidth || 800) / 2) / scale - size.width / 2;
        const centerY = (-offset.y + (canvasRef.current?.clientHeight || 600) / 2) / scale - size.height / 2;

        const position: BlockPosition = {
            x: Math.round(centerX / GRID_SIZE) * GRID_SIZE,
            y: Math.round(centerY / GRID_SIZE) * GRID_SIZE,
            width: size.width,
            height: size.height
        };

        const baseContent = type === 'text' ? { text: '' } :
            type === 'code' ? { code: '// Write your code here\nconsole.log("Hello World!");', language: 'javascript', output: '' } :
                type === 'drawing' ? { data: null } :
                    { url: '', localData: undefined };

        try {
            const response = await blocksApi.create({
                pageId: page.id,
                type,
                content: { ...baseContent, position },
                orderIndex: page.blocks.length
            });

            const newBlock = response.data.block;
            setPage(prev => prev ? {
                ...prev,
                blocks: [...prev.blocks, newBlock]
            } : null);
            setSelectedBlock(newBlock.id);
        } catch (error) {
            console.error('Failed to add block:', error);
        }
    };

    const updateBlockContent = useCallback(async (blockId: string, newContent: any) => {
        if (!page) return;

        const block = page.blocks.find(b => b.id === blockId);
        if (!block) return;

        // Preserve position when updating content
        const currentPosition = block.content?.position;
        const mergedContent = {
            ...block.content,
            ...newContent,
            position: currentPosition // Always keep the current position
        };

        setPage(prev => prev ? {
            ...prev,
            blocks: prev.blocks.map(b =>
                b.id === blockId ? { ...b, content: mergedContent } : b
            )
        } : null);

        try {
            await blocksApi.update(blockId, { content: mergedContent });
        } catch (error) {
            console.error('Failed to update block:', error);
        }
    }, [page]);

    const deleteBlock = async (blockId: string, e: React.MouseEvent) => {
        // Prevent all parent handlers
        e.preventDefault();
        e.stopPropagation();

        if (!page) return;

        // Optimistically remove from UI first
        setPage(prev => prev ? {
            ...prev,
            blocks: prev.blocks.filter(b => b.id !== blockId)
        } : null);

        if (selectedBlock === blockId) {
            setSelectedBlock(null);
        }

        try {
            await blocksApi.delete(blockId);
        } catch (error) {
            console.error('Failed to delete block:', error);
            // Reload page on error to restore state
            loadPage();
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
        const target = e.target as HTMLElement;
        if (target === canvasRef.current || target.classList.contains('canvas-background')) {
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
            return;
        }

        if (dragState && page) {
            const block = page.blocks.find(b => b.id === dragState.blockId);
            if (!block) return;

            const dx = (e.clientX - dragState.startX) / scale;
            const dy = (e.clientY - dragState.startY) / scale;

            let newPosition: BlockPosition;

            if (dragState.mode === 'drag') {
                newPosition = {
                    ...dragState.startPos,
                    x: Math.round((dragState.startPos.x + dx) / GRID_SIZE) * GRID_SIZE,
                    y: Math.round((dragState.startPos.y + dy) / GRID_SIZE) * GRID_SIZE
                };
            } else {
                newPosition = {
                    ...dragState.startPos,
                    width: Math.max(200, Math.round((dragState.startPos.width + dx) / GRID_SIZE) * GRID_SIZE),
                    height: Math.max(100, Math.round((dragState.startPos.height + dy) / GRID_SIZE) * GRID_SIZE)
                };
            }

            // Update local state immediately
            setPage(prev => prev ? {
                ...prev,
                blocks: prev.blocks.map(b =>
                    b.id === dragState.blockId ? { ...b, content: { ...b.content, position: newPosition } } : b
                )
            } : null);
        }
    };

    const handleCanvasMouseUp = () => {
        if (dragState && page) {
            const block = page.blocks.find(b => b.id === dragState.blockId);
            if (block) {
                saveBlockPosition(dragState.blockId, getBlockPosition(block));
            }
        }
        setIsPanning(false);
        setDragState(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setScale(prev => Math.min(2, Math.max(0.25, prev * delta)));
        }
    };

    const handleBlockDragStart = (e: React.MouseEvent, blockId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const block = page?.blocks.find(b => b.id === blockId);
        if (!block) return;

        setSelectedBlock(blockId);
        setDragState({
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            startPos: getBlockPosition(block),
            mode: 'drag'
        });
    };

    const handleBlockResizeStart = (e: React.MouseEvent, blockId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const block = page?.blocks.find(b => b.id === blockId);
        if (!block) return;

        setDragState({
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            startPos: getBlockPosition(block),
            mode: 'resize'
        });
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
                    <button onClick={() => addBlock('text')} className="tool-btn" title="Add Text Block">
                        📝 Text
                    </button>
                    <button onClick={() => addBlock('code')} className="tool-btn" title="Add Code Block">
                        💻 Code
                    </button>
                    <button onClick={() => addBlock('drawing')} className="tool-btn" title="Add Drawing">
                        🎨 Draw
                    </button>
                    <button onClick={() => addBlock('image')} className="tool-btn" title="Add Image">
                        🖼️ Image
                    </button>
                    <div className="divider"></div>
                    <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="tool-btn zoom-btn">
                        +
                    </button>
                    <span className="zoom-level">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.max(0.25, s - 0.1))} className="tool-btn zoom-btn">
                        −
                    </button>
                    <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="tool-btn" title="Reset View">
                        ⟲
                    </button>
                    <div className="divider"></div>
                    <button onClick={exportToPdf} disabled={isExporting} className="export-btn">
                        {isExporting ? 'Exporting...' : '📄 Export PDF'}
                    </button>
                </div>

                {isSaving && <span className="saving-indicator">💾 Saving...</span>}
            </header>

            <div
                ref={canvasRef}
                className={`infinite-canvas ${isPanning ? 'panning' : ''} ${dragState ? 'dragging' : ''}`}
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
                                className={`canvas-block ${isSelected ? 'selected' : ''} block-type-${block.type}`}
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
                                    onMouseDown={(e) => handleBlockDragStart(e, block.id)}
                                >
                                    <span className="block-type-badge">{block.type.toUpperCase()}</span>
                                    <div className="block-actions">
                                        <button
                                            className="block-delete-btn"
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => deleteBlock(block.id, e)}
                                            title="Delete block"
                                        >
                                            🗑️
                                        </button>
                                    </div>
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
                                    onMouseDown={(e) => handleBlockResizeStart(e, block.id)}
                                    title="Resize"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
