# API Reference Documentation

## DeckShala — AI Presentation Platform

> Complete API documentation for all endpoints, authentication, and usage examples

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Presentation Endpoints](#presentation-endpoints)
4. [Smart Features](#smart-features)
5. [Template Management](#template-management)
6. [Theme Management](#theme-management)
7. [Brand Kit](#brand-kit)
8. [Webhook Management](#webhook-management)
9. [Version Control](#version-control)
10. [Export Operations](#export-operations)
11. [Health & Monitoring](#health--monitoring)
12. [Error Handling](#error-handling)
13. [Rate Limiting](#rate-limiting)

---

## 1. Getting Started

### Base URL

```
Production: https://deckshala.com
Development: http://localhost:3000
```

### Request Format

All API requests must include:

- `Content-Type: application/json`
- `Authorization` header with session token (where required)

### Response Format

All responses return JSON in the following format:

```typescript
{
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}
```

---

## 2. Authentication

### Sign In

Initiates OAuth authentication flow with Google.

**Endpoint:** `GET /auth/signin`

**Query Parameters:**

- `callbackUrl` (optional): URL to redirect after authentication

**Response:**
Redirects to Google OAuth consent screen

**Example:**

```bash
curl -X GET "http://localhost:3000/auth/signin?callbackUrl=/presentation"
```

---

### Get Session

Retrieves current user session.

**Endpoint:** `GET /api/auth/session`

**Headers:**

```
Cookie: next-auth.session-token=<session_token>
```

**Response:**

```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://...",
    "role": "USER"
  },
  "expires": "2026-03-02T00:00:00.000Z"
}
```

---

### Sign Out

Ends the current user session.

**Endpoint:** `POST /auth/signout`

**Response:**
Redirects to `/auth/signin`

---

## 3. Presentation Endpoints

### Create Presentation

Creates a new presentation with AI-generated content.

**Endpoint:** `POST /api/presentation/create`

**Request Body:**

```typescript
{
  title: string;
  description?: string;
  topic: string;
  numberOfSlides: number;
  targetAudience?: string;
  tone?: 'professional' | 'casual' | 'academic' | 'creative';
  templateId?: string;
  themeId?: string;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "pres-123",
    "title": "AI Technology Overview",
    "authorId": "user-123",
    "content": {
      "slides": [...],
      "theme": {...}
    },
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  }
}
```

**Example:**

```bash
curl -X POST "http://localhost:3000/api/presentation/create" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "title": "AI in Healthcare",
    "topic": "Artificial Intelligence applications in medical field",
    "numberOfSlides": 10,
    "targetAudience": "Healthcare professionals",
    "tone": "professional"
  }'
```

---

### Get Presentation

Retrieves a specific presentation by ID.

**Endpoint:** `GET /api/presentation/:id`

**Path Parameters:**

- `id`: Presentation ID

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "pres-123",
    "title": "AI Technology Overview",
    "description": "Comprehensive overview of AI technologies",
    "content": {
      "slides": [
        {
          "id": "slide-1",
          "content": [
            {
              "type": "h1",
              "children": [{ "text": "Introduction to AI" }]
            }
          ]
        }
      ],
      "theme": {
        "primary": "#007bff",
        "secondary": "#6c757d"
      }
    },
    "isPublic": false,
    "authorId": "user-123",
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:35:00.000Z"
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/api/presentation/pres-123" \
  -H "Cookie: next-auth.session-token=<token>"
```

---

### List Presentations

Retrieves all presentations for the authenticated user.

**Endpoint:** `GET /api/presentation/list`

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)
- `search` (optional): Search by title
- `sortBy` (optional): `createdAt` | `updatedAt` | `title` (default: `updatedAt`)
- `order` (optional): `asc` | `desc` (default: `desc`)

**Response:**

```json
{
  "success": true,
  "data": {
    "presentations": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/api/presentation/list?page=1&limit=10&search=AI" \
  -H "Cookie: next-auth.session-token=<token>"
```

---

### Update Presentation

Updates an existing presentation.

**Endpoint:** `PUT /api/presentation/:id`

**Path Parameters:**

- `id`: Presentation ID

**Request Body:**

```typescript
{
  title?: string;
  description?: string;
  content?: any;
  isPublic?: boolean;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "pres-123",
    "title": "Updated Title",
    "updatedAt": "2026-02-02T11:00:00.000Z"
  }
}
```

**Example:**

```bash
curl -X PUT "http://localhost:3000/api/presentation/pres-123" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "title": "Updated Presentation Title",
    "description": "New description"
  }'
```

---

### Delete Presentation

Deletes a presentation.

**Endpoint:** `DELETE /api/presentation/:id`

**Path Parameters:**

- `id`: Presentation ID

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Presentation deleted successfully"
  }
}
```

**Example:**

```bash
curl -X DELETE "http://localhost:3000/api/presentation/pres-123" \
  -H "Cookie: next-auth.session-token=<token>"
```

---

## 4. Smart Features

### Parse Content

Parses text, URL, or file content into presentation structure.

**Endpoint:** `POST /api/smart/parse-content`

**Request Body:**

```typescript
{
  type: 'text' | 'url' | 'file';
  content: string; // Text content or URL
  options?: {
    extractImages?: boolean;
    maxSlides?: number;
  };
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "slides": [
      {
        "title": "Introduction",
        "content": "Overview of the topic...",
        "points": ["Point 1", "Point 2"]
      }
    ],
    "metadata": {
      "wordCount": 500,
      "estimatedDuration": "10 minutes"
    }
  }
}
```

**Example:**

```bash
curl -X POST "http://localhost:3000/api/smart/parse-content" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "type": "text",
    "content": "AI is transforming technology. Machine learning enables computers to learn from data.",
    "options": {
      "maxSlides": 5
    }
  }'
```

---

### Auto Design

Applies automatic design to slides.

**Endpoint:** `POST /api/smart/auto-design`

**Request Body:**

```typescript
{
  slides: Array<any>;
  options?: {
    style?: 'modern' | 'classic' | 'minimal' | 'creative';
    colorScheme?: 'auto' | string;
    branding?: {
      logo?: string;
      primaryColor?: string;
      secondaryColor?: string;
    };
  };
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "designedSlides": [...],
    "theme": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "fonts": {
        "heading": "Inter",
        "body": "Open Sans"
      }
    }
  }
}
```

---

### Analyze Slide

Gets AI suggestions for improving a slide.

**Endpoint:** `POST /api/smart/analyze-slide`

**Request Body:**

```typescript
{
  slideContent: any;
  context?: string;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "content",
        "message": "Consider adding more visual elements",
        "priority": "medium"
      },
      {
        "type": "design",
        "message": "Text is too dense, consider breaking into bullet points",
        "priority": "high"
      }
    ],
    "score": 7.5
  }
}
```

---

## 5. Template Management

### List Templates

Retrieves available presentation templates.

**Endpoint:** `GET /api/template/list`

**Query Parameters:**

- `category` (optional): Filter by category
- `isPublic` (optional): Filter by public status

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "tmpl-123",
      "name": "Business Pitch",
      "description": "Professional business pitch template",
      "category": "business",
      "thumbnail": "https://...",
      "isPublic": true
    }
  ]
}
```

---

### Get Template

Retrieves a specific template.

**Endpoint:** `GET /api/template/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "tmpl-123",
    "name": "Business Pitch",
    "content": {
      "slides": [...]
    },
    "metadata": {...}
  }
}
```

---

### Create Template

Creates a new template from existing presentation.

**Endpoint:** `POST /api/template/create`

**Request Body:**

```typescript
{
  name: string;
  description: string;
  category: string;
  presentationId: string;
  isPublic: boolean;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "tmpl-456",
    "name": "New Template",
    "createdAt": "2026-02-02T12:00:00.000Z"
  }
}
```

---

## 6. Theme Management

### List Themes

Retrieves available themes.

**Endpoint:** `GET /api/theme/list`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "theme-123",
      "name": "Modern Blue",
      "colors": {
        "primary": "#007bff",
        "secondary": "#6c757d"
      },
      "fonts": {
        "heading": "Inter",
        "body": "Open Sans"
      }
    }
  ]
}
```

---

### Apply Theme

Applies a theme to a presentation.

**Endpoint:** `POST /api/theme/apply`

**Request Body:**

```typescript
{
  presentationId: string;
  themeId: string;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Theme applied successfully"
  }
}
```

---

## 7. Brand Kit

### Get Brand Kit

Retrieves user's brand kit.

**Endpoint:** `GET /api/brandkit`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "bk-123",
    "userId": "user-123",
    "logo": "https://...",
    "primaryColor": "#ff5733",
    "secondaryColor": "#33c4ff",
    "fonts": {
      "primary": "Roboto",
      "secondary": "Open Sans"
    },
    "guidelines": "Use primary color for headers..."
  }
}
```

---

### Create Brand Kit

Creates or updates brand kit.

**Endpoint:** `POST /api/brandkit`

**Request Body:**

```typescript
{
  logo?: string;
  primaryColor: string;
  secondaryColor?: string;
  fonts?: {
    primary: string;
    secondary?: string;
  };
  guidelines?: string;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "bk-123",
    "createdAt": "2026-02-02T13:00:00.000Z"
  }
}
```

---

## 8. Webhook Management

### List Webhooks

Retrieves all webhooks for the user.

**Endpoint:** `GET /api/webhook/list`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "wh-123",
      "url": "https://example.com/webhook",
      "events": ["presentation.created", "presentation.updated"],
      "isActive": true,
      "lastTriggered": "2026-02-02T10:00:00.000Z"
    }
  ]
}
```

---

### Create Webhook

Creates a new webhook.

**Endpoint:** `POST /api/webhook/create`

**Request Body:**

```typescript
{
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "wh-456",
    "secret": "whsec_..."
  }
}
```

---

### Test Webhook

Sends a test event to webhook.

**Endpoint:** `POST /api/webhook/:id/test`

**Response:**

```json
{
  "success": true,
  "data": {
    "status": 200,
    "responseTime": 145,
    "message": "Test successful"
  }
}
```

---

## 9. Version Control

### List Versions

Retrieves version history for a presentation.

**Endpoint:** `GET /api/version/list/:presentationId`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "ver-123",
      "version": 3,
      "changeDescription": "Updated slide 2",
      "createdAt": "2026-02-02T11:00:00.000Z"
    }
  ]
}
```

---

### Create Version

Creates a new version snapshot.

**Endpoint:** `POST /api/version/create`

**Request Body:**

```typescript
{
  presentationId: string;
  changeDescription: string;
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "ver-456",
    "version": 4
  }
}
```

---

### Restore Version

Restores a previous version.

**Endpoint:** `POST /api/version/restore/:versionId`

**Response:**

```json
{
  "success": true,
  "data": {
    "message": "Version restored successfully"
  }
}
```

---

## 10. Export Operations

### Export PDF

Exports presentation to PDF format.

**Endpoint:** `POST /api/export/pdf`

**Request Body:**

```typescript
{
  presentationId: string;
  options?: {
    includeNotes?: boolean;
    slidesPerPage?: 1 | 2 | 4;
  };
}
```

**Response:**
Returns PDF file as binary stream

**Example:**

```bash
curl -X POST "http://localhost:3000/api/export/pdf" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{"presentationId": "pres-123"}' \
  --output presentation.pdf
