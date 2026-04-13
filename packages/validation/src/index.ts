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
  sendCodeSchema,
  verifyCodeSchema,
  setupProfileSchema,
  type LoginInput,
  type RegisterInput,
  type SendCodeInput,
  type VerifyCodeInput,
  type SetupProfileInput,
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
  aiGenerateCoverSchema,
  type AiRewriteInput,
  type AiExpandInput,
  type AiShrinkInput,
  type AiHeadingsInput,
  type AiSummaryInput,
  type AiGenerateArticleInput,
  type AiGenerateCoverInput,
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

// Countdown events
export {
  createCountdownEventSchema,
  updateCountdownEventSchema,
  type CreateCountdownEventInput,
  type UpdateCountdownEventInput,
} from './countdown'

// Calendar annotations
export {
  createCalendarAnnotationSchema,
  updateCalendarAnnotationSchema,
  calendarAnnotationQuerySchema,
  type CreateCalendarAnnotationInput,
  type UpdateCalendarAnnotationInput,
  type CalendarAnnotationQueryInput,
} from './calendarAnnotation'

// Calendar events
export {
  calendarEventSourceTypeSchema,
  calendarEventStatusSchema,
  calendarEventQuerySchema,
  createCalendarEventSchema,
  updateCalendarEventSchema,
  quickCreateCalendarEventSchema,
  type CalendarEventSourceTypeInput,
  type CalendarEventStatusInput,
  type CalendarEventQueryInput,
  type CreateCalendarEventInput,
  type UpdateCalendarEventInput,
  type QuickCreateCalendarEventInput,
} from './calendarEvent'

// Bookmarks
export {
  createBookmarkSchema,
  updateBookmarkSchema,
  bookmarkSyncSchema,
  type CreateBookmarkInput,
  type UpdateBookmarkInput,
  type BookmarkSyncInput,
  type BookmarkSyncItemInput,
} from './bookmark'
