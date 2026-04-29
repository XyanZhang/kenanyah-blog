# API Reference

The Hono API is mounted under `/api`. Uploaded files and static files are served
outside the API prefix:

- API: `/api/*`
- Uploads: `/uploads/*`
- Statics: `/statics/*`

Most endpoints return:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

## Health

| Method | Endpoint      | Auth | Description                |
| ------ | ------------- | ---- | -------------------------- |
| GET    | `/api/health` | No   | Health check               |
| GET    | `/api/`       | No   | API root and route summary |

## Public Auth

| Method | Endpoint                  | Auth         | Description                  |
| ------ | ------------------------- | ------------ | ---------------------------- |
| POST   | `/api/auth/register`      | No           | Register with email/password |
| POST   | `/api/auth/login`         | No           | Login                        |
| POST   | `/api/auth/logout`        | User         | Logout                       |
| POST   | `/api/auth/refresh`       | Cookie/token | Refresh tokens               |
| GET    | `/api/auth/me`            | User         | Current user                 |
| POST   | `/api/auth/send-code`     | No           | Send email verification code |
| POST   | `/api/auth/verify-code`   | No           | Verify email code            |
| POST   | `/api/auth/setup-profile` | User         | Complete profile setup       |

## Posts

| Method | Endpoint                     | Auth         | Description            |
| ------ | ---------------------------- | ------------ | ---------------------- |
| GET    | `/api/posts`                 | No           | List posts             |
| GET    | `/api/posts/published-dates` | No           | Published date summary |
| GET    | `/api/posts/stats`           | No           | Public post stats      |
| GET    | `/api/posts/by-id/:id`       | No           | Get post by id         |
| GET    | `/api/posts/:slug`           | No           | Get post by slug       |
| POST   | `/api/posts`                 | User         | Create post            |
| PATCH  | `/api/posts/:id`             | Author/Admin | Update post            |
| DELETE | `/api/posts/:id`             | Author/Admin | Delete post            |

Common list query parameters include `page`, `limit`, `category`, `tag`, and
`published`.

## Categories, Tags, Comments, Users

| Method | Endpoint                     | Auth            | Description                |
| ------ | ---------------------------- | --------------- | -------------------------- |
| GET    | `/api/categories`            | No              | List categories            |
| GET    | `/api/categories/:slug`      | No              | Category detail with posts |
| POST   | `/api/categories`            | Admin           | Create category            |
| PATCH  | `/api/categories/:id`        | Admin           | Update category            |
| DELETE | `/api/categories/:id`        | Admin           | Delete category            |
| GET    | `/api/tags`                  | No              | List tags                  |
| GET    | `/api/tags/:slug`            | No              | Tag detail with posts      |
| POST   | `/api/tags`                  | Admin           | Create tag                 |
| PATCH  | `/api/tags/:id`              | Admin           | Update tag                 |
| DELETE | `/api/tags/:id`              | Admin           | Delete tag                 |
| GET    | `/api/comments/post/:postId` | No              | List comments for post     |
| POST   | `/api/comments`              | User            | Create comment             |
| PATCH  | `/api/comments/:id`          | Author/Admin    | Update comment             |
| DELETE | `/api/comments/:id`          | Author/Admin    | Delete comment             |
| PATCH  | `/api/comments/:id/approve`  | Admin/Moderator | Moderate comment           |
| GET    | `/api/users/:username`       | No              | User profile               |
| GET    | `/api/users/:username/posts` | No              | User posts                 |
| PATCH  | `/api/users/:id`             | Owner/Admin     | Update user                |

## Home Dashboard

| Method | Endpoint                  | Auth | Description                                   |
| ------ | ------------------------- | ---- | --------------------------------------------- |
| GET    | `/api/home/config`        | No   | Load dashboard layout, nav, canvas, and theme |
| PUT    | `/api/home/config`        | User | Save dashboard config                         |
| GET    | `/api/home/templates`     | User | List saved layout templates                   |
| GET    | `/api/home/templates/:id` | User | Load a template                               |
| POST   | `/api/home/templates`     | User | Save a new template                           |
| DELETE | `/api/home/templates/:id` | User | Delete a template                             |

## AI Writing

AI writing endpoints are rate-limited and support normal JSON responses. Some
routes also support streaming.

