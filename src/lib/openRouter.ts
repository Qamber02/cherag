// OpenRouter API Client for Professional Diagram Generation
// Uses allenai/molmo-2-8b:free model with optimized prompts

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'allenai/molmo-2-8b:free';

// Security: Input sanitization
function sanitizeInput(text: string): string {
    // Remove potential prompt injection attempts
    const cleaned = text
        .replace(/```/g, '')  // Remove code blocks
        .replace(/<script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript protocols
        .slice(0, 5000); // Limit input size

    return cleaned.trim();
}

// Validate Mermaid syntax
function validateMermaidSyntax(diagram: string): boolean {
    // Basic validation checks
    const hasFlowchart = diagram.includes('flowchart') || diagram.includes('graph');
    const hasNodes = /[A-Z]\[.*?\]/.test(diagram);
    const hasConnections = /-->|---/.test(diagram);

    // Check for dangerous content
    const hasDangerousContent = /<script>|javascript:|onerror=/i.test(diagram);

    return hasFlowchart && hasNodes && hasConnections && !hasDangerousContent;
}

// Clean and format diagram output
function cleanDiagramOutput(text: string): string {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '').trim();

    // Remove any explanatory text before/after the diagram
    const lines = cleaned.split('\n');
    const startIndex = lines.findIndex(line =>
        line.trim().startsWith('flowchart') || line.trim().startsWith('graph')
    );

    if (startIndex !== -1) {
        cleaned = lines.slice(startIndex).join('\n');
    }

    return cleaned;
}

interface OpenRouterResponse {
    choices?: Array<{
        message: {
            content: string;
        };
    }>;
    error?: {
        message: string;
        code?: number;
    };
}

/**
 * Generate professional diagram using OpenRouter's molmo-2-8b model
 * Includes input validation, sanitization, and syntax checking
 */
export async function generateDiagramWithOpenRouter(context: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured');
    }

    // Security: Sanitize input
    const sanitizedContext = sanitizeInput(context);

    if (sanitizedContext.length < 10) {
        throw new Error('Insufficient content for diagram generation');
    }

    // Professional prompt optimized for molmo-2-8b
    const prompt = `You are a professional diagram generator. Create a clean, educational Mermaid.js flowchart.

STRICT REQUIREMENTS:
1. Use ONLY "flowchart TD" or "flowchart LR" syntax
2. Keep node labels SHORT and CLEAR (max 4 words each)
3. Use simple descriptive IDs: A, B, C, etc.
4. Maximum 10 nodes for clarity
5. Use professional styling: boxes [Text], diamonds {Decision}, rounded ((Start/End))
6. Include meaningful connections with clear arrows: -->
7. Add labels on arrows when needed: -->|label|
8. NO special characters in labels (only letters, numbers, spaces)
9. Output ONLY the Mermaid code, no explanations

EXAMPLE FORMAT:
flowchart TD
    A[Start Process] --> B{Check Condition}
    B -->|Yes| C[Action One]
    B -->|No| D[Action Two]
    C --> E[Final Step]
    D --> E

Content to visualize:
${sanitizedContext}

Generate the Mermaid flowchart now:`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Cherag Study Assistant'
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3, // Lower temperature for more consistent diagrams
            })
        });

        const data: OpenRouterResponse = await response.json();

        if (!response.ok) {
            // Sanitize error message to prevent key exposure
            const errorMsg = data.error?.message || 'OpenRouter API error';
            throw new Error(errorMsg.replace(/sk-[a-zA-Z0-9-]+/g, '[API_KEY]'));
        }

        const diagramText = data.choices?.[0]?.message?.content || '';
        const cleanedDiagram = cleanDiagramOutput(diagramText);

        // Validate syntax before returning
        if (!validateMermaidSyntax(cleanedDiagram)) {
            throw new Error('Generated diagram failed validation');
        }

        return cleanedDiagram;

    } catch (error: any) {
        console.error('[OpenRouter] Diagram generation failed:', error.message);
        // Sanitize error before re-throwing
        const safeError = error.message.replace(/sk-[a-zA-Z0-9-]+/g, '[API_KEY]');
        throw new Error(`OpenRouter: ${safeError}`);
    }
}

/**
 * Test if OpenRouter is available and configured
 */
export function isOpenRouterAvailable(): boolean {
    return !!OPENROUTER_API_KEY && OPENROUTER_API_KEY.length > 0;
}
