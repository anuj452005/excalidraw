import { useRef, useEffect, useState } from 'react';
import { Canvas, PencilBrush } from 'fabric';
import './DrawingBlock.css';

interface DrawingBlockProps {
    content: { data: string | null };
    onChange: (content: { data: string | null }) => void;
}

const COLORS = [
    '#ffffff', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

export default function DrawingBlock({ content, onChange }: DrawingBlockProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<Canvas | null>(null);
    const [brushColor, setBrushColor] = useState('#ffffff');
    const [brushWidth, setBrushWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!canvasRef.current || fabricRef.current) return;

        const canvas = new Canvas(canvasRef.current, {
            isDrawingMode: true,
            backgroundColor: 'transparent',
            width: 800,
            height: 300,
        });

        const brush = new PencilBrush(canvas);
        brush.color = brushColor;
        brush.width = brushWidth;
        canvas.freeDrawingBrush = brush;

        fabricRef.current = canvas;

        // Load existing data if present
        if (content.data) {
            try {
                canvas.loadFromJSON(JSON.parse(content.data), () => {
                    canvas.renderAll();
                });
            } catch (e) {
                console.error('Failed to load drawing:', e);
            }
        }

        // Auto-save on path created
        canvas.on('path:created', () => {
            saveCanvas();
        });

        // Resize canvas to container
        const resizeCanvas = () => {
            if (containerRef.current && fabricRef.current) {
                const width = containerRef.current.clientWidth;
                fabricRef.current.setWidth(width);
                fabricRef.current.renderAll();
            }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            canvas.dispose();
            fabricRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (fabricRef.current && fabricRef.current.freeDrawingBrush) {
            const brush = fabricRef.current.freeDrawingBrush as PencilBrush;
            brush.color = isEraser ? 'transparent' : brushColor;
            brush.width = isEraser ? brushWidth * 3 : brushWidth;
        }
    }, [brushColor, brushWidth, isEraser]);

    const saveCanvas = () => {
        if (fabricRef.current) {
            const json = JSON.stringify(fabricRef.current.toJSON());
            onChange({ data: json });
        }
    };

    const clearCanvas = () => {
        if (fabricRef.current) {
            fabricRef.current.clear();
            fabricRef.current.backgroundColor = 'transparent';
            onChange({ data: null });
        }
    };

    const undo = () => {
        if (fabricRef.current) {
            const objects = fabricRef.current.getObjects();
            if (objects.length > 0) {
                fabricRef.current.remove(objects[objects.length - 1]);
                saveCanvas();
            }
        }
    };

    return (
        <div className="drawing-block-container" ref={containerRef}>
            <div className="drawing-toolbar">
                <div className="color-picker">
                    {COLORS.map((color) => (
                        <button
                            key={color}
                            className={`color-btn ${brushColor === color && !isEraser ? 'active' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                                setBrushColor(color);
                                setIsEraser(false);
                            }}
                        />
                    ))}
                </div>

                <div className="brush-size">
                    <label>Size:</label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={brushWidth}
                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                    />
                    <span>{brushWidth}px</span>
                </div>

                <div className="drawing-actions">
                    <button
                        className={`tool-btn ${isEraser ? 'active' : ''}`}
                        onClick={() => setIsEraser(!isEraser)}
                    >
                        🧹 Eraser
                    </button>
                    <button className="tool-btn" onClick={undo}>
                        ↩️ Undo
                    </button>
                    <button className="tool-btn danger" onClick={clearCanvas}>
                        🗑️ Clear
                    </button>
                </div>
            </div>

            <div className="canvas-wrapper">
                <canvas ref={canvasRef} />
            </div>
        </div>
    );
}
