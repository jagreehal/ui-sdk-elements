import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { compileSpecStream } from "@json-render/core"
import { generateText } from "ai"
import { parseProviderModel, type ProviderModel } from "./model.ts"

function resolveLanguageModel(parsed: ProviderModel) {
  if (parsed.provider === "ollama") {
    return createOpenAICompatible({
      name: "ollama",
      baseURL: "http://127.0.0.1:11434/v1"
    }).chatModel(parsed.model)
  }

  if (parsed.provider === "opencode-go" || parsed.provider === "opencode") {
    const apiKey = process.env.OPENCODE_API_KEY
    if (!apiKey) {
      throw new Error("OPENCODE_API_KEY is not set (needed for opencode-go/…)")
    }
    const opencode = createOpenAICompatible({
      name: "opencode-go",
      baseURL: "https://opencode.ai/inference/go/openai/v1",
      apiKey,
      headers: {
        "x-opencode-session": crypto.randomUUID(),
        "User-Agent": "ui-sdk-elements/0.1"
      }
    })
    return opencode.chatModel(parsed.model)
  }

  throw new Error(`Unknown provider "${parsed.provider}". Supported: ollama, opencode-go, opencode`)
}

/** json-render's standard flow: catalog.prompt() asks for JSONL patches; core compiles them. The caller validates the result with catalog.validate. */
export async function generateSpec(options: {
  model: string
  system: string
  prompt: string
  abortSignal?: AbortSignal
}) {
  const parsed = parseProviderModel(options.model)
  const { text } = await generateText({
    model: resolveLanguageModel(parsed),
    system: options.system,
    prompt: options.prompt,
    abortSignal: options.abortSignal
  })
  // Models sometimes wrap the JSONL in a code fence; compileSpecStream skips lines that are not patches.
  const spec = compileSpecStream(text)
  if (!spec.root) throw new Error(`${parsed.id} returned no Spec patches`)
  return spec
}