```

---

### Export PPTX

Exports presentation to PowerPoint format.

**Endpoint:** `POST /api/export/pptx`

**Request Body:**

```typescript
{
  presentationId: string;
  options?: {
    includeNotes?: boolean;
    preserveAnimations?: boolean;
  };
}
```

**Response:**
Returns PPTX file as binary stream

---

## 11. Health & Monitoring

### Health Check

Checks system health status.

**Endpoint:** `GET /api/health`

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-02-02T14:00:00.000Z",
  "checks": {
    "database": true,
    "ollama": true,
    "redis": true,
    "memory": 45
  },
  "uptime": 86400,
  "version": "1.0.0"
}
```

---

### Cache Statistics

Retrieves cache performance metrics.

**Endpoint:** `GET /api/cache/stats`

**Response:**

```json
{
  "success": true,
  "data": {
    "presentationCache": {
      "hits": 1250,
      "misses": 180,
      "hitRate": 0.874,
      "size": 342
    },
    "aiCache": {
      "hits": 890,
      "misses": 110,
      "hitRate": 0.89,
      "size": 156
    }
  }
}
```

---

## 12. Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "meta": {
    "timestamp": "2026-02-02T14:00:00.000Z",
    "requestId": "req-123"
  }
}
```

### Common Error Codes

| Code                  | Status | Description                       |
| --------------------- | ------ | --------------------------------- |
| `UNAUTHORIZED`        | 401    | Missing or invalid authentication |
| `FORBIDDEN`           | 403    | Insufficient permissions          |
| `NOT_FOUND`           | 404    | Resource not found                |
| `VALIDATION_ERROR`    | 400    | Invalid request data              |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests                 |
| `SERVER_ERROR`        | 500    | Internal server error             |

---

## 13. Rate Limiting

### Rate Limit Headers

All API responses include rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706882400
```

