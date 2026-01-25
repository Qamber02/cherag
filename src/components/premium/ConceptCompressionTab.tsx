import { useState } from 'react';
import {
    Minimize2,
    Copy,
    RefreshCw,
    Lightbulb,
    Zap,
    BookOpen
} from 'lucide-react';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';

interface ConceptCompressionTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

export default function ConceptCompressionTab({
    userId,
    context,
    hasContext,
}: ConceptCompressionTabProps) {
    const [inputText, setInputText] = useState('');
    const [conceptName, setConceptName] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { compressConceptAction } = usePremiumFeatures(userId);

    const handleCompress = async () => {
        if (!inputText.trim() || !conceptName.trim()) return;

        setIsLoading(true);
        try {
            const data = await compressConceptAction(inputText, conceptName);
            setResult(data);
        } catch (error) {
            console.error('Compression failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoFill = () => {
        if (context && context.length > 0) {
            // Take first chunk of context as example
            setInputText(context.slice(0, 1500));
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shadow-lg">
                        <Minimize2 className="w-5 h-5" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Concept Compression</h1>
                </div>
                <p className="text-muted-foreground">
                    Transform complex topics into memorable mnemonics, analogies, and bite-sized explanations.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Source Material
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">
                                    Concept Name
                                </label>
                                <input
                                    type="text"
                                    value={conceptName}
                                    onChange={(e) => setConceptName(e.target.value)}
                                    placeholder="e.g. Photosynthesis"
                                    className="w-full px-4 py-2 bg-secondary rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-sm font-medium text-foreground">
                                        Content to Compress
                                    </label>
                                    {hasContext && (
                                        <button
                                            onClick={handleAutoFill}
                                            className="text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Copy className="w-3 h-3" /> Auto-fill from context
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Paste text, notes, or explanation here..."
                                    className="w-full h-48 px-4 py-3 bg-secondary rounded-lg border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none custom-scrollbar"
                                />
                            </div>

                            <button
                                onClick={handleCompress}
                                disabled={!inputText.trim() || !conceptName.trim() || isLoading}
                                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {isLoading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Compressing...
                                    </>
                                ) : (
                                    <>
                                        <Minimize2 className="w-4 h-4" />
                                        Compress Concept
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Output Section */}
                <div className="space-y-6">
                    {result ? (
                        <>
                            {/* Analogy Card */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Lightbulb className="w-24 h-24 text-amber-500" />
                                </div>
                                <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    The Analogy
                                </h4>
                                <p className="text-foreground relative z-10 font-medium text-lg leading-relaxed">
                                    "{result.analogy}"
                                </p>
                            </div>

                            {/* ELI5 & TLDR */}
                            <div className="bg-card border border-border p-6 rounded-2xl">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    Simpler Explanation (ELI5)
                                </h4>
                                <p className="text-muted-foreground mb-6 pb-6 border-b border-border">
                                    {result.eli5}
                                </p>

                                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                                    TL;DR (Too Long; Didn't Read)
                                </h4>
                                <p className="text-foreground font-medium">
                                    {result.tldr}
                                </p>
                            </div>

                            {/* Mnemonic */}
                            <div className="bg-card border border-border p-6 rounded-2xl">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                    <Copy className="w-4 h-4 text-purple-500" />
                                    Mnemonic Device
                                </h4>
                                <div className="bg-secondary/50 rounded-xl p-4 text-center">
                                    <div className="text-2xl font-bold text-primary mb-2 tracking-wide">
                                        {result.mnemonic}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-card/50 border border-dashed border-border rounded-2xl">
                            <Minimize2 className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="font-semibold text-foreground mb-2">Ready to Compress</h3>
                            <p className="text-muted-foreground text-sm max-w-xs">
                                Enter a concept and its description to generate powerful learning aids.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
