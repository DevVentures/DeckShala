// Vitest setup file
import { beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = 'test-secret-key-32-characters-long';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434';
process.env.OLLAMA_MODEL = 'llama3.2';
process.env.NODE_ENV = 'test';
