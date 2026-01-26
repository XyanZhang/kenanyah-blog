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
  type CreatePostInput,
  type UpdatePostInput,
  type PostFiltersInput,
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
