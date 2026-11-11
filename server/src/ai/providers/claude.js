/**
 * Anthropic Claude over plain REST (no SDK).
 * Returns the raw text of the reply; the pipeline validates it.
 */
export function createClaudeProvider({ apiKey, model }) {
  return {
    name: 'claude',
    async generate({ system, user, signal }) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          temperature: 0.9,
          system,
          messages: [{ role: 'user', content: user }],
        }),
      });
      if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.content?.filter((b) => b.type === 'text').map((b) => b.text).join('');
      if (!text) throw new Error('Claude returned no text');
      return text;
    },
  };
}
