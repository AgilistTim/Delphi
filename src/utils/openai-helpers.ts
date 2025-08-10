import OpenAI from 'openai';

/**
 * Robust wrapper around openai.chat.completions.create that:
 * - Retries after transforming unsupported parameters (temperature, max_tokens/max_completion_tokens)
 * - Falls back to a known chat-completions model (gpt-4o) when model is invalid/unsupported or Responses-only
 * - Retries once with gpt-4o if a "successful" response contains no choices/message
 *
 * The logic runs in a small transform/retry loop so multiple issues in a single request
 * (e.g., both max_tokens and temperature unsupported) are handled in sequence.
 */
export async function safeChatCompletion(
  openai: OpenAI,
  req: any
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  // Clone to avoid mutating caller's object
  let r: any = { ...(req || {}) };

  // Helper to run a completion and post-validate choices
  const runOnce = async () => {
    const res = await openai.chat.completions.create(r);
    // Some Responses-only models may return an object with empty choices/content through chat API
    const noChoices = !res?.choices || res.choices.length === 0;
    const noMessage = !res?.choices?.[0]?.message;
    const noContent =
      !res?.choices?.[0]?.message?.content ||
      (typeof res.choices[0].message.content === 'string' &&
        res.choices[0].message.content.trim() === '');
    if (noChoices || noMessage || noContent) {
      if (r?.model && r.model !== 'gpt-4o') {
        console.warn(
          `Chat completion returned no usable text for model "${r.model}". Falling back to "gpt-4o" and retrying.`
        );
        r.model = 'gpt-4o';
        return await openai.chat.completions.create(r);
      }
    }
    return res;
  };

  // Try a few transformation attempts to satisfy API constraints
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await runOnce();
    } catch (err: any) {
      const code = err?.code || err?.error?.code;
      const param = err?.param || err?.error?.param;
      const msgFull = err?.message || String(err);
      const msg = msgFull.toLowerCase();

      // Temperature unsupported for this model
      if (
        (code === 'unsupported_value' || msg.includes('unsupported') || msg.includes('does not support')) &&
        (param === 'temperature' || msg.includes('temperature')) &&
        r?.temperature !== undefined
      ) {
        console.warn("Temperature not supported for this model; removing 'temperature' and retrying.");
        const { temperature, ...rest } = r;
        r = rest;
        continue;
      }

      // This model expects max_completion_tokens instead of max_tokens
      if (
        (code === 'unsupported_parameter' || msg.includes('unsupported parameter')) &&
        (param === 'max_tokens' || msg.includes('max_tokens')) &&
        r?.max_tokens !== undefined
      ) {
        console.warn("Model doesn't support 'max_tokens'; switching to 'max_completion_tokens' and retrying.");
        const { max_tokens, ...rest } = r;
        r = { ...rest, max_completion_tokens: max_tokens };
        continue;
      }

      // This model expects max_tokens instead of max_completion_tokens
      if (
        (code === 'unsupported_parameter' || msg.includes('unsupported parameter')) &&
        (param === 'max_completion_tokens' || msg.includes('max_completion_tokens')) &&
        r?.max_completion_tokens !== undefined
      ) {
        console.warn("Model doesn't support 'max_completion_tokens'; switching to 'max_tokens' and retrying.");
        const { max_completion_tokens, ...rest } = r;
        r = { ...rest, max_tokens: max_completion_tokens };
        continue;
      }

      // Invalid/unsupported model for chat.completions - fall back
      if (
        param === 'model' ||
        code === 'model_not_found' ||
        (msg.includes('model') && (msg.includes('not found') || msg.includes('does not exist') || msg.includes('unknown') || msg.includes('unsupported')))
      ) {
        console.warn(`Model "${r?.model}" not available for chat.completions; falling back to "gpt-4o" and retrying.`);
        r.model = 'gpt-4o';
        continue;
      }

      // Error suggests using Responses API -> fall back to gpt-4o (chat-safe)
      if (msg.includes('responses api') || msg.includes('use the responses') || msg.includes('responses endpoint')) {
        console.warn(`Model "${r?.model}" appears to require the Responses API; falling back to "gpt-4o" and retrying.`);
        r.model = 'gpt-4o';
        continue;
      }

      // Unknown/unhandled error - rethrow
      console.error('safeChatCompletion unhandled error:', {
        code,
        param,
        message: msgFull
      });
      throw err;
    }
  }

  // If we somehow exhausted retries
  throw new Error('safeChatCompletion failed after multiple transformation attempts.');
}
