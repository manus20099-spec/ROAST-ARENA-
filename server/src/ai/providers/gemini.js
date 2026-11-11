/**
 * Google Gemini over plain REST (no SDK). The key goes in a header, never in the URL.
 * Returns the raw text of the reply; the pipeline validates it.
 */
export function createGeminiProvider({ apiKey, model }) {
  return {
    name: 'gemini',
    async generate({ system, user, signal }) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
      if (!text) throw new Error('Gemini returned no text');
      return text;
    },
  };
}
