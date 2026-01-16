import { useState, useEffect, useRef } from 'react';
import { GitBranch, Sparkles, Loader2, Download, RefreshCw, AlertCircle, ImageIcon } from 'lucide-react';
import mermaid from 'mermaid';
import { saveDiagram, getLastDiagram } from '../lib/activityService';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = import.meta.env.VITE_HUGGINGFACE_API_KEY;

// Gemini models to try in order
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
];

interface DiagramsTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

export default function DiagramsTab({ userId, context, hasContext }: DiagramsTabProps) {
    const [diagramCode, setDiagramCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [loadingStatus, setLoadingStatus] = useState('');
    const diagramRef = useRef<HTMLDivElement>(null);
    const [diagramKey, setDiagramKey] = useState(0);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Load saved diagram on mount
    useEffect(() => {
        async function loadSaved() {
            if (userId) {
                const saved = await getLastDiagram(userId);
                if (saved) {
                    setDiagramCode(saved);
                }
            }
            setIsInitialLoad(false);
        }
        loadSaved();
    }, [userId]);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'loose',
            theme: 'default', // Use default theme for better compatibility
            flowchart: {
                curve: 'basis',
                padding: 15,
                htmlLabels: true,
                useMaxWidth: true
            }
        });
    }, []);

    useEffect(() => {
        if (diagramCode && diagramRef.current) {
            renderDiagram();
        }
    }, [diagramCode, diagramKey]);

    const renderDiagram = async () => {
        if (!diagramCode || !diagramRef.current) {
            console.log('[Diagram] Missing code or ref');
            return;
        }

        const element = diagramRef.current;

        try {
            // Clear previous content
            element.innerHTML = '';

            // Create a container div with the mermaid code
            const container = document.createElement('div');
            container.className = 'mermaid';
            container.textContent = diagramCode;
            element.appendChild(container);

            // Run mermaid on the container
            await mermaid.run({
                nodes: [container],
                suppressErrors: false
            });

            console.log('[Diagram] Mermaid.run() completed');

            // Style the resulting SVG
            const svg = element.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = 'auto';
                svg.style.minHeight = '300px';
                svg.style.maxWidth = '100%';
                console.log('[Diagram] SVG styled successfully');
            } else {
                console.warn('[Diagram] No SVG found after mermaid.run()');
            }
        } catch (err: any) {
            console.error('[Diagram] Render error:', err);

            // Try fallback: direct HTML injection
            try {
                const id = `mermaid-fallback-${Date.now()}`;
                const { svg } = await mermaid.render(id, diagramCode);
                if (svg) {
                    element.innerHTML = svg;
                    const svgEl = element.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.width = '100%';
                        svgEl.style.height = 'auto';
                        svgEl.style.minHeight = '300px';
                    }
                    console.log('[Diagram] Fallback render succeeded');
                }
            } catch (fallbackErr) {
                console.error('[Diagram] Fallback also failed:', fallbackErr);
                setError('Could not render diagram. Please try regenerating.');
            }
        }
    };

    const handleGenerateDiagram = async () => {
        if (!context) {
            alert('Please upload a document first!');
            return;
        }
        setIsLoading(true);
        setError('');
        setDiagramCode('');
        setDiagramKey(prev => prev + 1);

        try {
            setLoadingStatus('Analyzing content...');
            const code = await generateProfessionalDiagram();
            setDiagramCode(code);
            // Save to database
            if (userId && code) {
                await saveDiagram(userId, code);
            }
        } catch (err: any) {
            console.error('Diagram generation error:', err);
            setError(err.message || 'Failed to generate diagram');
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const generateProfessionalDiagram = async (): Promise<string> => {
        setLoadingStatus('Creating professional flowchart...');

        const prompt = `Create a clean Mermaid.js flowchart for this educational content.

CONTENT:
${context.slice(0, 2500)}

STRICT RULES:
1. Start with: flowchart TD
2. Use ONLY these node formats:
   - A[Text] for rectangles
   - B(Text) for rounded
   - C{Text} for diamonds
   - D((Text)) for circles
3. Keep ALL labels SHORT (2-4 words max)
4. Use simple connections: A --> B or A -->|label| B
5. Maximum 8-10 nodes
6. NO special characters in labels (no quotes, colons, parentheses inside)
7. NO subgraphs

OUTPUT ONLY valid Mermaid code. Nothing else.

Example:
flowchart TD
    A((Start)) --> B[Main Topic]
    B --> C[Concept One]
    B --> D[Concept Two]
    C --> E{Decision}
    D --> E
    E --> F[Result]`;

        let mermaidCode = '';

        // Try OpenRouter first
        if (OPENROUTER_API_KEY) {
            try {
                console.log('[Diagram] Trying OpenRouter...');
                setLoadingStatus('Trying OpenRouter...');
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': window.location.origin,
                    },
                    body: JSON.stringify({
                        model: 'allenai/molmo-2-8b:free',
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 800,
                        temperature: 0.2
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    mermaidCode = data.choices?.[0]?.message?.content || '';
                    if (mermaidCode) {
                        console.log('[Diagram] OpenRouter success');
                    }
                } else if (response.status === 429) {
                    console.warn('[Diagram] OpenRouter rate limited');
                }
            } catch (e) {
                console.warn('[Diagram] OpenRouter failed:', e);
            }
        }

        // Fallback to Gemini - try multiple models
        if (!mermaidCode && GEMINI_API_KEY) {
            for (const model of GEMINI_MODELS) {
                try {
                    console.log(`[Diagram] Trying Gemini ${model}...`);
                    setLoadingStatus(`Trying ${model}...`);

                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        mermaidCode = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                        if (mermaidCode) {
                            console.log(`[Diagram] ✅ Success with ${model}`);
                            break;
                        }
                    } else if (response.status === 429) {
                        console.warn(`[Diagram] Rate limit on ${model}, trying next...`);
                        continue;
                    } else {
                        const errData = await response.json();
                        console.warn(`[Diagram] ${model} error:`, errData.error?.message);
                        continue;
                    }
                } catch (e) {
                    console.warn(`[Diagram] ${model} failed:`, e);
                    continue;
                }
            }
        }

        // Ultimate fallback: HuggingFace
        if (!mermaidCode && HUGGINGFACE_API_KEY) {
            try {
                console.log('[Diagram] Trying HuggingFace fallback...');
                setLoadingStatus('Trying HuggingFace...');

                const response = await fetch(
                    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            inputs: prompt,
                            parameters: {
                                max_new_tokens: 500,
                                temperature: 0.3,
                            }
                        })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data[0]?.generated_text) {
                        mermaidCode = data[0].generated_text;
                        console.log('[Diagram] ✅ HuggingFace success');
                    }
                }
            } catch (e) {
                console.warn('[Diagram] HuggingFace failed:', e);
            }
        }

        if (!mermaidCode) {
            // Generate a simple fallback diagram from content
            console.log('[Diagram] All APIs failed, using fallback diagram');
            setLoadingStatus('Generating basic diagram...');
            const words = context.slice(0, 300).split(/\s+/).filter(w => w.length > 4 && /^[a-zA-Z]+$/.test(w));
            const uniqueWords = [...new Set(words)].slice(0, 5);

            mermaidCode = `flowchart TD
    A((Start)) --> B[${uniqueWords[0] || 'Main Topic'}]
    B --> C[${uniqueWords[1] || 'Concept 1'}]
    B --> D[${uniqueWords[2] || 'Concept 2'}]
    C --> E[${uniqueWords[3] || 'Detail'}]
    D --> E
    E --> F((End))`;
        }

        // Clean up the code
        mermaidCode = cleanMermaidCode(mermaidCode);

        console.log('[Diagram] Final code:', mermaidCode);
        return mermaidCode;
    };

    const cleanMermaidCode = (code: string): string => {
        // Remove markdown code blocks
        let cleaned = code
            .replace(/```mermaid\s*/gi, '')
            .replace(/```\s*/g, '')
            .trim();

        // Find the flowchart/graph part
        const match = cleaned.match(/(flowchart|graph)\s+(TD|TB|LR|RL|BT)[\s\S]*/i);
        if (match) {
            cleaned = match[0];
        }

        // Fix common issues
        cleaned = cleaned
            // Remove any lines that don't look like valid mermaid
            .split('\n')
            .filter(line => {
                const trimmed = line.trim();
                if (!trimmed) return false;
                if (trimmed.startsWith('flowchart') || trimmed.startsWith('graph')) return true;
                if (trimmed.match(/^[A-Za-z0-9_]+[\[\(\{]/) || trimmed.match(/-->|---/)) return true;
                if (trimmed.match(/^\s+[A-Za-z0-9_]+/)) return true;
                return false;
            })
            .join('\n');

        // Ensure it starts with flowchart
        if (!cleaned.startsWith('flowchart') && !cleaned.startsWith('graph')) {
            cleaned = 'flowchart TD\n' + cleaned;
        }

        return cleaned;
    };

    const generateSimpleDiagram = () => {
        // Extract key terms from context for a basic diagram
        const words = context.slice(0, 500).split(/\s+/).filter(w => w.length > 4);
        const uniqueWords = [...new Set(words)].slice(0, 5);

        const simpleDiagram = `flowchart TD
    A((Start)) --> B[${uniqueWords[0] || 'Topic'}]
    B --> C[${uniqueWords[1] || 'Concept 1'}]
    B --> D[${uniqueWords[2] || 'Concept 2'}]
    C --> E[${uniqueWords[3] || 'Detail'}]
    D --> E
    E --> F((End))`;

        setDiagramCode(simpleDiagram);
        setError('');
    };

    const downloadSVG = () => {
        const svg = diagramRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'cherag-diagram.svg';
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadPNG = async () => {
        const svg = diagramRef.current?.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new window.Image();

        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }

            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'cherag-diagram.png';
            a.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    // Initial loading state
    if (isInitialLoad) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // Empty State
    if (!diagramCode && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25">
                    <GitBranch className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Flowchart Generator</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
                    Transform your study materials into beautiful, easy-to-understand flowcharts.
                </p>

                <button
                    onClick={handleGenerateDiagram}
                    disabled={!hasContext || isLoading}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        <span>Generate Flowchart</span>
                    </div>
                </button>

                {!hasContext && <p className="mt-4 text-sm text-red-400">Upload a document first!</p>}

                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 max-w-md">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>
        );
    }

    // Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-300 font-medium">{loadingStatus || 'Processing...'}</p>
                <p className="text-gray-400 text-sm mt-2">Creating professional flowchart</p>
            </div>
        );
    }

    // Diagram View
    return (
        <div className="flex flex-col h-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Professional Flowchart</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleGenerateDiagram}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Regenerate"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={downloadSVG}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Download SVG"
                    >
                        <Download className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={downloadPNG}
                        className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1"
                        title="Download PNG"
                    >
                        <ImageIcon className="w-4 h-4" />
                        PNG
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-amber-50 text-amber-700 rounded-xl mb-4 text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Diagram Display - Fixed container with proper padding */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-auto">
                <div className="p-8" style={{ minHeight: '400px' }}>
                    <div
                        ref={diagramRef}
                        key={diagramKey}
                        className="w-full"
                        style={{ minHeight: '350px' }}
                    />
                </div>
            </div>

            {/* Info */}
            <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium mb-1">
                    ✨ AI-Generated Flowchart
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                    Professional visualization of your study content
                </p>
            </div>

            {/* Code Preview */}
            {diagramCode && (
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        View Mermaid Code
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-xl text-xs overflow-auto max-h-40">
                        {diagramCode}
                    </pre>
                </details>
            )}
        </div>
    );
}
