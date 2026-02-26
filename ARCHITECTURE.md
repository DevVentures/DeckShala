# Architecture Documentation

## DeckShala — AI Presentation Platform

> Complete technical architecture documentation covering system design, components, data flow, and technology stack.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [System Components](#system-components)
5. [Data Architecture](#data-architecture)
6. [Security Architecture](#security-architecture)
7. [Performance Architecture](#performance-architecture)
8. [Scalability Architecture](#scalability-architecture)
9. [Integration Architecture](#integration-architecture)
10. [Deployment Architecture](#deployment-architecture)

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │   Mobile     │  │     API      │     │
│  │   (Next.js)  │  │   Client     │  │   Clients    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Next.js 15 App Router + Server Actions             │  │
│  │   - Authentication Middleware                         │  │
│  │   - Rate Limiting                                     │  │
│  │   - Request Validation                                │  │
│  │   - Security Headers                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Smart     │  │  Content   │  │  AI        │           │
│  │  Features  │  │  Parser    │  │  Services  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Export    │  │  Version   │  │  Brand     │           │
│  │  Service   │  │  Control   │  │  Kit       │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   Prisma ORM                                          │  │
│  │   - Type-safe queries                                 │  │
│  │   - Migrations                                        │  │
│  │   - Connection pooling                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ PostgreSQL │  │   Ollama   │  │   Redis    │           │
│  │  Database  │  │  AI Engine │  │   Cache    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### System Characteristics

- **Architecture Style**: Monolithic with modular design
- **Deployment Model**: Server-side rendering (SSR) + API Routes
- **State Management**: Server-first with React Server Components
- **Real-time Capabilities**: WebSocket + Yjs for collaboration
- **Data Flow**: Request/Response + Event-driven (webhooks)

---

## 2. Technology Stack

### Frontend

```typescript
{
  "framework": "Next.js 15.5.4",
  "runtime": "React 19.1.0",
  "language": "TypeScript 5.9.2",
  "styling": {
    "framework": "Tailwind CSS 3.4.17",
    "components": "shadcn/ui + Radix UI",
    "icons": "Lucide React"
  },
  "editor": {
    "core": "Plate.js (Slate.js based)",
    "collaboration": "Yjs + y-websocket",
    "features": "Rich text, comments, versioning"
  },
  "stateManagement": {
    "server": "React Server Components",
    "client": "Zustand",
    "forms": "React Hook Form + Zod"
  },
  "dataFetching": {
    "server": "Server Actions",
    "client": "TanStack Query",
    "realtime": "WebSocket"
  }
}
```

### Backend

```typescript
{
  "framework": "Next.js 15 (App Router)",
  "authentication": "NextAuth.js v5",
  "orm": "Prisma 6.1.0",
  "database": "PostgreSQL 15+",
  "validation": "Zod",
  "fileUpload": "UploadThing",
  "aiEngine": {
    "primary": "Ollama (llama3.2)",
    "fallback": "OpenAI compatible APIs",
    "features": [
      "Content generation",
      "Smart suggestions",
      "Auto-design",
      "Speaker notes"
    ]
  }
}
```

### Infrastructure

```yaml
database:
  provider: PostgreSQL
  version: "15+"
  features:
    - Full-text search (pg_trgm)
    - JSON support
    - Array types
    - GIN indexes

caching:
  strategy: LRU in-memory
  instances:
    - presentationCache (500 items)
    - aiCache (200 items)
    - userCache (100 items)
    - themeCache (50 items)
    - templateCache (100 items)
  ttl: Configurable per cache

aiService:
  provider: Ollama
  model: llama3.2
  deployment: Self-hosted
  features:
    - Streaming responses
    - Circuit breaker protection
    - Response caching
    - Fallback strategies

security:
  authentication: OAuth 2.0 (Google)
  authorization: RBAC (5 roles)
  encryption: AES-256-GCM
  rateLimit: Token bucket algorithm
  csrf: HMAC-SHA256 tokens
  headers: OWASP recommended
```

---

## 3. Architecture Patterns

### 1. Server Actions Pattern

```typescript
// Server Action with validation, auth, and error handling
export async function createPresentation(input: CreatePresentationInput) {
  "use server";

  // 1. Authentication
  const session = await auth();
  if (!session?.user) {
    throw new AuthenticationError();
  }

  // 2. Authorization
  const canCreate = AccessControl.hasPermission(
    session.user.role,
    ResourceType.PRESENTATION,
    Action.CREATE,
  );
  if (!canCreate) {
    throw new AuthorizationError();
  }

  // 3. Validation
  const validated = createPresentationSchema.parse(input);

  // 4. Business Logic with Error Handling
  try {
    const result = await withRetry(
      async () => {
        // Use circuit breaker for AI calls
        return await ollamaCircuitBreaker.execute(async () => {
          // Generate presentation with AI
          return await OllamaService.generatePresentation(validated);
        });
      },
      { maxAttempts: 3, delayMs: 1000 },
    );

    // 5. Data Persistence
    const presentation = await db.baseDocument.create({
      data: {
        title: validated.title,
        type: DocumentType.PRESENTATION,
        userId: session.user.id,
        presentation: {
          create: {
            content: result.slides,
            theme: result.theme,
          },
        },
      },
    });

    // 6. Cache Invalidation
    await presentationCache.delete(
      CacheKeyGenerator.presentation(session.user.id, presentation.id),
    );

    // 7. Analytics Tracking
    await trackEvent("presentation.created", {
      userId: session.user.id,
      presentationId: presentation.id,
    });

    return { success: true, data: presentation };
  } catch (error) {
    ErrorHandler.handle(error as Error, { action: "createPresentation" });
    return {
      success: false,
      error: ErrorHandler.toUserMessage(error as Error),
    };
  }
}
```

### 2. Repository Pattern

```typescript
// Data Access Layer
export class PresentationRepository {
  async findById(id: string, userId: string): Promise<Presentation | null> {
    // Check cache first
    const cached = await presentationCache.get(
      CacheKeyGenerator.presentation(userId, id),
    );
    if (cached) return cached;

    // Fetch from database
    const presentation = await db.baseDocument.findUnique({
      where: { id },
      include: { presentation: true },
    });

    // Cache for future requests
    if (presentation) {
      await presentationCache.set(
        CacheKeyGenerator.presentation(userId, id),
        presentation,
        3600, // 1 hour
      );
    }

    return presentation;
  }

  async findAll(userId: string, options: FindOptions): Promise<Presentation[]> {
    return db.baseDocument.findMany({
      where: {
        userId,
        type: DocumentType.PRESENTATION,
      },
      orderBy: { [options.sortBy]: options.sortOrder },
      take: options.limit,
      skip: options.offset,
      include: { presentation: true },
    });
  }
}
```

### 3. Circuit Breaker Pattern

```typescript
// Protect AI service calls
export const ollamaCircuitBreaker = new CircuitBreaker("ollama-service", {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes
  timeout: 60000, // Try again after 1 minute
  monitoringPeriod: 120000, // Track failures over 2 minutes
});

// Usage
async function generateAIContent(prompt: string) {
  return await ollamaCircuitBreaker.execute(async () => {
    return await OllamaService.generate(prompt);
  });
}
```

### 4. Cache-Aside Pattern

```typescript
// Caching with fallback to database
export async function getPresentation(id: string, userId: string) {
  return await presentationCache.getOrSet(
    CacheKeyGenerator.presentation(userId, id),
    async () => {
      // Cache miss - fetch from database
      const presentation = await db.baseDocument.findUnique({
        where: { id },
        include: { presentation: true },
      });
      return presentation;
    },
    3600, // TTL: 1 hour
  );
}
```

### 5. CQRS-Lite Pattern

```typescript
// Command (Write)
export async function updatePresentation(id: string, data: UpdateData) {
  const updated = await db.baseDocument.update({
    where: { id },
    data,
  });

  // Invalidate cache
  await presentationCache.delete(`presentation:${id}`);

  // Trigger webhooks
  await webhookService.trigger("presentation.updated", updated);

  return updated;
}

// Query (Read)
export async function getPresentation(id: string) {
  // Read from cache or database
  return await presentationCache.getOrSet(`presentation:${id}`, async () => {
    return await db.baseDocument.findUnique({ where: { id } });
  });
}
```

---

## 4. System Components

### 4.1 Authentication System

```
┌──────────────────────────────────────────────┐
│         Authentication Flow                   │
├──────────────────────────────────────────────┤
│                                               │
│  1. User clicks "Sign in with Google"        │
│         ↓                                     │
│  2. NextAuth redirects to Google OAuth        │
│         ↓                                     │
│  3. Google authenticates user                 │
│         ↓                                     │
│  4. Google redirects with auth code           │
│         ↓                                     │
│  5. NextAuth exchanges code for tokens        │
│         ↓                                     │
│  6. Create/update user in database            │
│         ↓                                     │
│  7. Generate session JWT                      │
│         ↓                                     │
│  8. Set session cookie (httpOnly, secure)     │
│         ↓                                     │
│  9. Redirect to /presentation                 │
│                                               │
└──────────────────────────────────────────────┘
```

**Components:**

- `src/server/auth.ts` - NextAuth configuration
- `src/middleware.ts` - Route protection
- `src/app/auth/` - Sign in/out pages
- `src/lib/access-control.ts` - Authorization

### 4.2 Smart Features System

```
┌──────────────────────────────────────────────┐
│      Smart Features Architecture              │
├──────────────────────────────────────────────┤
│                                               │
│  Content Parser ─────┐                       │
│  • Text extraction    │                       │
│  • URL scraping       │                       │
│  • PDF parsing        ├──→ Ollama AI ────┐   │
│  • Document analysis  │                   │   │
│                       │                   │   │
│  Auto Design ─────────┤                   ↓   │
│  • Layout selection   │              ┌────────┐│
│  • Theme application  │              │ Smart  ││
│  • Color harmony      │              │ Slides ││
│                       │              └────────┘│
│  AI Co-Pilot ─────────┤                   │   │
│  • Grammar check      │                   │   │
│  • Content improve    │                   │   │
│  • Speaker notes      │                   │   │
│  • Image suggestions  │                   │   │
│                       │                   │   │
│  AI Insights ─────────┘                   │   │
│  • Audience analysis  ←───────────────────┘   │
│  • Slide suggestions                          │
│  • Improvement tips                           │
│                                               │
└──────────────────────────────────────────────┘
```

**Key Services:**

- `content-parser-service.ts` - Content parsing
- `auto-design-engine.ts` - Automatic design
- `ai-copilot-service.ts` - AI suggestions
- `ai-insights-service.ts` - Analytics
- `ai-slide-enhancer.ts` - Slide improvements

### 4.3 Collaboration System

```
┌──────────────────────────────────────────────┐
│      Real-time Collaboration                  │
├──────────────────────────────────────────────┤
│                                               │
│  User A ──┐                                   │
│  User B ──┤                                   │
│  User C ──┼──→ WebSocket Server ──→ Yjs      │
│           │         ↓                         │
│           └─────── Sync ───────┐             │
│                                 ↓             │
│  ┌────────────────────────────────────────┐  │
│  │   Shared Document State (CRDT)         │  │
│  │   • Cursor positions                    │  │
│  │   • Active users                        │  │
│  │   • Real-time edits                     │  │
│  │   • Conflict-free merging               │  │
│  └────────────────────────────────────────┘  │
│                     ↓                         │
│              PostgreSQL                       │
│              (Persistent)                     │
│                                               │
└──────────────────────────────────────────────┘
```

**Components:**

- `src/server/websocket-yjs.ts` - Yjs WebSocket
- `CollaborationSession` model - Active users
- `CollaborationRoom` model - Room management

---

## 5. Data Architecture

### Entity Relationship Diagram

```
┌────────────┐       ┌────────────────┐       ┌──────────────┐
│    User    │1    * │  BaseDocument  │1    1 │Presentation  │
│────────────│───────│────────────────│───────│──────────────│
│ id         │       │ id             │       │ id           │
│ email      │       │ title          │       │ content      │
│ role       │       │ type           │       │ theme        │
│ hasAccess  │       │ userId         │       │ outline      │
└────────────┘       │ isPublic       │       │ templateId   │
     │               └────────────────┘       └──────────────┘
     │                        │
     │                        │
     │               ┌────────┴────────┐
     │               │                 │
     ↓               ↓                 ↓
┌─────────┐   ┌─────────────┐   ┌─────────────┐
│BrandKit │   │  Analytics  │   │   Version   │
│─────────│   │─────────────│   │─────────────│
│ colors  │   │ eventType   │   │ versionNum  │
│ fonts   │   │ eventData   │   │ content     │
│ logo    │   │ sessionId   │   │ changes     │
└─────────┘   └─────────────┘   └─────────────┘
```

### Data Models

**User Model** - 14 fields, 8 relations

- Authentication data (email, password hash)
- Profile (name, bio, interests)
- Role & access control
- Related: documents, templates, brand kits

**BaseDocument Model** - 10 fields, 7 relations

- Polymorphic document container
- Supports 10 document types
- Indexes on: userId+updatedAt, type, isPublic

**Presentation Model** - 12 fields, 4 relations

- Rich content (JSON Slate nodes)
- Theme & styling
- AI generation metadata
- Collaboration state (Yjs)

### Database Indexes

**Performance-Critical Indexes:**

```sql
-- User queries
CREATE INDEX "User_role_hasAccess_createdAt_idx"
  ON "User"("role", "hasAccess", "createdAt" DESC);

-- Document listing
CREATE INDEX "BaseDocument_userId_type_updatedAt_idx"
  ON "BaseDocument"("userId", "type", "updatedAt" DESC);

-- Public documents
CREATE INDEX "BaseDocument_isPublic_createdAt_idx"
  ON "BaseDocument"("isPublic", "createdAt" DESC);

-- Analytics
CREATE INDEX "PresentationAnalytics_userId_eventType_createdAt_idx"
  ON "PresentationAnalytics"("userId", "eventType", "createdAt" DESC);

-- Full-text search
CREATE INDEX "BaseDocument_title_trgm_idx"
  ON "BaseDocument" USING GIN (title gin_trgm_ops);
```

---

## 6. Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────┐
│  Layer 1: Network Security                  │
│  • HTTPS/TLS 1.3                            │
│  • CORS policies                            │
│  • DDoS protection                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 2: Application Security              │
│  • Rate limiting (3 tiers)                  │
│  • CSRF protection                          │
│  • XSS prevention                           │
│  • Input sanitization                       │
│  • Security headers (OWASP)                 │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 3: Authentication                    │
│  • OAuth 2.0 (Google)                       │
│  • JWT sessions (30-day expiry)             │
│  • Session refresh (24 hours)               │
│  • Email verification                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 4: Authorization                     │
│  • RBAC (5 roles)                           │
│  • Resource-level permissions               │
│  • Ownership validation                     │
│  • Action-based control                     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 5: Data Security                     │
│  • AES-256-GCM encryption                   │
│  • Password hashing (bcrypt)                │
│  • Sensitive data masking                   │
│  • Database encryption at rest              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Layer 6: Monitoring & Audit                │
│  • Security event logging                   │
│  • Suspicious activity detection            │
│  • Access audit trails                      │
│  • Real-time alerting                       │
└─────────────────────────────────────────────┘
```

### Rate Limiting Strategy

```typescript
// Three-tier rate limiting
const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
});

const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
});

const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests
});
```

---

## 7. Performance Architecture

### Caching Strategy

```
┌─────────────────────────────────────────────┐
│         Multi-Level Caching                  │
├─────────────────────────────────────────────┤
│                                              │
│  L1: presentationCache (500 items, 1h TTL)  │
│  • User's presentations                      │
│  • Recently accessed slides                  │
│                                              │
│  L2: aiCache (200 items, 24h TTL)           │
│  • AI-generated content                      │
│  • Common prompts                            │
│                                              │
│  L3: userCache (100 items, 30min TTL)       │
│  • User profiles                             │
│  • Session data                              │
│                                              │
│  L4: themeCache (50 items, 7d TTL)          │
│  • Theme definitions                         │
│  • Design templates                          │
│                                              │
│  L5: templateCache (100 items, 24h TTL)     │
│  • Presentation templates                    │
│  • Template metadata                         │
│                                              │
└─────────────────────────────────────────────┘
```

### Query Optimization

**Indexed Queries:**

- User documents: O(log n) with B-tree index
- Public presentations: O(log n) with composite index
- Full-text search: O(1) average with GIN index

**Connection Pooling:**

- Min connections: 5
- Max connections: 20
- Idle timeout: 10 seconds

**Query Patterns:**

```typescript
// Efficient pagination
const presentations = await db.baseDocument.findMany({
  where: { userId, type: "PRESENTATION" },
  orderBy: { updatedAt: "desc" },
  take: 20,
  skip: (page - 1) * 20,
  include: {
    presentation: {
      select: { id: true, theme: true }, // Selective loading
    },
  },
});
```

---

## 8. Scalability Architecture

### Horizontal Scaling Strategy

```
                  ┌─────────────┐
                  │ Load Bal    │
                  │ancer        │
                  └──────┬──────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
    │ Next.js │    │ Next.js │    │ Next.js │
    │ App 1   │    │ App 2   │    │ App 3   │
    └────┬────┘    └────┬────┘    └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                  ┌──────▼──────┐
                  │ PostgreSQL  │
                  │ (Primary)   │
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │ PostgreSQL  │
                  │ (Replicas)  │
                  └─────────────┘
```

### Microservices Decomposition (Future)

```
┌────────────┐  ┌────────────┐  ┌────────────┐
│    API     │  │  AI/ML     │  │   Export   │
│  Gateway   │  │  Service   │  │  Service   │
└────────────┘  └────────────┘  └────────────┘
       │              │                │
       └──────────────┼────────────────┘
                      │
              ┌───────▼────────┐
              │  Message Queue │
              │  (RabbitMQ)    │
              └────────────────┘
```

---

## 9. Integration Architecture

### External Services

```typescript
interface ExternalIntegrations {
  authentication: {
    provider: "Google OAuth 2.0";
    flow: "Authorization Code";
    scope: ["email", "profile"];
  };

  aiEngine: {
    provider: "Ollama";
    protocol: "HTTP REST";
    models: ["llama3.2"];
    fallback: "OpenAI compatible API";
  };

  fileStorage: {
    provider: "UploadThing";
    capabilities: ["images", "documents"];
    maxSize: "10MB";
  };

  webhooks: {
    protocol: "HTTP POST";
    security: "HMAC-SHA256";
    events: [
      "presentation.created",
      "presentation.updated",
      "presentation.deleted",
    ];
  };
}
```

### API Contracts

**REST API Conventions:**

- `/api/auth/*` - Authentication
- `/api/presentation/*` - Presentation management
- `/api/ollama/*` - AI services
- `/api/health` - Health checks

**WebSocket Endpoints:**

- `/ws/collaboration` - Real-time editing
- `/ws/yjs` - Yjs synchronization

---

## 10. Deployment Architecture

### Production Environment

```yaml
infrastructure:
  compute:
    provider: Vercel / AWS / Azure
    instances: Auto-scaling (2-10)
    regions: Multi-region (US, EU, Asia)

  database:
    provider: PostgreSQL (Neon / Supabase)
    configuration: Primary + 2 Read Replicas
    backup: Automated daily + PITR

  caching:
    provider: Redis / Upstash
    configuration: Cluster mode
    persistence: AOF + RDB

  ai:
    provider: Self-hosted Ollama
    deployment: Docker container
    scaling: GPU-enabled instances

monitoring:
  apm: Vercel Analytics
  errors: Sentry
  logs: Axiom / Datadog
  uptime: UptimeRobot

cicd:
  platform: GitHub Actions
  stages:
    - Lint & Type Check
    - Unit Tests
    - Integration Tests
    - E2E Tests
    - Build
    - Deploy to Staging
    - Deploy to Production
```

---

## Summary

The DeckShala platform follows a **modular monolithic architecture** with:

✅ **Clean separation of concerns** (layers)  
✅ **Type-safe data access** (Prisma + TypeScript)  
✅ **Comprehensive security** (6-layer defense)  
✅ **High performance** (multi-level caching)  
✅ **Fault tolerance** (circuit breakers, retries)  
✅ **Real-time collaboration** (WebSocket + Yjs)  
✅ **Scalability** (horizontal + vertical)  
✅ **Observability** (logging, monitoring, analytics)

For implementation details, see:

- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [API Reference](./API_REFERENCE.md)
- [GitHub Repository](https://github.com/DevVentures/DeckShala)
- [Issues & Roadmap](https://github.com/DevVentures/DeckShala/issues)
