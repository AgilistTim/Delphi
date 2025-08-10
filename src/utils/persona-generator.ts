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
}

export async function generatePersonas(
  openai: OpenAI,
  question: string,
  n: number = 5
): Promise<PersonaSpec[]> {
  const prompt = `Generate ${n} detailed expert personas for a Delphi panel discussion on the question: "${question}".
For each persona, provide:
- Name or role/title
- Domain expertise
- Perspective or bias
- Work background and history
- Education history
- 1-2 sentence justification for inclusion
- A detailed description (2–3 paragraphs) of their professional background, worldview, and approach to the Delphi topic
Return as a JSON array with keys: name, role, domain_expertise, perspective, work_background, education_history, justification, description.`;

  const completion = await safeChatCompletion(openai, {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert persona generator for Delphi panels.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
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
