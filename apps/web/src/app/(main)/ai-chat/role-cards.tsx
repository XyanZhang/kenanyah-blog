import { BookOpenText, Bot, Sparkles } from 'lucide-react'

export type ChatRoleCardId = 'general' | 'yijing-teacher' | 'ziwei-teacher'

export type ChatRoleCard = {
  id: ChatRoleCardId
  name: string
  shortName: string
  description: string
  headline: string
  intro: string
  placeholder: string
  logoUrl?: string
  icon: React.ReactNode
  accentClassName: string
  skills: string[]
  starters: string[]
  useKnowledgeBase: boolean
  useYijingAgent: boolean
}

export const CHAT_ROLE_CARDS: ChatRoleCard[] = [
  {
    id: 'general',
    name: '通用助手',
    shortName: '通用',
    description: '适合日常问答、写作、计划和轻量分析。',
    headline: '开始一段新的 AI 对话',
    intro: '适合快速问答、整理想法、写作润色和计划拆解。输入第一条消息后，我们再创建会话并进入完整对话视图。',
    placeholder: '输入你的问题，按 Enter 发送，Shift+Enter 换行…',
    icon: <Bot className="h-4 w-4" />,
    accentClassName: 'bg-accent-primary/12 text-accent-primary',
    skills: ['日常问答', '写作润色', '计划拆解'],
    starters: ['帮我整理今天的想法', '给我一个执行计划', '帮我润色这段文字'],
    useKnowledgeBase: false,
    useYijingAgent: false,
  },
  {
    id: 'yijing-teacher',
    name: '易经学习老师',
    shortName: '易经',
    description: '解释卦辞、爻辞和《易经》思想，适合循序学习。',
    headline: '和易经学习老师开始对话',
    intro: '适合围绕卦辞、爻辞、象传、彖传和《易经》思想做学习式交流。回答会优先结合已导入的《易经》原文。',
    placeholder: '问我易经原文、卦辞、爻辞或学习问题…',
    icon: <BookOpenText className="h-4 w-4" />,
    accentClassName: 'bg-accent-secondary-light text-accent-secondary',
    skills: ['原文解释', '逐卦学习', '文化参考'],
    starters: ['乾卦为什么说自强不息？', '帮我逐句解释坤卦', '蒙卦对学习有什么启发？'],
    useKnowledgeBase: true,
    useYijingAgent: true,
  },
  {
    id: 'ziwei-teacher',
    name: '紫微斗数老师',
    shortName: '紫微',
    description: '学习星曜、十二宫、四化和格局，适合循序理解紫微斗数。',
    headline: '和紫微斗数老师开始对话',
    intro: '适合围绕星曜、宫位、四化、格局、大限流年和《紫微斗数全书》资料做学习式交流。涉及命盘时会以文化参考和学习案例方式解释。',
    placeholder: '问我紫微斗数、命宫、星曜、四化或学习问题…',
    icon: <Sparkles className="h-4 w-4" />,
    accentClassName: 'bg-accent-primary-light text-accent-primary-dark',
    skills: ['星曜解释', '宫位学习', '文化参考'],
    starters: ['紫微星在命宫怎么理解？', '四化是什么意思？', '大限和流年有什么区别？'],
    useKnowledgeBase: true,
    useYijingAgent: false,
  },
]

export function getChatRoleCard(id: ChatRoleCardId): ChatRoleCard {
  return CHAT_ROLE_CARDS.find((role) => role.id === id) ?? CHAT_ROLE_CARDS[0]
}
