import { useState } from 'react';
import {
    Brain,
    Lightbulb,
    RefreshCw,
    TrendingUp,
    Filter,
    Layers,
    Search,
    BookOpen
} from 'lucide-react';
import { usePremiumFeatures } from '../../hooks/usePremiumFeatures';

interface MentalModelTabProps {
    userId: string;
    context: string;
    hasContext: boolean;
}

type ThinkingModel = 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost';

const MODELS: Array<{ id: ThinkingModel; name: string; icon: any; description: string }> = [
    {
        id: 'first_principles',
        name: 'First Principles',
        icon: Layers,
        description: 'Break problems down to basic truths'
    },
    {
        id: 'second_order',
        name: 'Second Order',
        icon: TrendingUp,
        description: 'Think: "And then what?"'
    },
    {
        id: 'pareto',
        name: '80/20 Rule',
        icon: Filter,
        description: 'Focus on high-impact factors'
    },
    {
        id: 'inversion',
        name: 'Inversion',
        icon: RefreshCw,
        description: 'Avoid stupidity > Seek brilliance'
    },
    {
        id: 'opportunity_cost',
        name: 'Opportunity Cost',
        icon: Search,
        description: 'What are you giving up?'
    }
];

export default function MentalModelTab({
    userId,
    context,
    hasContext: _hasContext,
}: MentalModelTabProps) {
    const [selectedModel, setSelectedModel] = useState<ThinkingModel>('first_principles');
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { analyzeMentalModelAction } = usePremiumFeatures(userId);

    const handleAnalyze = async () => {
        if (!inputText.trim()) return;

        setIsLoading(true);
        try {
            const data = await analyzeMentalModelAction(inputText, selectedModel);
            setResult(data);
        } catch (error) {
            console.error('Mental Model Analysis failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAutoFill = () => {
        if (context && context.length > 0) {
            setInputText(context.slice(0, 2000));
        }
    };

    const CurrentIcon = MODELS.find(m => m.id === selectedModel)?.icon || Brain;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shrink-0">
                    <Brain className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Mental Model Builder</h1>
                    <p className="text-muted-foreground">
                        Apply the cognitive frameworks of geniuses to your study material.
                    </p>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Sidebar: Model Selection */}
                <div className="lg:col-span-4 space-y-3">
                    <h3 className="font-semibold text-foreground mb-4 px-2">Select Thinking Tool</h3>
                    {MODELS.map((model) => {
                        const Icon = model.icon;
                        const isSelected = selectedModel === model.id;
                        return (
                            <button
                                key={model.id}
                                onClick={() => setSelectedModel(model.id)}
                                className={`w-full text-left p-4 rounded-xl transition-all border ${isSelected
                                    ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                                    : 'bg-card border-border hover:border-indigo-200 dark:hover:border-indigo-800'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-800/50 dark:text-indigo-300' : 'bg-secondary text-muted-foreground'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className={`font-semibold ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-foreground'}`}>
                                            {model.name}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {model.description}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Input Area */}
                    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-indigo-500" />
                                Situation / Problem / Topic
                            </label>
                            <button
                                onClick={handleAutoFill}
                                className="text-xs text-indigo-500 hover:underline font-medium"
                            >
                                Auto-fill from context
                            </button>
                        </div>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder={`Describe the problem or topic you want to analyze using ${MODELS.find(m => m.id === selectedModel)?.name}...`}
                            className="w-full h-32 px-4 py-3 bg-secondary rounded-xl border border-border focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none mb-4 custom-scrollbar"
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={!inputText.trim() || isLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Applying Framework...
                                </>
                            ) : (
                                <>
                                    <CurrentIcon className="w-4 h-4" />
                                    Analyze with {MODELS.find(m => m.id === selectedModel)?.name}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Implementation Result */}
                    {result && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Definition Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 p-6 rounded-2xl">
                                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                                    The Lens
                                </h3>
                                <p className="text-lg font-medium text-foreground">
                                    {result.definition}
                                </p>
                            </div>

                            {/* Step-by-Step Analysis */}
                            <div className="bg-card border border-border p-6 rounded-2xl">
                                <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-gray-500" />
                                    Structured Analysis
                                </h3>
                                <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-border">
                                    {result.steps.map((step: string, i: number) => (
                                        <div key={i} className="relative pl-10">
                                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-foreground z-10">
                                                {i + 1}
                                            </div>
                                            <p className="text-foreground pt-1">{step}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Core Insight */}
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl flex items-start gap-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl shrink-0 text-amber-600 dark:text-amber-400">
                                    <Lightbulb className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-1">
                                        Core Insight
                                    </h3>
                                    <p className="text-amber-900 dark:text-amber-200">
                                        "{result.insight}"
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
