// Premium Features Hook
// Central hook for accessing premium functionality in components

import { useState, useCallback, useEffect } from 'react';
import { getPreference } from '../lib/preferencesService';

import {
    // AI Services
    analyzeKnowledgeRadar,
    assessCognitiveLoad,
    generateLearningDNA,
    compressConcept,
    remixConcepts,
    generateDailyPlan,
    // Teaching Mode
    getTeachingModeSystemPrompt,
    evaluateTeachingSession,
    generateTeachingResponse,
    // Analytics
    startSession,
    recordInteraction,
    getSessionMetrics,
    endSession,
    getUserMastery,
    getActivityHistory,
    getLearningProfile,
    saveLearningProfile,
    // Knowledge Graph
    buildKnowledgeGraph,
    setSessionGraph,
    // Mental Models
    generateMentalModelAnalysis,
    generateActiveLesson,
} from '../lib/premium';

import type {
    KnowledgeRadarData,
    KnowledgeGraph,
    CognitiveLoadResult,
    LearningDNAResult,
    DailyPlan,
    MicroLessonResult,
} from '../lib/premium';

interface UsePremiumFeaturesReturn {
    // State
    isLoading: boolean;
    error: string | null;
    knowledgeGraph: KnowledgeGraph | null;
    cognitiveLoad: CognitiveLoadResult | null;
    learningDNA: LearningDNAResult | null;
    dailyPlan: DailyPlan | null;

    // Actions
    analyzeContent: (content: string) => Promise<KnowledgeRadarData | null>;
    checkCognitiveLoad: () => Promise<CognitiveLoadResult | null>;
    generateDNA: () => Promise<LearningDNAResult | null>;
    createDailyPlan: (availableMinutes: number) => Promise<DailyPlan | null>;
    compressConceptAction: (content: string, name: string) => Promise<any>;
    remixConceptsAction: (concepts: Array<{ name: string; description: string }>) => Promise<any>;

    // Active Learning
    generateActiveLessonAction: (concept: string, context: string, previousQuestions?: string[]) => Promise<MicroLessonResult | null>;

    // Session tracking
    startStudySession: () => void;
    recordAnswer: (correct: boolean, timeMs: number, conceptId?: string) => void;
    completeLesson: (conceptId: string) => void;
    endStudySession: () => void;

    // Teaching Mode
    startTeachingSession: (concept: string, difficulty: 'beginner' | 'intermediate' | 'advanced', context?: string) => Promise<string>;
    sendTeachingMessage: (history: Array<{ role: 'teacher' | 'student'; content: string }>, concept: string, difficulty: 'beginner' | 'intermediate' | 'advanced', context?: string) => Promise<string>;
    evaluateSession: (concept: string, history: Array<{ role: 'teacher' | 'student'; content: string }>) => Promise<any>;

    // Mental Models
    analyzeMentalModelAction: (content: string, model: 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost') => Promise<any>;
}

export function usePremiumFeatures(userId: string | undefined): UsePremiumFeaturesReturn {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);
    const [cognitiveLoad, setCognitiveLoad] = useState<CognitiveLoadResult | null>(null);
    const [learningDNA, setLearningDNA] = useState<LearningDNAResult | null>(null);
    const [dailyPlan, setDailyPlan] = useState<DailyPlan | null>(null);

    // Start session on mount
    useEffect(() => {
        if (userId) {
            startSession();
        }
        return () => {
            if (userId) {
                endSession();
            }
        };
    }, [userId]);

