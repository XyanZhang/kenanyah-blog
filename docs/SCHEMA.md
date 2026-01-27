# Database Schema

## Models

### User
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | Primary key |
| email | String | Unique |
| username | String | Unique |
| passwordHash | String? | Null for OAuth |
| name | String? | |
| bio | String? | |
| avatar | String? | |
| role | Enum | USER, ADMIN, MODERATOR |
| provider | Enum | local, google, github |
| providerId | String? | OAuth provider ID |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Post
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | Primary key |
| slug | String | Unique, SEO-friendly |
| title | String | |
| excerpt | String? | |
| content | Text | |
| coverImage | String? | |
| published | Boolean | |
| publishedAt | DateTime? | |
| viewCount | Integer | |
| authorId | FK | → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Category
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | Primary key |
| slug | String | Unique |
| name | String | |
| description | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Tag
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | Primary key |
| slug | String | Unique |
| name | String | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Comment
| Field | Type | Notes |
|-------|------|-------|
| id | CUID | Primary key |
| content | Text | |
| approved | Boolean | For moderation |
| postId | FK | → Post |
| authorId | FK | → User |
| parentId | FK? | → Comment (nested) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

## Relationships

```
User ──1:N──▶ Post
User ──1:N──▶ Comment
Post ──1:N──▶ Comment
Post ──M:N──▶ Category (via PostCategory)
Post ──M:N──▶ Tag (via PostTag)
Comment ──1:N──▶ Comment (nested replies)
```

## Indexes

- User: email, username
- Post: slug, authorId, published
- Category: slug
- Tag: slug
- Comment: postId, authorId, parentId