| Method | Endpoint                   | Description              |
| ------ | -------------------------- | ------------------------ |
| POST   | `/api/ai/rewrite`          | Rewrite text             |
| POST   | `/api/ai/expand`           | Expand text              |
| POST   | `/api/ai/shrink`           | Shorten text             |
| POST   | `/api/ai/headings`         | Generate headings        |
| POST   | `/api/ai/summary`          | Generate summary         |
| POST   | `/api/ai/generate-article` | Generate a draft article |
| POST   | `/api/ai/recommend-theme`  | Recommend article theme  |
| POST   | `/api/ai/generate-cover`   | Generate cover image     |

## Chat and Blog Workflow

| Method | Endpoint                                                             | Auth     | Description            |
| ------ | -------------------------------------------------------------------- | -------- | ---------------------- |
| GET    | `/api/chat/conversations`                                            | Optional | List conversations     |
| POST   | `/api/chat/conversations`                                            | Optional | Create conversation    |
| PATCH  | `/api/chat/conversations/:id`                                        | Optional | Update conversation    |
| DELETE | `/api/chat/conversations/:id`                                        | Optional | Delete conversation    |
| GET    | `/api/chat/conversations/:id`                                        | Optional | Get conversation       |
| GET    | `/api/chat/conversations/:id/messages/:messageId/share-preview`      | Optional | Message share preview  |
| POST   | `/api/chat/conversations/:id/branch`                                 | Optional | Branch conversation    |
| POST   | `/api/chat/conversations/:id/messages/stream`                        | Optional | Stream chat response   |
| POST   | `/api/chat/conversations/:id/messages/:messageId/edit-resend/stream` | Optional | Edit and resend        |
| POST   | `/api/chat/conversations/:id/messages/:messageId/retry/stream`       | Optional | Retry message          |
| POST   | `/api/blog-workflow/run`                                             | Optional | Run blog workflow      |
| POST   | `/api/blog-workflow/run/stream`                                      | Optional | Stream blog workflow   |
| POST   | `/api/blog-workflow/cancel`                                          | Optional | Cancel active workflow |

## Search

| Method | Endpoint               | Auth | Description                  |
| ------ | ---------------------- | ---- | ---------------------------- |
| GET    | `/api/search/semantic` | No   | Semantic search across posts |

Query parameters:

- `q`: search text.
- `limit`: optional result limit.

Embeddings require a configured embedding provider and pgvector.

## PDF Agent

| Method | Endpoint                              | Auth     | Description                  |
| ------ | ------------------------------------- | -------- | ---------------------------- |
| GET    | `/api/pdf/documents`                  | Optional | List documents               |
| POST   | `/api/pdf/documents`                  | Optional | Upload document              |
| POST   | `/api/pdf/documents/:id/parse`        | Optional | Parse document               |
| DELETE | `/api/pdf/documents/:id`              | Optional | Delete document              |
| POST   | `/api/pdf/documents/:id/index`        | Optional | Index chunks                 |
| GET    | `/api/pdf/documents/:id/search`       | Optional | Search document              |
| POST   | `/api/pdf/documents/:id/generate-doc` | Optional | Generate draft from document |
| POST   | `/api/pdf/documents/:id/save-post`    | User     | Save generated draft as post |

## Bookmarks

| Method | Endpoint                   | Auth | Description                 |
| ------ | -------------------------- | ---- | --------------------------- |
| GET    | `/api/bookmarks`           | No   | List bookmarks              |
| GET    | `/api/bookmarks/metadata`  | No   | Bookmark metadata           |
| POST   | `/api/bookmarks/sync`      | No   | Sync from browser extension |
| POST   | `/api/bookmarks`           | No   | Create bookmark             |
| GET    | `/api/bookmarks/:id/check` | No   | Check bookmark URL          |
| PATCH  | `/api/bookmarks/:id`       | No   | Update bookmark             |
| DELETE | `/api/bookmarks/:id`       | No   | Delete bookmark             |

## Thoughts, Pictures, Projects

