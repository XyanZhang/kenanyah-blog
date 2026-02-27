// User validation
export {
  userRoleSchema,
  authProviderSchema,
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
} from './user'

// Auth validation
export {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from './auth'

// Post validation
export {
  createPostSchema,
  updatePostSchema,
  postFiltersSchema,
  postQuerySchema,
  type CreatePostInput,
  type UpdatePostInput,
  type PostFiltersInput,
  type PostQueryInput,
} from './post'

// Comment validation
export {
  createCommentSchema,
  updateCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
} from './comment'

// Category validation
export {
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './category'

// Tag validation
export {
  createTagSchema,
  updateTagSchema,
  type CreateTagInput,
  type UpdateTagInput,
} from './tag'

// AI validation
export {
  aiRewriteSchema,
  aiExpandSchema,
  aiShrinkSchema,
  aiHeadingsSchema,
  aiSummarySchema,
  aiGenerateArticleSchema,
  type AiRewriteInput,
  type AiExpandInput,
  type AiShrinkInput,
  type AiHeadingsInput,
  type AiSummaryInput,
  type AiGenerateArticleInput,
} from './ai'

// Dashboard validation
export {
  cardSizeSchema,
  cardTypeSchema,
  cardPositionSchema,
  dashboardCardSchema,
  dashboardLayoutSchema,
  profileCardConfigSchema,
  statsCardConfigSchema,
  categoriesCardConfigSchema,
  recentPostsCardConfigSchema,
  validateDashboardCard,
  validateDashboardLayout,
} from './dashboard'
