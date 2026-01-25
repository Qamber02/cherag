import { useState } from 'react';
import {
    GitMerge,
    Sparkles,
    RefreshCw,
    Zap,
    ArrowRight,
    Plus
} from 'lucide-react';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';

interface ConceptRemixTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

export default function ConceptRemixTab({
    userId,
    context: _context,
    hasContext: _hasContext,
}: ConceptRemixTabProps) {
    const [conceptA, setConceptA] = useState('');
    const [conceptB, setConceptB] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { remixConceptsAction } = usePremiumFeatures(userId);

    const handleRemix = async () => {
        if (!conceptA.trim() || !conceptB.trim()) return;

        setIsLoading(true);
        try {
            const data = await remixConceptsAction([
                { name: conceptA, description: '' },
                { name: conceptB, description: '' }
            ]);
            setResult(data);
        } catch (error) {
            console.error('Remix failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-8 text-center max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg mb-4">
                    <GitMerge className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Concept Remix</h1>
                <p className="text-muted-foreground">
                    Combine two unrelated ideas to discover novel implementation patterns and metaphors.
                    Innovation happens at the intersection.
                </p>
            </div>

            {/* Input Section */}
            <div className="bg-card border border-border p-1 rounded-2xl shadow-sm max-w-2xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row items-center gap-2 p-4">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-semibold text-muted-foreground ml-3 mb-1 block uppercase tracking-wider">Concept A</label>
                        <input
                            type="text"
                            value={conceptA}
                            onChange={(e) => setConceptA(e.target.value)}
                            placeholder="e.g. React Components"
                            className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center font-medium"
                        />
                    </div>

                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-muted-foreground shrink-0 my-2 md:my-0 md:mt-5">
                        <Plus className="w-4 h-4" />
                    </div>

                    <div className="flex-1 w-full">
                        <label className="text-xs font-semibold text-muted-foreground ml-3 mb-1 block uppercase tracking-wider">Concept B</label>
                        <input
                            type="text"
                            value={conceptB}
                            onChange={(e) => setConceptB(e.target.value)}
                            placeholder="e.g. Lego Bricks"
                            className="w-full px-4 py-3 bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center font-medium"
                        />
                    </div>
                </div>

                <div className="p-4 pt-0">
                    <button
                        onClick={handleRemix}
                        disabled={!conceptA.trim() || !conceptB.trim() || isLoading}
                        className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20 hover:scale-[1.01] active:scale-[0.99]"
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Generating Fusion...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Remix Concepts
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Section */}
            {result && (
                <div className="space-y-6 animate-fade-in">
                    {/* The Bridge */}
                    <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-8 rounded-3xl text-center">
                        <h3 className="text-lg font-semibold text-fuchsia-600 dark:text-fuchsia-400 mb-3 flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" />
                            The Creative Bridge
                        </h3>
                        <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed max-w-3xl mx-auto">
                            "{result.connection}"
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Insights */}
                        <div className="bg-card border border-border p-6 rounded-2xl">
                            <h4 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Key Insights
                            </h4>
                            <ul className="space-y-3">
                                {result.insights?.map((insight: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                                        {insight}
                                    </li>
                                )) || <p className="text-sm text-muted-foreground italic">No insights generated.</p>}
                            </ul>
                        </div>

                        {/* Practical Applications */}
                        <div className="bg-card border border-border p-6 rounded-2xl">
                            <h4 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-emerald-500" />
                                Practical Applications
                            </h4>
                            <ul className="space-y-3">
                                {result.applications?.map((app: string, i: number) => (
                                    <li key={i} className="flex items-start gap-3 text-muted-foreground text-sm">
                                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                                        {app}
                                    </li>
                                )) || <p className="text-sm text-muted-foreground italic">No applications generated.</p>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
