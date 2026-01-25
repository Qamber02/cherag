export interface MentalModelResult {
    modelName: string;
    definition: string;
    application: string;
    steps: string[];
    insight: string;
}

export const MENTAL_MODEL_PROMPTS = {
    analysis: (content: string, model: 'first_principles' | 'second_order' | 'pareto' | 'inversion' | 'opportunity_cost') => `
You are a master of critical thinking tools. Analyze the provided content using the "${model.replace('_', ' ')}" mental model.

Content:
"${content.slice(0, 4000)}"

Definitions for context:
- First Principles: Break down a problem into its basic elements and reassemble them from the ground up.
- Second Order Thinking: Consider not just the immediate consequences, but the subsequent effects (And then what?).
- Pareto Principle (80/20): Identify the 20% of inputs/causes that produce 80% of the outputs/results.
- Inversion: Thinking forward and backward. Instead of asking how to do something, ask how to NOT do it (avoid failure).
- Opportunity Cost: Consider what is lost by choosing one option over another.

Response Format (JSON only):
{
  "modelName": "${model}",
  "definition": "Brief, one-sentence definition of the model in context of this content",
  "application": "How this model applies specifically to this topic",
  "steps": [
    "Step 1 of applying the thinking...",
    "Step 2...",
    "Step 3..."
  ],
  "insight": "A profound realization or 'aha moment' derived from this specific lens"
}

Ensure the analysis is specific to the content, not generic.
`
};
