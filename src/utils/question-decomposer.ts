import OpenAI from 'openai';
import { safeChatCompletion } from './openai-helpers.js';
import { QuestionDecomposition } from '../types/index.js';

export async function decomposeQuestion(
  openai: OpenAI,
  question: string,
  model: string = 'gpt-4o'
): Promise<QuestionDecomposition> {
  const prompt = `Analyze this question and determine if it is a complex multi-faceted question that should be decomposed into sub-questions for deeper analysis.

QUESTION: "${question}"

If the question is simple and focused (single dimension), return:
{ "is_complex": false, "sub_questions": [], "interaction_notes": "" }

If the question is complex (multiple interconnected dimensions), break it into 2-4 focused sub-questions. Each sub-question should:
- Address a distinct dimension of the original question
- Be answerable independently
- Contribute to the overall answer when synthesized

Return JSON:
{
  "is_complex": true/false,
  "sub_questions": [
    {
      "question": "The focused sub-question",
      "rationale": "Why this dimension matters for the overall question",
      "dependency": "Which other sub-questions this relates to (or 'none')"
    }
  ],
  "interaction_notes": "How the sub-questions interact and should be synthesized together"
}`;

  try {
    const completion = await safeChatCompletion(openai, {
      model,
      messages: [
        { role: 'system', content: 'You are a question analyst. Determine if questions need decomposition for thorough analysis. Return valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 800
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return { is_complex: false, sub_questions: [], interaction_notes: '' };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);

    return {
      is_complex: parsed.is_complex ?? false,
      sub_questions: Array.isArray(parsed.sub_questions) ? parsed.sub_questions : [],
      interaction_notes: parsed.interaction_notes || ''
    };
  } catch (error) {
    console.warn('Question decomposition failed:', error);
    return { is_complex: false, sub_questions: [], interaction_notes: '' };
  }
}
