# 可配置卡片式仪表盘系统 - 实施计划

## 项目概述

为 Next.js 15 博客应用实现一个可配置的卡片式仪表盘首页，支持拖拽布局、动画效果和持久化配置。

## 用户需求确认

- **卡片类型**: 个人简介、统计数据、分类/标签云、最近文章列表
- **初始布局**: 圆形布局（卡片围绕中心点呈圆形排列）
- **持久化**: LocalStorage + 后端 API 结合（先实现 LocalStorage，预留 API 接口）
- **编辑入口**: 浮动按钮切换编辑/查看模式

## 技术选型

### 核心依赖
- **拖拽**: `@dnd-kit/core` + `@dnd-kit/utilities` (现代、高性能、支持触摸)
- **动画**: `framer-motion` (声明式 API、弹簧物理、手势支持)
- **UI 组件**: `shadcn/ui` (button, dialog, select, tooltip, switch)
- **图标**: `lucide-react` (轻量级图标库)
- **状态管理**: Zustand (已安装，用于全局状态)

### 安装命令
```bash
pnpm add @dnd-kit/core @dnd-kit/utilities framer-motion lucide-react
pnpm add -D @dnd-kit/sortable
```

## 实施阶段

### Phase 1: 基础架构 (2-3h)

#### 1.1 类型定义和验证
**文件**: `packages/types/src/dashboard.ts`
```typescript
export enum CardSize {
  SMALL = 'small',    // 200x200
  MEDIUM = 'medium',  // 300x300
  LARGE = 'large',    // 400x400
  WIDE = 'wide',      // 600x300
  TALL = 'tall',      // 300x600
}

export enum CardType {
  PROFILE = 'profile',
  STATS = 'stats',
  CATEGORIES = 'categories',
  RECENT_POSTS = 'recent_posts',
}

export interface CardPosition {
  x: number
  y: number
  z: number
}

export interface DashboardCard {
  id: string
  type: CardType
  size: CardSize
  position: CardPosition
  config: Record<string, any>
  visible: boolean
  createdAt: Date
  updatedAt: Date
}

export interface DashboardLayout {
  id: string
  userId?: string
  cards: DashboardCard[]
  version: number
  createdAt: Date
  updatedAt: Date
}
```

**文件**: `packages/validation/src/dashboard.ts`
- 创建 Zod schemas: `cardSizeSchema`, `cardTypeSchema`, `dashboardCardSchema`, `dashboardLayoutSchema`
- 导出验证函数和类型

**文件**: `packages/types/src/index.ts` 和 `packages/validation/src/index.ts`
- 添加 dashboard 相关导出

#### 1.2 常量和工具函数
**文件**: `apps/web/src/lib/constants/dashboard.ts`
```typescript
export const CARD_DIMENSIONS = {
  small: { width: 200, height: 200 },
  medium: { width: 300, height: 300 },
  large: { width: 400, height: 400 },
  wide: { width: 600, height: 300 },
  tall: { width: 300, height: 600 },
}

export function getCardDimensions(size: CardSize) {
  return CARD_DIMENSIONS[size]
}

export const DEFAULT_LAYOUT_CONFIG = {
  radius: 300,
  startAngle: 0,
}
```

**文件**: `apps/web/src/lib/dashboard/layout-algorithms.ts`
- `generateCircularLayout()`: 圆形布局算法
- `generateSpiralLayout()`: 螺旋布局（备用）
- `generateGridLayout()`: 网格布局（编辑模式）
- `resolveCollisions()`: 碰撞检测和解决

**文件**: `apps/web/src/lib/dashboard/storage.ts`
- `loadLayout()`: 从 localStorage 加载
- `saveLayout()`: 保存到 localStorage
- `clearLayout()`: 清除配置
- `exportLayout()` / `importLayout()`: 导入导出功能

**文件**: `apps/web/src/lib/dashboard/card-registry.ts`
```typescript
// 卡片类型到组件的映射
export function getCardComponent(type: CardType) {
  const registry = {
    profile: ProfileCard,
    stats: StatsCard,
    categories: CategoriesCard,
    recent_posts: RecentPostsCard,
  }
  return registry[type]
}
```

#### 1.3 Zustand 状态管理
**文件**: `apps/web/src/store/dashboard-store.ts`
```typescript
interface DashboardState {
  // State
  layout: DashboardLayout | null
  cards: DashboardCard[]
  isEditMode: boolean
  isLoading: boolean
  selectedCardId: string | null

  // Actions
  loadLayout: () => Promise<void>
  saveLayout: () => Promise<void>
  addCard: (type: CardType, size: CardSize) => void
  removeCard: (cardId: string) => void
  updateCard: (cardId: string, updates: Partial<DashboardCard>) => void
  updateCardPosition: (cardId: string, delta: { x: number; y: number }) => void
  toggleEditMode: () => void
  selectCard: (cardId: string | null) => void
  resetLayout: () => void
}
```

