/**
 * Shepherd-style single model id: `provider/model`.
 * Examples: `opencode-go/beam-free`, `ollama/qwen3.5:4b`
 */
export type ProviderModel = {
  id: string
  provider: string
  model: string
}

export function parseProviderModel(id: string): ProviderModel {
  const trimmed = id.trim()
  const slash = trimmed.indexOf("/")
  if (slash <= 0 || slash === trimmed.length - 1) {
    throw new Error(`Use a single provider/model value, e.g. opencode-go/beam-free or ollama/qwen3.5:4b (got "${id}")`)
  }
  return {
    id: trimmed,
    provider: trimmed.slice(0, slash),
    model: trimmed.slice(slash + 1)
  }
}

export const DEFAULT_MODEL = "opencode-go/beam-free"

export const MODEL_SUGGESTIONS = ["opencode-go/beam-free", "opencode-go/deepseek-v4.1-flash"]
