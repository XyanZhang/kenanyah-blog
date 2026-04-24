import AiChatPageContent from './AiChatPageContent'

export default function AiChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AiChatPageContent />
      {children}
    </>
  )
}
