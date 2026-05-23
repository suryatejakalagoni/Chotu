import AuthSceneClient from '@/components/auth/AuthSceneClient'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Thin server-component shell.
  // All visual logic (background, PNG, GSAP, card) lives in AuthSceneClient
  // so this layout stays serialisable and fast.
  return <AuthSceneClient>{children}</AuthSceneClient>
}
