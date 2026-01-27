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
