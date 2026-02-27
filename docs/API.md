# API Reference

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register with email/password |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| POST | /auth/refresh | Refresh token |
| GET | /auth/google | Google OAuth |
| GET | /auth/github | GitHub OAuth |

### Register
```json
POST /auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword",
  "name": "John Doe"
}
```

### Login
```json
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

## Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /posts | No | List posts (paginated) |
| GET | /posts/:slug | No | Get post by slug |
| POST | /posts | Yes | Create post |
| PATCH | /posts/:id | Yes | Update post (author only) |
| DELETE | /posts/:id | Yes | Delete post (author only) |

### Query Parameters (GET /posts)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `category`: Filter by category slug
- `tag`: Filter by tag slug
- `published`: Filter by status

### Create Post
```json
POST /posts
{
  "title": "My Blog Post",
  "content": "Post content...",
  "excerpt": "Short description",
  "published": false,
  "categoryIds": ["cat1"],
  "tagIds": ["tag1"]
}
```

## Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /posts/:postId/comments | No | List comments |
| POST | /posts/:postId/comments | Yes | Create comment |
| PATCH | /comments/:id | Yes | Update (author only) |
| DELETE | /comments/:id | Yes | Delete (author only) |

### Create Comment
```json
POST /posts/:postId/comments
{
  "content": "Great post!",
  "parentId": "optional-parent-id"
}
```

## Categories & Tags

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /categories | No | List all |
| GET | /categories/:slug | No | Get with posts |
| POST | /categories | Admin | Create |
| GET | /tags | No | List all |
| GET | /tags/:slug | No | Get with posts |
| POST | /tags | Admin | Create |

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /users/:username | No | Get profile |
| PATCH | /users/:id | Yes | Update (own only) |

## AI（写作助手）

所有接口需要登录（Cookie 或 Bearer Token）。限流：每 IP 每分钟最多 30 次。

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /ai/rewrite | 段落改写 |
| POST | /ai/expand | 段落扩写 |
| POST | /ai/shrink | 段落缩写 |
| POST | /ai/headings | 根据正文生成小标题列表 |
| POST | /ai/summary | 根据正文生成摘要 |

### 流式与非流式

- 不加 query：返回 JSON `{ success, data: { text } }`。
- 加 `?stream=true`：响应为 SSE（`text/event-stream`），每行 `data: <文本块>` 逐块推送；错误时推送 `data: {"error":"..."}`。

### 请求体示例

**改写** `POST /ai/rewrite`
```json
{ "text": "待改写的段落", "style": "可选：更正式/更口语" }
```

**扩写** `POST /ai/expand`
```json
{ "text": "简短段落" }
```

**缩写** `POST /ai/shrink`
```json
{ "text": "长段落", "maxLength": 200 }
```

**小标题** `POST /ai/headings`
```json
{ "content": "文章正文" }
```

**摘要** `POST /ai/summary`
```json
{ "content": "文章正文" }
```

## Response Format

```json
{
  "success": true,
  "data": {...},
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```
