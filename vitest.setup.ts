// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-32-characters-long';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'llama3.2';
// NODE_ENV is read-only in TypeScript strict mode; it is set by the test runner automatically
process.env.SKIP_ENV_VALIDATION = 'true';
