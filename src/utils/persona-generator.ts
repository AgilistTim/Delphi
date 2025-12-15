import OpenAI from 'openai';
import { safeChatCompletion } from './openai-helpers.js';

export interface PersonaSpec {
  name: string;
  role: string;
  domain_expertise: string;
  perspective: string;
  work_background: string;
  education_history: string;
  justification: string;
  description: string;
  // Enhanced demographic details
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

export async function generatePersonas(
  openai: OpenAI,
  question: string,
  n: number = 5
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
- Include at least one contrarian or unconventional perspective

Return as a JSON array with all the keys listed above.`;

  const completion = await safeChatCompletion(openai, {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert persona generator for Delphi panels. Generate diverse, realistic expert personas with comprehensive demographic and professional details. Always return valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 4000
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No persona generation response from OpenAI');

  // Extract JSON from the response
  let personas: PersonaSpec[] = [];
  try {
    const jsonMatch = content.match(/\[.*\]/s);
    const jsonString = jsonMatch ? jsonMatch[0] : content;
    personas = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Failed to parse persona JSON: ' + err);
  }

  // Basic validation
  if (!Array.isArray(personas) || personas.length === 0) {
    throw new Error('No personas generated');
  }
  return personas;
}
