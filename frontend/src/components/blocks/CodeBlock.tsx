import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import './CodeBlock.css';

interface CodeBlockProps {
    content: { code: string; language: string; output?: string };
    onChange: (content: { code: string; language: string; output?: string }) => void;
}

const LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'c', label: 'C' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
];

// Piston API language mapping
const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
    javascript: { language: 'javascript', version: '18.15.0' },
    typescript: { language: 'typescript', version: '5.0.3' },
    python: { language: 'python', version: '3.10.0' },
    java: { language: 'java', version: '15.0.2' },
    cpp: { language: 'cpp', version: '10.2.0' },
    c: { language: 'c', version: '10.2.0' },
    csharp: { language: 'csharp', version: '6.12.0' },
    go: { language: 'go', version: '1.16.2' },
    rust: { language: 'rust', version: '1.68.2' },
    ruby: { language: 'ruby', version: '3.0.1' },
    php: { language: 'php', version: '8.2.3' },
};

export default function CodeBlock({ content, onChange }: CodeBlockProps) {
    const [code, setCode] = useState(content.code || '');
    const [language, setLanguage] = useState(content.language || 'javascript');
    const [output, setOutput] = useState(content.output || '');
    const [isRunning, setIsRunning] = useState(false);
    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        setCode(content.code || '');
        setLanguage(content.language || 'javascript');
        setOutput(content.output || '');
    }, [content]);

    const handleCodeChange = (value: string | undefined) => {
        const newCode = value || '';
        setCode(newCode);

        // Debounced save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            onChange({ code: newCode, language, output });
        }, 2000);
    };

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);
        onChange({ code, language: newLanguage, output });
    };

    const runCode = async () => {
        if (!code.trim()) return;

        setIsRunning(true);
        setOutput('Running...');

        try {
            const pistonLang = PISTON_LANGUAGES[language];
            if (!pistonLang) {
                setOutput(`Language "${language}" is not supported for execution.`);
                return;
            }

            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    language: pistonLang.language,
                    version: pistonLang.version,
                    files: [{ content: code }],
                }),
            });

            const result = await response.json();

            if (result.run) {
                const outputText = result.run.output || result.run.stderr || 'No output';
                setOutput(outputText);
                onChange({ code, language, output: outputText });
            } else if (result.message) {
                setOutput(`Error: ${result.message}`);
            }
        } catch (error) {
            setOutput(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="code-block-container">
            <div className="code-block-header">
                <select
                    value={language}
                    onChange={handleLanguageChange}
                    className="language-select"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.label}
                        </option>
                    ))}
                </select>
                <button
                    onClick={runCode}
                    disabled={isRunning || !code.trim()}
                    className="run-button"
                >
                    {isRunning ? '⏳ Running...' : '▶ Run'}
                </button>
            </div>

            <div className="code-editor-wrapper">
                <Editor
                    height="200px"
                    language={language}
                    value={code}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                    }}
                />
            </div>

            {output && (
                <div className="code-output">
                    <div className="output-header">Output:</div>
                    <pre className="output-content">{output}</pre>
                </div>
            )}
        </div>
    );
}
