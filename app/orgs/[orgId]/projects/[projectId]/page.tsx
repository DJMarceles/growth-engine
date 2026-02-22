import { redirect } from "next/navigation"

export default function OrgProjectRedirectPage({
  params,
}: {
  params: { orgId: string; projectId: string }
}) {
  redirect(`/dashboard?orgId=${params.orgId}&projectId=${params.projectId}`)
}
