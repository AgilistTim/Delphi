import { invokeModel, parseJsonFromText } from '../llm/invoke.js';
import type { CostTracker } from './cost-tracker.js';

export type EpistemicStance =
  | 'status_quo_defender'
  | 'methodology_skeptic'
  | 'implementation_realist'
  | 'ethics_maximalist'
  | 'contrarian_challenger'
  | 'evidence_synthesizer';

export interface PersonaSpec {
  name: string;
  role: string;
  domain_expertise: string;
  perspective: string;
  work_background: string;
  education_history: string;
  justification: string;
  description: string;
  epistemic_stance: EpistemicStance;
  initial_position_template?: string;
  age?: number;
  gender?: string;
  nationality?: string;
  location?: string;
  years_experience?: number;
  organization_type?: string;
  notable_achievements?: string[];
  potential_biases?: string[];
  communication_style?: string;
}

const PERSONA_SYSTEM =
  'You are an expert persona generator for Delphi panels. Generate diverse, realistic expert personas with comprehensive demographic and professional details. Always return valid JSON.';

export async function generatePersonas(
  question: string,
  n: number = 5,
  costTracker?: CostTracker
): Promise<PersonaSpec[]> {
  const prompt = `Generate ${n} highly detailed expert personas for a Delphi panel discussion on the question: "${question}".

For each persona, provide comprehensive demographic and professional details:

REQUIRED FIELDS:
- name: Full realistic name appropriate to their background
- role: Professional title/position
- domain_expertise: Primary area of expertise
- perspective: Their viewpoint or analytical lens
- work_background: Detailed career history (organizations, roles, achievements)
- education_history: Degrees, institutions, certifications
- justification: Why this expert is essential for this specific question
- description: 2-3 paragraphs on their professional background, worldview, and approach

EPISTEMIC STANCE (CRITICAL - assigns structural role in deliberation):
- epistemic_stance: MUST be one of these exact values:
  * "status_quo_defender" - Defends conventional wisdom, established practices, and mainstream consensus
  * "methodology_skeptic" - Questions the approach, framing, assumptions, and how the question is posed
  * "implementation_realist" - Focuses on practical barriers, real-world constraints, and what actually works
  * "ethics_maximalist" - Prioritizes ethical concerns, potential harms, and values-based reasoning
  * "contrarian_challenger" - Explicitly argues against the emerging majority position (REQUIRED: at least 1 persona)
  * "evidence_synthesizer" - Focuses on integrating diverse evidence sources and identifying gaps

- initial_position_template: A brief statement (1-2 sentences) of the DISTINCT initial position this expert will likely take. These MUST be meaningfully different across personas - avoid convergence toward safe/moderate positions.

STANCE DISTRIBUTION REQUIREMENTS (CRITICAL):
- You MUST include at least ONE "contrarian_challenger" who will argue against the majority
- You MUST include at least ONE "methodology_skeptic" who questions the framing
- The remaining personas should be distributed across other stances
- NO TWO personas should have the same epistemic_stance unless n > 6
- initial_position_templates MUST represent genuinely different viewpoints, not variations of the same safe answer

DEMOGRAPHIC DETAILS:
- age: Realistic age (number between 30-70)
- gender: Gender identity
- nationality: Country of origin/citizenship
- location: Current city/country of residence
- years_experience: Years in their field (number)
- organization_type: Type of organization they work for (e.g., "Fortune 500", "Academic Institution", "Government Agency", "NGO", "Startup", "Consultancy")
- notable_achievements: Array of 2-3 significant career accomplishments
- potential_biases: Array of 2-3 biases they might bring based on their background
- communication_style: How they typically communicate (e.g., "Data-driven and analytical", "Narrative and persuasive", "Cautious and methodical")

DIVERSITY REQUIREMENTS:
- Ensure diverse representation across gender, nationality, age, and organization types
- Include perspectives from different sectors (academic, industry, government, non-profit)
- Balance between established veterans and emerging voices
- The contrarian_challenger should have credentials that make their dissent credible, not dismissible

Return as a JSON array with all the keys listed above.`;

  const result = await invokeModel({
    tier: 'default',
    label: 'persona',
    system: PERSONA_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4000,
    temperature: 0.7,
    costTracker
  });

  const personas = parseJsonFromText<PersonaSpec[]>(result.text);
  if (!personas || !Array.isArray(personas) || personas.length === 0) {
    throw new Error('No personas generated / failed to parse persona JSON');
  }
  return personas;
}
