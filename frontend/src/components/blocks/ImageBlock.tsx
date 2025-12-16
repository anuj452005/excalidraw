import { useState, useRef } from 'react';
import './ImageBlock.css';

interface ImageBlockProps {
    content: { url: string; localData?: string };
    onChange: (content: { url: string; localData?: string }) => void;
}

export default function ImageBlock({ content, onChange }: ImageBlockProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const imageUrl = content.url || content.localData;

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        setIsUploading(true);

        try {
            // First, store as base64 locally
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                onChange({ url: '', localData: base64 });
            };
            reader.readAsDataURL(file);

            // Upload to Cloudinary if credentials are available
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            if (cloudName && uploadPreset) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset);

                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                    { method: 'POST', body: formData }
                );

                if (response.ok) {
                    const data = await response.json();
                    onChange({ url: data.secure_url, localData: undefined });
                }
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                const file = items[i].getAsFile();
                if (file) {
                    handleFile(file);
                    break;
                }
            }
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };

    const removeImage = () => {
        onChange({ url: '', localData: undefined });
    };

    if (imageUrl) {
        return (
            <div className="image-block-preview">
                <img src={imageUrl} alt="Uploaded content" />
                <button className="remove-image-btn" onClick={removeImage}>
                    ✕ Remove
                </button>
                {content.localData && !content.url && (
                    <span className="local-badge">📱 Stored locally</span>
                )}
            </div>
        );
    }

    return (
        <div
            className={`image-block-upload ${dragActive ? 'drag-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onPaste={handlePaste}
            onClick={handleClick}
            tabIndex={0}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                style={{ display: 'none' }}
            />

            {isUploading ? (
                <div className="upload-status">
                    <div className="spinner"></div>
                    <p>Uploading...</p>
                </div>
            ) : (
                <>
                    <div className="upload-icon">🖼️</div>
                    <p className="upload-text">
                        Drop an image here, paste from clipboard, or click to upload
                    </p>
                </>
            )}
        </div>
    );
}