### Rate Limits by Endpoint

| Endpoint Category | Limit        | Window     |
| ----------------- | ------------ | ---------- |
| Authentication    | 5 requests   | 15 minutes |
| API Endpoints     | 100 requests | 15 minutes |
| AI Operations     | 10 requests  | 1 minute   |
| Export Operations | 20 requests  | 1 hour     |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 300
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { PresentationClient } from "@deckshala/presentation-sdk";

const client = new PresentationClient({
  baseURL: "https://presentation.example.com",
  sessionToken: "your-session-token",
});

// Create presentation
const presentation = await client.presentations.create({
  title: "My Presentation",
  topic: "AI Technology",
  numberOfSlides: 10,
});

// Get presentation
const data = await client.presentations.get("pres-123");

// List presentations
const list = await client.presentations.list({ page: 1, limit: 20 });
```

### Python

```python
from deckshala import PresentationClient

client = PresentationClient(
    base_url='https://presentation.example.com',
    session_token='your-session-token'
)

# Create presentation
presentation = client.presentations.create(
    title='My Presentation',
    topic='AI Technology',
    number_of_slides=10
)

# Get presentation
data = client.presentations.get('pres-123')
```

---

## Postman Collection

Import the complete API collection:

**File:** `postman/DeckShala-Presentation-API.postman_collection.json`

**Environment Variables:**

- `base_url`: http://localhost:3000
- `session_token`: Your session token
- `user_id`: Your user ID
- `presentation_id`: Test presentation ID

---

**API Version:** 2.0.0  
**Last Updated:** February 26, 2026  
**Maintained By:** [DevVentures](https://github.com/DevVentures) / [techySPHINX](https://github.com/techySPHINX)  
**Repository:** [github.com/DevVentures/DeckShala](https://github.com/DevVentures/DeckShala)
