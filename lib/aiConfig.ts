import prisma from "@/lib/prisma"

export interface AiConfig {
  provider: "anthropic"
  apiKey: string
  model: string
  orgId: string
}

export async function getAiConfigForProject(projectId: string): Promise<AiConfig | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true },
  })

  if (!project) return null

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  return {
    provider: "anthropic",
    apiKey,
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
    orgId: project.orgId,
  }
}
