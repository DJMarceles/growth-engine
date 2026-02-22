import crypto from "crypto"

export function computePromptHash(params: {
  systemPrompt: string
  userInput: unknown
  model: string
}): string {
  const hourBucket = new Date()
  hourBucket.setMinutes(0, 0, 0)
  const payload = JSON.stringify({
    systemPrompt: params.systemPrompt,
    userInput: params.userInput,
    model: params.model,
    hourBucket: hourBucket.toISOString(),
  })
  return crypto.createHash("sha256").update(payload).digest("hex")
}
