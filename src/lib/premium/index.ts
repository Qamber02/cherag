// Premium Services - Barrel Export
// Central export for all premium functionality

// AI Service
export {
    analyzeKnowledgeRadar,
    analyzeSyllabus,
    calculateExamReadiness,
    generateExamQuestions,
    assessCognitiveLoad,
    generateLearningDNA,
    getTeachingModeSystemPrompt,
    evaluateTeachingSession,
    generateTeachingResponse,
    compressConcept,
    remixConcepts,
    generateDailyPlan,
    analyzeLivingNotes,
    getKnowledgeTwinPrompt,
    parseJSONResponse,
    executePromptChain,
    generateMentalModelAnalysis,
    generateStressTest,
    generateActiveLesson,
} from './premiumAiService';

export type { KnowledgeRadarData } from './premiumAiService';

// Learning Analytics
export {
    calculateConfidence,
    calculateNextReview,
    startSession,
    recordInteraction,
    getSessionMetrics,
    endSession,
    getConceptSession,
    updateConceptSession,
    getDueForReview,
    getLearningProfile,
    saveLearningProfile,
    getUserMastery,
    getActivityHistory,
} from './learningAnalytics';

export type {
    LearningSession,
    ConceptDependency,
    LearningProfile,
    SessionMetrics,
} from './learningAnalytics';

// Knowledge Graph
export {
    setSessionGraph,
    getSessionGraph,
    clearSessionGraph,
    buildKnowledgeGraph,
    findFoundations,
    findDependents,
    findPrerequisites,
    identifyGaps,
    getOptimalLearningOrder,
    calculateCoverage,
    saveConceptDependencies,
    loadConceptDependencies,
    markStressTested,
    updateMastery,
} from './knowledgeGraph';

export type {
    ConceptNode,
    DependencyEdge,
    KnowledgeGraph,
    KnowledgeGap,
} from './knowledgeGraph';

// Re-export types from prompts
export type {
    ConceptExtractionResult,
    DependencyMappingResult,
    GapAnalysisResult,
    SyllabusAnalysisResult,
    ReadinessResult,
    ExamQuestion,
    TeachingSessionEvaluation,
    TeachingChallenge,
    CognitiveLoadResult,
    LearningDNAResult,
    ConfidenceResult,
    CompressionResult,
    RemixResult,
    VideoSegmentResult,
    DailyPlan,
    NotesAnalysis,
    MentalModelResult,
    MicroLessonResult,
} from './prompts';