| Method | Endpoint                  | Auth         | Description                     |
| ------ | ------------------------- | ------------ | ------------------------------- |
| GET    | `/api/thoughts`           | No           | List thoughts                   |
| POST   | `/api/thoughts`           | User         | Create thought                  |
| GET    | `/api/thoughts/semantic`  | No           | Semantic thought search         |
| POST   | `/api/thoughts/rag`       | No           | Thought RAG answer              |
| POST   | `/api/thoughts/images`    | User         | Upload thought image            |
| POST   | `/api/thoughts/ai/assist` | User         | Generate or polish thought text |
| GET    | `/api/thoughts/:id`       | No           | Thought detail                  |
| PATCH  | `/api/thoughts/:id`       | Author/Admin | Update thought                  |
| DELETE | `/api/thoughts/:id`       | Author/Admin | Delete thought                  |
| GET    | `/api/pictures`           | No           | Public pictures summary         |
| GET    | `/api/pictures/entries`   | No           | List picture entries            |
| POST   | `/api/pictures/entries`   | User         | Create picture entry            |
| POST   | `/api/pictures/upload`    | User         | Upload picture                  |
| GET    | `/api/projects`           | No           | List projects                   |
| POST   | `/api/projects`           | User         | Create project                  |

## Calendar, Countdown, Weather, Voice

| Method | Endpoint                            | Auth     | Description                    |
| ------ | ----------------------------------- | -------- | ------------------------------ |
| GET    | `/api/calendar/annotations`         | User     | List calendar annotations      |
| POST   | `/api/calendar/annotations`         | User     | Create annotation              |
| PATCH  | `/api/calendar/annotations/:id`     | User     | Update annotation              |
| DELETE | `/api/calendar/annotations/:id`     | User     | Delete annotation              |
| GET    | `/api/calendar/events/summary`      | Optional | Event summary                  |
| GET    | `/api/calendar/events`              | Optional | List events                    |
| GET    | `/api/calendar/day/:date`           | Optional | Day detail                     |
| POST   | `/api/calendar/events`              | User     | Create event                   |
| PATCH  | `/api/calendar/events/:id`          | User     | Update event                   |
| DELETE | `/api/calendar/events/:id`          | User     | Delete event                   |
| POST   | `/api/calendar/events/quick-create` | User     | Natural-language quick create  |
| GET    | `/api/countdown/events`             | User     | List countdown events          |
| POST   | `/api/countdown/events`             | User     | Create countdown event         |
| PATCH  | `/api/countdown/events/:id`         | User     | Update countdown event         |
| DELETE | `/api/countdown/events/:id`         | User     | Delete countdown event         |
| GET    | `/api/weather`                      | No       | Weather lookup                 |
| GET    | `/api/weather/geocode`              | No       | Geocode lookup                 |
| POST   | `/api/voice/upload`                 | User     | Upload voice file              |
| POST   | `/api/voice/transcribe`             | User     | Transcribe uploaded voice file |

## Admin API

Admin endpoints are mounted under `/api/admin` and use admin authentication.

| Area       | Main Endpoints                                           |
| ---------- | -------------------------------------------------------- |
| Auth       | `/api/admin/auth/login`, `/logout`, `/refresh`, `/me`    |
| Dashboard  | `/api/admin/dashboard/*`                                 |
| Posts      | `/api/admin/posts`, `/api/admin/posts/:id`               |
| Comments   | `/api/admin/comments`, `/api/admin/comments/:id`         |
| Categories | `/api/admin/categories`, `/api/admin/categories/:id`     |
| Tags       | `/api/admin/tags`, `/api/admin/tags/:id`                 |
| Media      | `/api/admin/media`, `/api/admin/media/upload`            |
| Bookmarks  | `/api/admin/bookmarks`, metadata, check, enrich, convert |
| Thoughts   | `/api/admin/thoughts`, `/api/admin/thoughts/:id`         |
| Projects   | `/api/admin/projects`, `/api/admin/projects/:id`         |
| Photos     | `/api/admin/photos`, upload, update, delete              |

## Files

| Method | Endpoint     | Auth | Description                                       |
| ------ | ------------ | ---- | ------------------------------------------------- |
| GET    | `/uploads/*` | No   | Serve uploaded files                              |
| GET    | `/statics/*` | No   | Serve static files, with optional transform query |

Static transforms support parameters such as width, height, quality, fit, and
format where implemented by the route.
