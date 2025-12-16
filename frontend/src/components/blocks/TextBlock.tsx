import { useState, useEffect, useRef } from 'react';
import './TextBlock.css';

interface TextBlockProps {
    content: { text: string };
    onChange: (content: { text: string }) => void;
}

export default function TextBlock({ content, onChange }: TextBlockProps) {
    const [text, setText] = useState(content.text || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        setText(content.text || '');
    }, [content.text]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [text]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setText(newText);

        // Debounced save (2 seconds after last keystroke)
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            onChange({ text: newText });
        }, 2000);
    };

    const handleBlur = () => {
        // Save immediately on blur
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        onChange({ text });
    };

    // Basic keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault();
                wrapSelection('**');
            } else if (e.key === 'i') {
                e.preventDefault();
                wrapSelection('*');
            }
        }
    };

    const wrapSelection = (wrapper: string) => {
        if (!textareaRef.current) return;

        const { selectionStart, selectionEnd } = textareaRef.current;
        const before = text.substring(0, selectionStart);
        const selected = text.substring(selectionStart, selectionEnd);
        const after = text.substring(selectionEnd);

        const newText = `${before}${wrapper}${selected}${wrapper}${after}`;
        setText(newText);

        // Restore cursor position
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = selectionStart + wrapper.length;
                textareaRef.current.selectionEnd = selectionEnd + wrapper.length;
                textareaRef.current.focus();
            }
        }, 0);
    };

    return (
        <div className="text-block-container">
            <textarea
                ref={textareaRef}
                className="text-block-input"
                value={text}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Start writing... (Ctrl+B for bold, Ctrl+I for italic)"
                rows={3}
            />
            <div className="text-block-hint">
                Markdown shortcuts: **bold**, *italic*
            </div>
        </div>
    );
}
