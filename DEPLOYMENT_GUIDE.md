# Deployment & Scaling Strategies

## DeckShala — AI Presentation Platform

> Production deployment guide covering Docker, Kubernetes, cloud platforms, and horizontal scaling

---

## Table of Contents

1. [Docker Containerization](#docker-containerization)
2. [Kubernetes Deployment](#kubernetes-deployment)
3. [Cloud Platform Deployment](#cloud-platform-deployment)
4. [Database Scaling](#database-scaling)
5. [Caching Strategy](#caching-strategy)
6. [Load Balancing](#load-balancing)
7. [CDN Configuration](#cdn-configuration)
8. [Auto-Scaling](#auto-scaling)
9. [Zero-Downtime Deployment](#zero-downtime-deployment)
10. [Environment Configuration](#environment-configuration)

---

## 1. Docker Containerization

### Multi-Stage Dockerfile

**File:** `Dockerfile`

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
ENV NEXT_TELEMETRY_DISABLED 1
RUN pnpm build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Docker Compose for Development

**File:** `docker-compose.yml`

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/presentation
      NEXTAUTH_URL: http://localhost:3000
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      OLLAMA_BASE_URL: http://ollama:11434
    depends_on:
      - db
      - ollama
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: presentation
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  postgres_data:
  ollama_data:
  redis_data:
```

### Build and Run

```bash
# Build image
docker build -t presentation-platform:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  presentation-platform:latest

# Using Docker Compose
docker-compose up -d
```

---

## 2. Kubernetes Deployment

### Deployment Configuration

**File:** `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: presentation-platform
  labels:
    app: presentation-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: presentation-platform
  template:
    metadata:
      labels:
        app: presentation-platform
    spec:
      containers:
        - name: app
          image: presentation-platform:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
            - name: NEXTAUTH_SECRET
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: nextauth-secret
            - name: OLLAMA_BASE_URL
              value: "http://ollama-service:11434"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: presentation-service
spec:
  selector:
    app: presentation-platform
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

### Horizontal Pod Autoscaler

**File:** `k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: presentation-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: presentation-platform
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Apply Kubernetes Configuration

```bash
# Create namespace
kubectl create namespace presentation

# Apply secrets
kubectl create secret generic app-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=nextauth-secret="..." \
  -n presentation

# Apply deployment
kubectl apply -f k8s/ -n presentation

# Check status
kubectl get pods -n presentation
kubectl get svc -n presentation
kubectl get hpa -n presentation
```

---

## 3. Cloud Platform Deployment

### Vercel Deployment (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Environment variables in Vercel dashboard
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OLLAMA_BASE_URL
```

### AWS Deployment (ECS + RDS)

**Architecture:**

```
┌─────────────────────────────────────────┐
│         CloudFront (CDN)                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Application Load Balancer (ALB)      │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
┌──────▼─────┐  ┌─────▼──────┐
│  ECS Task  │  │  ECS Task  │  (Auto-scaling)
│  Container │  │  Container │
└──────┬─────┘  └─────┬──────┘
       │               │
       └───────┬───────┘
               │
    ┌──────────▼──────────┐
    │   RDS PostgreSQL    │
    │   (Multi-AZ)        │
    └─────────────────────┘
```

**Terraform Configuration:**

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_ecs_cluster" "main" {
  name = "presentation-cluster"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "presentation-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${aws_ecr_repository.app.repository_url}:latest"
      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "DATABASE_URL"
          value = "postgresql://${aws_db_instance.main.endpoint}/presentation"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/presentation"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "app"
        }
      }
    }
  ])
}

resource "aws_db_instance" "main" {
  identifier           = "presentation-db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.medium"
  allocated_storage    = 100
  storage_encrypted    = true
  db_name              = "presentation"
  username             = "dbadmin"
  password             = var.db_password
  multi_az             = true
  backup_retention_period = 7
}
```

### Azure Deployment (AKS + Azure Database)

```bash
# Create resource group
az group create --name presentation-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group presentation-rg \
  --name presentation-aks \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Create Azure Database for PostgreSQL
az postgres flexible-server create \
  --resource-group presentation-rg \
  --name presentation-db \
  --tier Burstable \
  --sku-name Standard_B2s \
  --storage-size 128 \
  --version 15

# Deploy to AKS
az aks get-credentials --resource-group presentation-rg --name presentation-aks
kubectl apply -f k8s/
```

---

## 4. Database Scaling

### Read Replicas

```typescript
// Prisma configuration with read replicas
import { PrismaClient } from "@prisma/client";

const prismaWrite = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Primary
    },
  },
});

const prismaRead = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_READ_REPLICA_URL, // Read replica
    },
  },
});

// Use write for mutations
export const writeDb = prismaWrite;

// Use read for queries
export const readDb = prismaRead;
```

**Usage:**

```typescript
// Write operations
await writeDb.baseDocument.create({ data });

