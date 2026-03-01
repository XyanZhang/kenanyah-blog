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

## 语义搜索（Semantic Search）

基于文章向量化（pgvector + OpenAI Embedding）的语义检索，无需登录。

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /search/semantic | No | 按关键词语义搜索博客文章 |

### Query 参数

- `q`（必填）：搜索关键词，1～500 字符。
- `limit`（可选）：返回条数，默认 10，最大 20。

### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "postId": "clxx...",
      "title": "文章标题",
      "slug": "article-slug",
      "snippet": "匹配到的摘要或正文片段",
      "score": 0.92
    }
  ]
}
```

**说明**：需配置 `OPENAI_API_KEY` 与（可选）`OPENAI_EMBEDDING_MODEL`（默认 `text-embedding-3-small`）。数据库需启用 pgvector 扩展（见 docker-compose 使用 `pgvector/pgvector:pg16` 镜像）。新文章发布/更新时会自动建索引；已有文章可运行 `pnpm --filter api index-posts` 全量建索引。

## 首页配置与模板（Home）

当前通过环境变量 `DEFAULT_HOME_USER_ID` 写死用户；未设置时使用 `userId = null`（全局单条配置）。后期可改为从登录用户关联。

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /home/config | 拉取当前首页配置（layout + nav + canvas） |
| PUT | /home/config | 同步当前布局与导航到数据库 |
| GET | /home/templates | 用户保存的模板列表 |
| GET | /home/templates/:id | 获取单个模板（含 layout 用于应用） |
| POST | /home/templates | 另存为模板 |
| DELETE | /home/templates/:id | 删除模板 |

### PUT /home/config 请求体

```json
{
  "layout": { "id": "...", "cards": [...], "version": 2, "createdAt": "...", "updatedAt": "..." },
  "nav": { "horizontalPosition": {...}, "verticalPosition": {...}, "layout": "auto", "customSize": null, "visibleItems": ["..."] },
  "canvas": { "scale": 1 }
}
```

### POST /home/templates 请求体

```json
{
  "name": "模板名称",
  "description": "可选描述",
  "layout": { "id": "...", "cards": [...], "version": 2, ... }
}
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
