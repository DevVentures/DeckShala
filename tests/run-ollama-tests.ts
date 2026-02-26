#!/usr/bin/env node
/**
 * Simple test runner for Ollama quality tests
 * Run with: npx tsx tests/run-ollama-tests.ts
 */

import { OllamaQualityTester } from "./ollama-quality-tests";

async function main() {
  console.log("Starting Ollama Quality Tests...\n");

  const tester = new OllamaQualityTester();

  try {
    await tester.runAllTests();
    tester.exportResults("ollama-test-results.json");
    console.log("\n✅ Test suite completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  }
}

main();