// Read operations
const presentations = await readDb.baseDocument.findMany();
```

### Connection Pooling

```typescript
// Prisma connection pool configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["query", "error", "warn"],
  // Connection pool settings
  __internal: {
    engine: {
      connectionLimit: 10,
      poolTimeout: 2000,
    },
  },
});
```

### Database Indexing

Already implemented in [prisma/migrations/add_performance_indexes.sql](prisma/migrations/add_performance_indexes.sql):

```sql
-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_document_author_type_created
  ON "BaseDocument"("authorId", "type", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_document_author_updated
  ON "BaseDocument"("authorId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_template_public_created
  ON "Template"("isPublic", "createdAt" DESC);
```

---

## 5. Caching Strategy

### Multi-Level Caching

```
┌─────────────────────────────────────────┐
│         CDN Cache (CloudFront)          │
│         TTL: 1 hour (static assets)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Application Cache (Redis)          │
│      TTL: 5 minutes (API responses)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Memory Cache (LRU Cache)           │
│      TTL: 1 minute (hot data)           │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Database (PostgreSQL)           │
└─────────────────────────────────────────┘
```

### Redis Integration

**Install Redis Client:**

```bash
pnpm add ioredis @types/ioredis
```

**Configuration:**

```typescript
// src/lib/redis.ts
import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
});

// Cache helper
export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300,
): Promise<void> {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}
```

**Usage:**

```typescript
import { cacheGet, cacheSet } from "@/lib/redis";

export async function getPresentations(userId: string) {
  const cacheKey = `presentations:${userId}`;

  // Try cache first
  let presentations = await cacheGet<Presentation[]>(cacheKey);

  if (!presentations) {
    // Cache miss - fetch from database
    presentations = await db.baseDocument.findMany({
      where: { authorId: userId },
    });

    // Store in cache for 5 minutes
    await cacheSet(cacheKey, presentations, 300);
  }

  return presentations;
}
```

---

## 6. Load Balancing

### NGINX Configuration

**File:** `nginx.conf`

```nginx
upstream presentation_backend {
    least_conn;
    server app1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name presentation.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name presentation.example.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    location / {
        proxy_pass http://presentation_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://presentation_backend;
        # ... same proxy settings
    }

    # Cache static assets
    location /_next/static/ {
        proxy_pass http://presentation_backend;
        proxy_cache_valid 200 1h;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 7. CDN Configuration

### CloudFront Setup

```typescript
// next.config.js
module.exports = {
  assetPrefix: process.env.CDN_URL || "",
  images: {
    domains: ["d1234567890.cloudfront.net"],
    loader: "cloudfront",
    path: "https://d1234567890.cloudfront.net/",
  },
};
```

### Cache Invalidation

```typescript
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";

const client = new CloudFrontClient({ region: "us-east-1" });

export async function invalidateCDN(paths: string[]) {
  const command = new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  });

  await client.send(command);
}
```

---

## 8. Auto-Scaling

### Application Auto-Scaling (AWS)

```typescript
// CDK Configuration
import * as autoscaling from "aws-cdk-lib/aws-applicationautoscaling";

const scaling = service.autoScaleTaskCount({
  minCapacity: 3,
  maxCapacity: 10,
});

scaling.scaleOnCpuUtilization("CpuScaling", {
  targetUtilizationPercent: 70,
  scaleInCooldown: Duration.seconds(60),
  scaleOutCooldown: Duration.seconds(60),
});

scaling.scaleOnMemoryUtilization("MemoryScaling", {
  targetUtilizationPercent: 80,
});
```

### Kubernetes HPA (Already configured)

See [k8s/hpa.yaml](#horizontal-pod-autoscaler)

---

## 9. Zero-Downtime Deployment

### Rolling Updates

```yaml
# k8s/deployment.yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  # ... rest of deployment config
```

### Blue-Green Deployment

```bash
# Deploy green environment
kubectl apply -f k8s/deployment-green.yaml

# Wait for green to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/presentation-platform-green

# Switch traffic to green
kubectl patch service presentation-service \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify green is working
# Then delete blue
kubectl delete deployment presentation-platform-blue
```

### Canary Deployment

```yaml
# Using Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: presentation-service
spec:
  hosts:
    - presentation.example.com
  http:
    - match:
        - headers:
            canary:
              exact: "true"
      route:
        - destination:
            host: presentation-service
            subset: v2
    - route:
        - destination:
            host: presentation-service
            subset: v1
          weight: 90
        - destination:
            host: presentation-service
            subset: v2
          weight: 10
```

---

## 10. Environment Configuration

### Environment Variables

```bash
# Production .env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_READ_REPLICA_URL=postgresql://user:pass@replica:5432/db

NEXTAUTH_URL=https://presentation.example.com
NEXTAUTH_SECRET=64_character_random_string

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

OLLAMA_BASE_URL=https://ollama.example.com
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT_MS=120000

REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=...

# Monitoring
SENTRY_DSN=...
NEW_RELIC_LICENSE_KEY=...

# AWS/Cloud
AWS_REGION=us-east-1
S3_BUCKET=presentation-assets
CDN_URL=https://d123.cloudfront.net
```

### Secrets Management

**AWS Secrets Manager:**

```typescript
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

export async function getSecret(secretName: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return response.SecretString || "";
}
```

**Kubernetes Secrets:**

```bash
# Create secret from file
kubectl create secret generic app-secrets \
  --from-env-file=.env.production

# Use in deployment
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: DATABASE_URL
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run full test suite
- [ ] Update dependencies
- [ ] Run security audit
- [ ] Database migrations tested
- [ ] Environment variables verified
- [ ] SSL certificates renewed
- [ ] Backup database
- [ ] Document changes

### Deployment

- [ ] Deploy to staging first
- [ ] Run smoke tests
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify database connections
- [ ] Test critical user flows

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Check application metrics
- [ ] Verify auto-scaling works
- [ ] Test rollback procedure
- [ ] Update documentation
- [ ] Notify team

---

**Last Updated:** February 2, 2026  
**Maintained By:** DevOps Team