    /**
     * Analyze content and build knowledge graph
     */
    const analyzeContent = useCallback(async (content: string): Promise<KnowledgeRadarData | null> => {
        if (!userId || !content.trim()) return null;

        setIsLoading(true);
        setError(null);

        try {
            // Get existing mastery levels
            const mastery = await getUserMastery(userId);

            // Analyze with AI
            const radarData = await analyzeKnowledgeRadar(content, mastery);

            // Build graph
            const graph = buildKnowledgeGraph(
                radarData.concepts,
                radarData.dependencies,
                mastery
            );

            setKnowledgeGraph(graph);
            setSessionGraph(graph);

            return radarData;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    /**
     * Check current cognitive load
     */
    const checkCognitiveLoad = useCallback(async (): Promise<CognitiveLoadResult | null> => {
        const metrics = getSessionMetrics();
        if (!metrics || metrics.sessionMinutes < 5) {
            return null; // Not enough data
        }

        setIsLoading(true);
        try {
            const result = await assessCognitiveLoad({
                ...metrics,
                scrollBehavior: 'steady', // Would need actual tracking
            });
            setCognitiveLoad(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Generate learning DNA profile
     */
    const generateDNA = useCallback(async (): Promise<LearningDNAResult | null> => {
        if (!userId) return null;

        setIsLoading(true);
        try {
            // Get activity history
            const activityData = await getActivityHistory(userId, 30);

            if (activityData.length < 3) {
                setError('Need at least 3 days of activity to generate DNA profile');
                return null;
            }

            const result = await generateLearningDNA({
                sessions: activityData,
                contentTypePerformance: {},
                topicPreferences: [],
            });

            setLearningDNA(result);

            // Save to database
            await saveLearningProfile({
                userId: userId,
                learningStyle: JSON.stringify(result.learning_style),
                peakHours: result.peak_performance_hours,
                cognitiveStrengths: result.strength_areas,
                preferredDifficulty: result.session_preference,
            });

            return result;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    /**
     * Create daily study plan
     */
    const createDailyPlan = useCallback(async (availableMinutes: number): Promise<DailyPlan | null> => {
        if (!userId) return null;

        setIsLoading(true);
        try {
            // Get learning profile
            const profile = await getLearningProfile(userId);

            const result = await generateDailyPlan({
                goals: [], // Would come from user settings
                availableMinutes,
                learningDNA: {
                    peakHours: profile?.peakHours || [9, 10, 11],
                    sessionLength: (profile?.preferredDifficulty as any) || 'moderate',
                    strengths: profile?.cognitiveStrengths || [],
                },
                currentProgress: await getUserMastery(userId),
                currentHour: new Date().getHours(),
            });

            setDailyPlan(result);
            return result;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    /**
     * Compress a concept
     */
    const compressConceptAction = useCallback(async (content: string, name: string) => {
        setIsLoading(true);
        try {
            return await compressConcept(content, name);
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Remix concepts to find connections
     */
    const remixConceptsAction = useCallback(async (
        concepts: Array<{ name: string; description: string }>
    ) => {
        setIsLoading(true);
        try {
            return await remixConcepts(concepts);
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Session tracking wrappers
    const startStudySession = useCallback(() => {
        startSession();
    }, []);

    const recordAnswer = useCallback((correct: boolean, timeMs: number, conceptId?: string) => {
        // 1. Record analytics
        recordInteraction(correct, timeMs, conceptId);

        // 2. Update local graph state for immediate UI feedback
        if (conceptId && knowledgeGraph) {
            setKnowledgeGraph(prevGraph => {
                if (!prevGraph) return null;

                const updatedNodes = prevGraph.nodes.map(node => {
                    if (node.id === conceptId) {
                        // Simple mastery update simulation for UI responsiveness
                        // Real calculation happens on server/analytics sync
                        const currentMastery = node.mastery || 0;
                        const increment = correct ? 25 : -5; // +25% for correct (faster), -5% for wrong
                        const newMastery = Math.min(100, Math.max(0, currentMastery + increment));

                        return { ...node, mastery: newMastery };
                    }
                    return node;
                });

                return { ...prevGraph, nodes: updatedNodes };
            });
        }
    }, [knowledgeGraph]);

    const completeLesson = useCallback((conceptId: string) => {
        if (conceptId && knowledgeGraph) {
            setKnowledgeGraph(prevGraph => {
                if (!prevGraph) return null;
                const updatedNodes = prevGraph.nodes.map(node => {
                    if (node.id === conceptId) {
                        return { ...node, mastery: 100 };
                    }
                    return node;
                });
                return { ...prevGraph, nodes: updatedNodes };
            });
        }
    }, [knowledgeGraph]);

    const analyzeMentalModelAction = useCallback(async (
        content: string,
        model: 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost'
    ) => {
        setIsLoading(true);
        const aiModel = getPreference('aiModel');
        try {
            return await generateMentalModelAnalysis(content, model, aiModel === 'auto' ? undefined : aiModel);
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ... (rest of the file)

    const endStudySession = useCallback(() => {
        const metrics = endSession();
        console.log('[Premium] Session ended:', metrics);
    }, []);

    // Teaching Mode
    const startTeachingSession = async (concept: string, difficulty: 'beginner' | 'intermediate' | 'advanced', context?: string) => {
        if (!userId) throw new Error('User not authenticated');

        const systemPrompt = getTeachingModeSystemPrompt(concept, difficulty);
        const openingPrompt = `${systemPrompt.system}

Context provided: ${context ? context.slice(0, 300) + '...' : 'None'}

Teacher (User) says: "I want to teach you about ${concept}."
Student (AI): (Greet the teacher excitedly and ask existing knowledge based on context if any)`;

        const response = await generateTeachingResponse(openingPrompt);
        return response;
    };

    const sendTeachingMessage = async (history: Array<{ role: 'teacher' | 'student'; content: string }>, concept: string, difficulty: 'beginner' | 'intermediate' | 'advanced', context?: string) => {
        const lastUserMsg = history[history.length - 1];
        const isUserConfused = /don'?t know|idk|not sure|explain|confused|lost|help/i.test(lastUserMsg.content);

        const conversation = history.map(msg => `${msg.role === 'teacher' ? 'Teacher' : 'Student'}: ${msg.content}`).join('\n');
        const systemPrompt = getTeachingModeSystemPrompt(concept, difficulty).system;

        let dynamicInstruction = "";
        if (isUserConfused) {
            dynamicInstruction = `\n[SYSTEM INTERVENTION: The teacher (user) is confused. STOP QUESTIONING IMMEDIATELY. Briefly explain the concept yourself using a simple query or analogy. Then check for understanding.]\n`;
        }

        const prompt = `
${systemPrompt}

${dynamicInstruction}

Context about concept (${concept}) from files: ${context ? context.slice(0, 500) : 'None'}

Current Conversation:
${conversation}

Student (AI):`;

        const response = await generateTeachingResponse(prompt);
        return response;
    };

    const evaluateSession = async (concept: string, history: Array<{ role: 'teacher' | 'student'; content: string }>) => {
        return await evaluateTeachingSession(concept, history);
    };

    return {
        isLoading,
        error,

        // State
        knowledgeGraph,
        cognitiveLoad,
        learningDNA,
        dailyPlan,

        // Core
        analyzeContent,

        // Analytics
        checkCognitiveLoad,
        generateDNA,
        createDailyPlan,
        compressConceptAction,
        remixConceptsAction,

        // Study Session
        startStudySession,
        recordAnswer,
        completeLesson,
        endStudySession,

        // Teaching Mode
        startTeachingSession,
        sendTeachingMessage,
        evaluateSession,

        // Mental Models
        analyzeMentalModelAction,

        // Active Learning
        generateActiveLessonAction: async (concept: string, context: string, previousQuestions: string[] = []) => {
            setIsLoading(true);
            try {
                return await generateActiveLesson(concept, context, previousQuestions);
            } catch (err: any) {
                setError(err.message);
                return null;
            } finally {
                setIsLoading(false);
            }
        },
    };
}