**文件**: `apps/web/src/hooks/useDashboard.ts`
```typescript
export function useDashboard() {
  return useDashboardStore()
}
```

### Phase 2: UI 组件基础 (2-3h)

#### 2.1 安装 shadcn/ui 组件
```bash
# 初始化 shadcn/ui
npx shadcn@latest init

# 安装需要的组件
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add tooltip
npx shadcn@latest add switch
npx shadcn@latest add dropdown-menu
```

#### 2.2 自定义 Hooks
**文件**: `apps/web/src/hooks/useCardAnimation.ts`
```typescript
export const cardVariants = {
  hidden: { scale: 0, opacity: 0, rotate: -10 },
  visible: (index: number) => ({
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      delay: index * 0.1,
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  }),
  hover: { scale: 1.05 },
  tap: { scale: 0.95 },
}
```

**文件**: `apps/web/src/hooks/useCircularLayout.ts`
- 封装圆形布局应用逻辑

**文件**: `apps/web/src/hooks/useDragAndDrop.ts`
- 封装 @dnd-kit 拖拽逻辑

### Phase 3: 核心组件实现 (4-5h)

#### 3.1 主容器组件
**文件**: `apps/web/src/components/dashboard/Dashboard.tsx`
- 使用 `DndContext` 包裹
- 渲染所有可见卡片
- 处理拖拽结束事件
- 显示编辑模式控件

#### 3.2 卡片包装组件
**文件**: `apps/web/src/components/dashboard/DashboardCard.tsx`
- 使用 `useDraggable` hook
- 使用 `motion.div` 添加动画
- 根据 `card.type` 渲染对应内容组件
- 编辑模式下显示工具栏

#### 3.3 编辑模式控件
**文件**: `apps/web/src/components/dashboard/EditModeToggle.tsx`
- 浮动按钮（右下角）
- 切换编辑/查看模式
- 显示当前模式图标

**文件**: `apps/web/src/components/dashboard/CardToolbar.tsx`
- 卡片右上角工具栏
- 按钮：调整大小、删除、配置
- 仅在编辑模式显示

**文件**: `apps/web/src/components/dashboard/AddCardButton.tsx`
- 浮动添加按钮
- 打开卡片类型选择对话框
- 仅在编辑模式显示

**文件**: `apps/web/src/components/dashboard/CardConfigDialog.tsx`
- 卡片配置对话框
- 根据卡片类型显示不同配置项
- 保存配置到 store

### Phase 4: 卡片内容组件 (3-4h)

#### 4.1 个人简介卡片
**文件**: `apps/web/src/components/dashboard/cards/ProfileCard.tsx`
```typescript
interface ProfileCardConfig {
  showAvatar: boolean
  showBio: boolean
  showSocialLinks: boolean
}
```
- 显示头像、姓名、简介
- 社交媒体链接（GitHub, Twitter 等）
- 支持配置显示项

#### 4.2 统计数据卡片
**文件**: `apps/web/src/components/dashboard/cards/StatsCard.tsx`
```typescript
interface StatsCardConfig {
  metrics: ('posts' | 'views' | 'comments')[]
}
```
- 显示文章数、访问量、评论数
- 使用 API 获取实时数据
- 数字动画效果

#### 4.3 分类/标签云卡片
**文件**: `apps/web/src/components/dashboard/cards/CategoriesCard.tsx`
```typescript
interface CategoriesCardConfig {
  type: 'categories' | 'tags'
  limit: number
  showCount: boolean
}
```
- 显示分类或标签列表
- 点击跳转到对应页面
- 标签云样式（大小根据文章数）

#### 4.4 最近文章卡片
**文件**: `apps/web/src/components/dashboard/cards/RecentPostsCard.tsx`
```typescript
interface RecentPostsCardConfig {
  limit: number
  showExcerpt: boolean
  showDate: boolean
}
```
- 显示最新文章列表
- 文章标题、摘要、日期
- 点击跳转到文章详情

### Phase 5: 页面集成 (1-2h)

#### 5.1 首页
**文件**: `apps/web/src/app/page.tsx`
```typescript
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Dashboard />
    </main>
  )
}
```

#### 5.2 布局调整
**文件**: `apps/web/src/app/layout.tsx`
- 移除默认 padding/margin
- 确保全屏显示

### Phase 6: 样式和动画优化 (2-3h)

#### 6.1 全局样式
**文件**: `apps/web/src/styles/globals.css`
```css
@import 'tailwindcss';

@layer base {
  body {
    @apply overflow-hidden;
  }
}

@layer utilities {
  .card-shadow {
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.1);
  }

  .card-shadow-hover {
    box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.15);
  }
}
```

#### 6.2 动画配置
- 卡片进入动画：scale + opacity + rotate
- 拖拽时的视觉反馈：opacity 降低
- Hover 效果：scale 放大 + shadow 增强
- 过渡动画：使用 spring 物理效果

### Phase 7: 数据持久化 (1-2h)

