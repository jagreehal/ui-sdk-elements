import type { Plugin } from "vite"
import { catalog } from "./src/catalog.ts"
import { generateSpec } from "./src/generate.ts"
import { DEFAULT_MODEL, MODEL_SUGGESTIONS, parseProviderModel } from "./src/model.ts"

async function readJson(req: import("http").IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  const raw = Buffer.concat(chunks).toString("utf8")
  return raw ? JSON.parse(raw) : {}
}

export function generateApiPlugin(): Plugin {
  return {
    name: "ui-sdk-generate-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          if (req.method === "GET" && req.url?.startsWith("/api/config")) {
            const model = process.env.UI_SDK_MODEL?.trim() || DEFAULT_MODEL
            let parsed = null
            try {
              parsed = parseProviderModel(model)
            } catch {
              parsed = null
            }
            res.setHeader("content-type", "application/json")
            res.end(
              JSON.stringify({
                model,
                provider: parsed?.provider ?? null,
                suggestions: MODEL_SUGGESTIONS,
                hasOpenCodeKey: Boolean(process.env.OPENCODE_API_KEY)
              })
            )
            return
          }

          if (req.method === "POST" && req.url?.startsWith("/api/generate")) {
            // JSON-only forces a CORS preflight, so other sites can't spend the API key with a simple POST.
            if (!req.headers["content-type"]?.startsWith("application/json")) {
              res.statusCode = 415
              res.end(JSON.stringify({ error: "content-type must be application/json" }))
              return
            }
            const body = await readJson(req)
            const model = String(body.model || process.env.UI_SDK_MODEL || DEFAULT_MODEL)
            const prompt = String(body.prompt || "").trim()
            if (!prompt) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: "prompt is required" }))
              return
            }
            try {
              parseProviderModel(model)
            } catch (error) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
              return
            }
            const system = catalog.prompt({
              mode: "standalone",
              customRules: ["Keep the page under 30 elements."]
            })

            const spec = await generateSpec({ model, system, prompt })
            const validated = catalog.validate(spec)
            res.setHeader("content-type", "application/json")
            if (!validated.success) {
              res.statusCode = 422
              res.end(
                JSON.stringify({
                  error: "Spec failed catalog validation",
                  issues: validated.error?.issues ?? [],
                  spec
                })
              )
              return
            }
            res.end(JSON.stringify({ model, spec: validated.data }))
            return
          }
        } catch (error) {
          res.statusCode = 500
          res.setHeader("content-type", "application/json")
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error)
            })
          )
          return
        }
        next()
      })
    }
  }
}
