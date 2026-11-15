/** Browser helpers for Ollama model suggestions (generation goes through /api/generate). */

const baseURL = "window" in globalThis ? "/ollama" : "http://127.0.0.1:11434"

/** What Ollama's /api/tags answers with, as far as this demo reads it. */
type OllamaTags = { models?: { name: string }[] }

export async function listOllamaModels(): Promise<string[]> {
  const response = await fetch(`${baseURL}/api/tags`)
  if (!response.ok) throw new Error(`Ollama tags failed: ${response.status}`)
  const data: OllamaTags = await response.json()
  return (data.models ?? [])
    .map((model) => model.name)
    .filter((name) => !/embed|rerank/i.test(name))
    .map((name) => `ollama/${name}`)
}
