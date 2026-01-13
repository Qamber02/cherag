// Professional Diagram Image Generation Service
// Generates detailed, visually appealing educational diagrams as images

import { rateLimiter } from './rateLimiter';

/**
 * Generate a professional, detailed diagram image from content
 * Uses AI to create high-quality educational diagrams with proper visual design
 */
export async function generateDiagramImage(context: string): Promise<string> {
    await rateLimiter.waitForToken('diagrams');

    // Security: Sanitize and limit input
    const sanitized = context.slice(0, 5000).trim();

    if (sanitized.length < 10) {
        throw new Error('Insufficient content for diagram generation');
    }

    // Analyze content to create diagram description
    const diagramDescription = await createDiagramDescription(sanitized);

    // Generate the actual diagram image
    const imagePrompt = `Professional educational diagram for: ${diagramDescription}

REQUIREMENTS:
- Clean, modern infographic style
- Use a cohesive color scheme (blues, purples, or professional pastels)
- Include clear labels and text
- Professional typography
- Visual hierarchy with headings and sections
- Icons or simple illustrations where appropriate
- White or light background
- Suitable for educational/academic use
- Flowchart or process diagram layout
- Clear connections and relationships
- Professional graphic design quality

Style: Modern educational infographic, clean and professional, flat design, high quality`;

    try {
        // Use generate_image tool to create the diagram
        // This will be implemented in the component
        return imagePrompt;
    } catch (error: any) {
        console.error('[Diagram Image] Generation failed:', error);
        throw new Error('Failed to generate diagram image. Please try again.');
    }
}

/**
 * Create a detailed description for the diagram based on content analysis
 */
async function createDiagramDescription(content: string): Promise<string> {
    // This will be called by the component which has access to AI services
    // For now, we'll extract key concepts from the content

    // Simple extraction: get first few sentences or key points
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyPoints = sentences.slice(0, 5).map(s => s.trim()).join('. ');

    return `Create a detailed visual diagram showing the concepts and relationships from this educational content: ${keyPoints}. The diagram should be a flowchart or process diagram with clear steps, relationships, and visual organization.`;
}

/**
 * Generate diagram using integrated approach:
 * 1. Analyze content with AI
 * 2. Create detailed diagram specifications  
 * 3. Generate professional image
 */
export async function generateProfessionalDiagram(
    context: string,
    aiAnalyzeFunction: (prompt: string) => Promise<string>
): Promise<{ imagePrompt: string; description: string }> {
    await rateLimiter.waitForToken('diagrams');

    const sanitized = context.slice(0, 5000).trim();

    if (sanitized.length < 10) {
        throw new Error('Insufficient content for diagram generation');
    }

    // Step 1: Use AI to analyze content and create diagram structure
    const analysisPrompt = `Analyze this educational content and create a detailed diagram structure.

Content: ${sanitized}

Create a JSON response with:
{
  "title": "Main concept/process name",
  "diagramType": "flowchart|process|hierarchy|concept-map",
  "elements": [
    {"id": "step1", "label": "Short label", "description": "What this represents"},
    ...
  ],
  "connections": [
    {"from": "step1", "to": "step2", "label": "Relationship/action"},
    ...
  ],
  "colorScheme": "professional blue|purple|green",
  "visualDescription": "Detailed description of how diagram should look"
}

Keep it concise but comprehensive. Max 8-10 elements.`;

    try {
        const analysis = await aiAnalyzeFunction(analysisPrompt);

        // Parse the AI response
        let diagramSpec;
        try {
            diagramSpec = JSON.parse(analysis.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch {
            // Fallback if JSON parsing fails
            diagramSpec = {
                title: "Educational Concept Diagram",
                visualDescription: "A professional flowchart showing the main concepts and their relationships from the educational content"
            };
        }

        // Step 2: Create detailed image generation prompt
        const imagePrompt = `Create a professional educational diagram:

TITLE: ${diagramSpec.title || 'Educational Concept Diagram'}

CONTENT: ${diagramSpec.visualDescription || 'Visual flowchart of educational concepts'}

${diagramSpec.elements ? `
ELEMENTS TO INCLUDE:
${diagramSpec.elements.map((el: any, i: number) => `${i + 1}. ${el.label}: ${el.description}`).join('\n')}
` : ''}

${diagramSpec.connections ? `
SHOW THESE RELATIONSHIPS:
${diagramSpec.connections.map((conn: any) => `- ${conn.from} → ${conn.to}${conn.label ? ` (${conn.label})` : ''}`).join('\n')}
` : ''}

DESIGN REQUIREMENTS:
- Modern, professional infographic style
- Color scheme: ${diagramSpec.colorScheme || 'professional blue and white'}
- Clean typography with clear, readable labels
- Proper visual hierarchy
- Icons or simple illustrations for each concept
- Clear connections with arrows or lines
- White or light background
- Professional graphic design quality
- Suitable for educational presentations
- High contrast for readability
- Balanced, organized layout

Style: Professional educational infographic, modern flat design, clean and polished`;

        return {
            imagePrompt,
            description: diagramSpec.title || 'Professional Diagram'
        };

    } catch (error: any) {
        console.error('[Professional Diagram] Analysis failed:', error);

        // Fallback to simple diagram
        return {
            imagePrompt: `Create a professional educational flowchart diagram visualizing these concepts: ${sanitized.slice(0, 300)}. 
            
Use modern infographic style with:
- Clean, professional design
- Blue and white color scheme  
- Clear labels and text
- Icons for key concepts
- Logical flow with arrows
- High quality graphic design`,
            description: 'Educational Concept Diagram'
        };
    }
}
