// Premium AI Prompts - Knowledge Radar Feature
// Manages concept extraction and dependency mapping

export const KNOWLEDGE_RADAR_PROMPTS = {
    /**
     * CHAIN 1: Extract key concepts from document content
     */
    conceptExtraction: (content: string) => `Extract all key concepts from this educational content.

Return as JSON array:
[{
  "concept": "concept name",
  "description": "brief description",
  "complexity_level": "foundational" | "intermediate" | "advanced"
}]

RULES:
- Maximum 20 concepts
- Focus on main ideas, not trivial details
- Complexity based on prerequisite knowledge needed
- No markdown, only valid JSON

Content:
${content.slice(0, 8000)}`,

    /**
     * CHAIN 2: Map dependencies between concepts
     */
    dependencyMapping: (concepts: string[]) => `For each concept, identify prerequisite knowledge required.

Concepts to analyze:
${JSON.stringify(concepts)}

Return as JSON array:
[{
  "concept": "concept name",
  "prerequisites": ["required concept 1", "required concept 2"],
  "is_foundational": boolean
}]

RULES:
- Prerequisites must be from the provided list OR common knowledge
- is_foundational = true if no prerequisites needed
- Order matters: list most essential prerequisites first
- No circular dependencies
- No markdown, only valid JSON`,

    /**
     * CHAIN 3: Identify knowledge gaps
     */
    gapAnalysis: (
        concepts: Array<{ concept: string; prerequisites: string[] }>,
        userMastery: Record<string, number>
    ) => `Identify concepts with unmet prerequisites.

Concept Dependencies:
${JSON.stringify(concepts)}

User Mastery Levels (0-100):
${JSON.stringify(userMastery)}

Return as JSON array:
[{
  "gap": "concept with gap",
  "blocking_concepts": ["unmastered prerequisite 1"],
  "priority": "critical" | "important" | "minor",
  "recommendation": "what to study first"
}]

RULES:
- Gap exists if any prerequisite has mastery < 60
- Priority based on how many other concepts are blocked
- No markdown, only valid JSON`
};

export type ConceptExtractionResult = Array<{
    concept: string;
    description: string;
    complexity_level: 'foundational' | 'intermediate' | 'advanced';
}>;

export type DependencyMappingResult = Array<{
    concept: string;
    prerequisites: string[];
    is_foundational: boolean;
}>;

export type GapAnalysisResult = Array<{
    gap: string;
    blocking_concepts: string[];
    priority: 'critical' | 'important' | 'minor';
    recommendation: string;
}>;
