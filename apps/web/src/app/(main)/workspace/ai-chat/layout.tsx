import AiChatPageContent from '../../ai-chat/AiChatPageContent'

export default function WorkspaceAiChatLayout({
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
