// Knowledge Graph Service
// Manages concept dependencies, mastery tracking, and knowledge structure

import { supabase } from '../supabaseClient';

// ============================================
// TYPES
// ============================================

export interface ConceptNode {
    id: string;
    name: string;
    description: string;
    complexity: 'foundational' | 'intermediate' | 'advanced';
    mastery: number;
    stressTested: boolean;
}

export interface DependencyEdge {
    from: string;
    to: string;
    required: boolean;
}

export interface KnowledgeGraph {
    nodes: ConceptNode[];
    edges: DependencyEdge[];
}

export interface KnowledgeGap {
    concept: string;
    blockingConcepts: string[];
    priority: 'critical' | 'important' | 'minor';
    recommendation: string;
}

// ============================================
// IN-MEMORY GRAPH (Session State)
// ============================================

let sessionGraph: KnowledgeGraph | null = null;

/**
 * Set the knowledge graph for the current session
 */
export function setSessionGraph(graph: KnowledgeGraph): void {
    sessionGraph = graph;
}

/**
 * Get the current session's knowledge graph
 */
export function getSessionGraph(): KnowledgeGraph | null {
    return sessionGraph;
}

/**
 * Clear the session graph
 */
export function clearSessionGraph(): void {
    sessionGraph = null;
}

// ============================================
// GRAPH OPERATIONS
// ============================================

/**
 * Build graph from extracted concepts and dependencies
 */
export function buildKnowledgeGraph(
    concepts: Array<{ concept: string; description: string; complexity_level: string }> = [],
    dependencies: Array<{ concept: string; prerequisites: string[]; is_foundational: boolean }> = [],
    masteryLevels: Record<string, number> = {}
): KnowledgeGraph {
    // Build nodes
    const nodes: ConceptNode[] = concepts.map(c => ({
        id: c.concept.toLowerCase().replace(/\s+/g, '_'),
        name: c.concept,
        description: c.description,
        complexity: c.complexity_level as 'foundational' | 'intermediate' | 'advanced',
        mastery: masteryLevels[c.concept] || 0,
        stressTested: false,
    }));

    // Build edges from prerequisites
    const edges: DependencyEdge[] = [];
    for (const dep of dependencies) {
        for (const prereq of dep.prerequisites) {
            edges.push({
                from: prereq.toLowerCase().replace(/\s+/g, '_'),
                to: dep.concept.toLowerCase().replace(/\s+/g, '_'),
                required: true,
            });
        }
    }

    return { nodes, edges };
}

/**
 * Find foundational concepts (no prerequisites)
 */
export function findFoundations(graph: KnowledgeGraph): ConceptNode[] {
    const hasPrereqs = new Set(graph.edges.map(e => e.to));
    return graph.nodes.filter(n => !hasPrereqs.has(n.id));
}

/**
 * Find concepts that depend on a given concept
 */
export function findDependents(graph: KnowledgeGraph, conceptId: string): ConceptNode[] {
    const dependentIds = graph.edges
        .filter(e => e.from === conceptId)
        .map(e => e.to);

    return graph.nodes.filter(n => dependentIds.includes(n.id));
}

/**
 * Find prerequisites for a concept
 */
export function findPrerequisites(graph: KnowledgeGraph, conceptId: string): ConceptNode[] {
    const prereqIds = graph.edges
        .filter(e => e.to === conceptId)
        .map(e => e.from);

    return graph.nodes.filter(n => prereqIds.includes(n.id));
}

/**
 * Identify knowledge gaps (concepts with unmastered prerequisites)
 */
export function identifyGaps(
    graph: KnowledgeGraph,
    masteryThreshold: number = 60
): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    for (const node of graph.nodes) {
        const prereqs = findPrerequisites(graph, node.id);
        const unmasteredPrereqs = prereqs.filter(p => p.mastery < masteryThreshold);

        if (unmasteredPrereqs.length > 0) {
            // Calculate priority based on how many concepts are blocked
            const dependents = findDependents(graph, node.id);
            let priority: 'critical' | 'important' | 'minor';

            if (dependents.length >= 3) {
                priority = 'critical';
            } else if (dependents.length >= 1) {
                priority = 'important';
            } else {
                priority = 'minor';
            }

            gaps.push({
                concept: node.name,
                blockingConcepts: unmasteredPrereqs.map(p => p.name),
                priority,
                recommendation: `Study ${unmasteredPrereqs[0].name} first`,
            });
        }
    }

    // Sort by priority
    const priorityOrder = { critical: 0, important: 1, minor: 2 };
    gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return gaps;
}

