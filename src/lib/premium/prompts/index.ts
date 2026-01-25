// Premium Prompts - Barrel Export
// Central export for all premium AI prompts

export { KNOWLEDGE_RADAR_PROMPTS } from './knowledgeRadar.prompts';
export type {
    ConceptExtractionResult,
    DependencyMappingResult,
    GapAnalysisResult
} from './knowledgeRadar.prompts';

export { EXAM_ENGINE_PROMPTS } from './examEngine.prompts';
export type {
    SyllabusAnalysisResult,
    ReadinessResult,
    ExamQuestion
} from './examEngine.prompts';

export { TEACHING_MODE_PROMPTS } from './teachingMode.prompts';
export type {
    TeachingSessionEvaluation,
    TeachingChallenge
} from './teachingMode.prompts';

export { LEARNING_ANALYTICS_PROMPTS } from './learningAnalytics.prompts';
export type {
    CognitiveLoadResult,
    LearningDNAResult,
    ConfidenceResult
} from './learningAnalytics.prompts';

export { CONTENT_PROCESSING_PROMPTS } from './contentProcessing.prompts';
export type {
    CompressionResult,
    RemixResult,
    VideoSegmentResult
} from './contentProcessing.prompts';

export { STUDY_AGENT_PROMPTS } from './studyAgent.prompts';
export type {
    DailyPlan,
    NotesAnalysis
} from './studyAgent.prompts';

export * from './mentalModel.prompts';