#### 7.1 LocalStorage 实现
- 在 Zustand store 中使用 `persist` middleware
- 自动保存和恢复配置
- 版本迁移支持

#### 7.2 后端 API 预留
**文件**: `apps/api/src/routes/dashboard.ts` (暂不实现)
```typescript
// GET /dashboard/layout - 获取用户布局
// PUT /dashboard/layout - 保存用户布局
// DELETE /dashboard/layout - 重置布局
```

### Phase 8: 测试和优化 (2-3h)

#### 8.1 单元测试
**文件**: `apps/web/src/__tests__/lib/layout-algorithms.test.ts`
- 测试圆形布局算法
- 测试碰撞检测

**文件**: `apps/web/src/__tests__/store/dashboard-store.test.ts`
- 测试 store actions
- 测试持久化

#### 8.2 组件测试
**文件**: `apps/web/src/__tests__/components/Dashboard.test.tsx`
- 测试卡片渲染
- 测试编辑模式切换

#### 8.3 E2E 测试
**文件**: `apps/web/e2e/dashboard.spec.ts`
- 测试拖拽功能
- 测试添加/删除卡片
- 测试配置保存

## 关键文件路径

### 新增文件
```
packages/types/src/dashboard.ts
packages/validation/src/dashboard.ts
apps/web/src/store/dashboard-store.ts
apps/web/src/lib/constants/dashboard.ts
apps/web/src/lib/dashboard/layout-algorithms.ts
apps/web/src/lib/dashboard/storage.ts
apps/web/src/lib/dashboard/card-registry.ts
apps/web/src/hooks/useDashboard.ts
apps/web/src/hooks/useCardAnimation.ts
apps/web/src/hooks/useCircularLayout.ts
apps/web/src/hooks/useDragAndDrop.ts
apps/web/src/components/dashboard/Dashboard.tsx
apps/web/src/components/dashboard/DashboardCard.tsx
apps/web/src/components/dashboard/EditModeToggle.tsx
apps/web/src/components/dashboard/CardToolbar.tsx
apps/web/src/components/dashboard/AddCardButton.tsx
apps/web/src/components/dashboard/CardConfigDialog.tsx
apps/web/src/components/dashboard/cards/ProfileCard.tsx
apps/web/src/components/dashboard/cards/StatsCard.tsx
apps/web/src/components/dashboard/cards/CategoriesCard.tsx
apps/web/src/components/dashboard/cards/RecentPostsCard.tsx
```

### 修改文件
```
apps/web/src/app/page.tsx
apps/web/src/app/layout.tsx
apps/web/src/styles/globals.css
apps/web/package.json (添加依赖)
packages/types/src/index.ts
packages/validation/src/index.ts
```

## 验证计划

### 功能验证
1. **布局验证**
   - 启动 dev server: `pnpm dev`
   - 访问 http://localhost:3000
   - 确认卡片以圆形布局显示在页面中央
   - 确认卡片加载动画效果

2. **拖拽验证**
   - 点击右下角编辑按钮进入编辑模式
   - 拖拽卡片到不同位置
   - 确认位置实时更新
   - 退出编辑模式，确认位置保持

3. **配置验证**
   - 点击卡片工具栏的配置按钮
   - 修改卡片大小和配置
   - 确认更改立即生效
   - 刷新页面，确认配置持久化

4. **添加/删除验证**
   - 点击添加按钮
   - 选择卡片类型和大小
   - 确认新卡片出现
   - 删除卡片，确认移除

### 性能验证
- 检查动画流畅度（60fps）
- 检查拖拽响应速度
- 检查 localStorage 读写性能

### 兼容性验证
- Chrome/Edge (最新版)
- Firefox (最新版)
- Safari (最新版)
- 移动端触摸拖拽

## 实施顺序

1. **Phase 1**: 基础架构（类型、工具、状态管理）
2. **Phase 2**: UI 组件基础（shadcn/ui、hooks）
3. **Phase 3**: 核心组件（Dashboard、DashboardCard、编辑控件）
4. **Phase 4**: 卡片内容组件（4 种卡片类型）
5. **Phase 5**: 页面集成
6. **Phase 6**: 样式和动画优化
7. **Phase 7**: 数据持久化
8. **Phase 8**: 测试和优化

## 注意事项

1. **不可变性**: 所有状态更新遵循不可变模式
2. **类型安全**: 充分利用 TypeScript 类型系统
3. **性能优化**: 使用 React.memo 避免不必要的重渲染
4. **错误处理**: 添加 try-catch 和错误边界
5. **响应式设计**: 确保在不同屏幕尺寸下正常工作
6. **无障碍性**: 添加适当的 ARIA 标签
7. **代码复用**: 利用共享包避免重复代码

## 后续扩展

- 更多卡片类型（日历、搜索、快捷链接等）
- 卡片主题定制（颜色、背景）
- 多布局预设（网格、瀑布流等）
- 后端 API 集成（跨设备同步）
- 卡片分享功能
- 导入/导出布局配置