/**
 * Calculate optimal learning order using topological sort
 */
export function getOptimalLearningOrder(graph: KnowledgeGraph): ConceptNode[] {
    // Kahn's algorithm for topological sort
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    // Initialize
    for (const node of graph.nodes) {
        inDegree.set(node.id, 0);
        adjList.set(node.id, []);
    }

    // Build adjacency list and count in-degrees
    for (const edge of graph.edges) {
        if (inDegree.has(edge.from) && inDegree.has(edge.to)) {
            adjList.get(edge.from)!.push(edge.to);
            inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
        }
    }

    // Find all nodes with no incoming edges
    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree) {
        if (degree === 0) queue.push(nodeId);
    }

    const result: ConceptNode[] = [];
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    while (queue.length > 0) {
        // Sort queue by mastery (prioritize least mastered)
        queue.sort((a, b) => {
            const nodeA = nodeMap.get(a)!;
            const nodeB = nodeMap.get(b)!;
            return nodeA.mastery - nodeB.mastery;
        });

        const current = queue.shift()!;
        if (nodeMap.has(current)) {
            result.push(nodeMap.get(current)!);
        }

        for (const neighbor of adjList.get(current) || []) {
            inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        }
    }

    return result;
}

/**
 * Calculate overall knowledge coverage
 */
export function calculateCoverage(graph: KnowledgeGraph): {
    overall: number;
    byComplexity: Record<string, number>;
    fullyMastered: number;
    inProgress: number;
    notStarted: number;
} {
    const masterySum = graph.nodes.reduce((sum, n) => sum + n.mastery, 0);
    const overall = graph.nodes.length > 0 ? masterySum / graph.nodes.length : 0;

    // By complexity
    const byComplexity: Record<string, { sum: number; count: number }> = {};
    for (const node of graph.nodes) {
        if (!byComplexity[node.complexity]) {
            byComplexity[node.complexity] = { sum: 0, count: 0 };
        }
        byComplexity[node.complexity].sum += node.mastery;
        byComplexity[node.complexity].count++;
    }

    const complexityAverages: Record<string, number> = {};
    for (const [complexity, data] of Object.entries(byComplexity)) {
        complexityAverages[complexity] = data.count > 0 ? data.sum / data.count : 0;
    }

    // Progress categories
    const fullyMastered = graph.nodes.filter(n => n.mastery >= 80).length;
    const inProgress = graph.nodes.filter(n => n.mastery >= 20 && n.mastery < 80).length;
    const notStarted = graph.nodes.filter(n => n.mastery < 20).length;

    return {
        overall: Math.round(overall),
        byComplexity: complexityAverages,
        fullyMastered,
        inProgress,
        notStarted,
    };
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Save concept dependencies to database
 */
export async function saveConceptDependencies(
    userId: string,
    concept: string,
    dependsOn: string[],
    masteryLevel: number
): Promise<void> {
    const { error } = await supabase
        .from('concept_dependencies')
        .upsert({
            user_id: userId,
            concept,
            depends_on: dependsOn,
            mastery_level: masteryLevel,
            stress_tested: false,
        }, {
            onConflict: 'user_id,concept',
        });

    if (error) {
        console.error('[KnowledgeGraph] Error saving dependencies:', error);
    }
}

/**
 * Load concept dependencies from database
 */
export async function loadConceptDependencies(
    userId: string
): Promise<Array<{ concept: string; dependsOn: string[]; masteryLevel: number }>> {
    const { data, error } = await supabase
        .from('concept_dependencies')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[KnowledgeGraph] Error loading dependencies:', error);
        return [];
    }

    return (data || []).map(row => ({
        concept: row.concept,
        dependsOn: row.depends_on || [],
        masteryLevel: row.mastery_level,
    }));
}

/**
 * Mark concept as stress tested
 */
export async function markStressTested(
    userId: string,
    concept: string
): Promise<void> {
    const { error } = await supabase
        .from('concept_dependencies')
        .update({ stress_tested: true })
        .eq('user_id', userId)
        .eq('concept', concept);

    if (error) {
        console.error('[KnowledgeGraph] Error marking stress tested:', error);
    }
}

/**
 * Update mastery level
 */
export async function updateMastery(
    userId: string,
    concept: string,
    newMastery: number
): Promise<void> {
    const { error } = await supabase
        .from('concept_dependencies')
        .update({ mastery_level: Math.max(0, Math.min(100, newMastery)) })
        .eq('user_id', userId)
        .eq('concept', concept);

    if (error) {
        console.error('[KnowledgeGraph] Error updating mastery:', error);
    }
}
