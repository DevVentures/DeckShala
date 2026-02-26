/**
 * Comprehensive Ollama Output Quality Testing Suite
 * 
 * This file tests Ollama integration across various tasks:
 * 1. Presentation Outline Generation
 * 2. Slide Content Generation
 * 3. XML Format Compliance
 * 4. Content Quality & Relevance
 * 5. Response Time Performance
 * 6. Error Handling
 */

import { createOllama } from "ollama-ai-provider";
import { streamText, generateText } from "ai";

// Test Configuration
const TEST_CONFIG = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  DEFAULT_MODEL: "llama3.2",
  TIMEOUT_MS: 60000, // 1 minute per test
  MIN_CONTENT_LENGTH: 100, // Minimum characters for valid content
  MAX_RESPONSE_TIME: 30000, // 30 seconds max
};

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  output?: string;
  error?: string;
  metrics?: Record<string, number | string | boolean>;
}

class OllamaQualityTester {
  private ollama: ReturnType<typeof createOllama>;
  private results: TestResult[] = [];

  constructor() {
    this.ollama = createOllama({
      baseURL: TEST_CONFIG.OLLAMA_BASE_URL,
    });
  }

  /**
   * Test 1: Health Check - Verify Ollama is running
   */
  async testHealthCheck(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${TEST_CONFIG.OLLAMA_BASE_URL}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];

      return {
        testName: "Health Check",
        passed: true,
        duration: Date.now() - startTime,
        metrics: {
          modelsFound: models.length,
          models: models.join(", "),
        },
      };
    } catch (error) {
      return {
        testName: "Health Check",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 2: Basic Text Generation - Simple prompt response
   */
  async testBasicGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt: "Explain quantum computing in one paragraph.",
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      const wordCount = text.trim().split(/\s+/).length;
      const passed = text.length > TEST_CONFIG.MIN_CONTENT_LENGTH && wordCount >= 30;

      return {
        testName: "Basic Text Generation",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 200) + "...",
        metrics: {
          textLength: text.length,
          wordCount,
          avgWordLength: (text.length / wordCount).toFixed(2),
        },
      };
    } catch (error) {
      return {
        testName: "Basic Text Generation",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 3: Outline Generation - Test presentation outline generation
   */
  async testOutlineGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const prompt = `You are an expert presentation outline generator. Create a presentation outline about "Artificial Intelligence in Healthcare" with 5 main topics. 

Start with a title in XML tags: <TITLE>Your Title</TITLE>

Then generate 5 topics in markdown format with each topic as a heading followed by 2-3 bullet points.

Example format:
<TITLE>AI in Healthcare Revolution</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect

# Second Main Topic
- Main insight
- Supporting detail`;

      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt,
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      // Validate outline structure
      const hasTitle = /<TITLE>.*<\/TITLE>/i.test(text);
      const headingCount = (text.match(/^# /gm) || []).length;
      const bulletCount = (text.match(/^- /gm) || []).length;

      const passed =
        hasTitle && headingCount >= 4 && bulletCount >= 10;

      return {
        testName: "Outline Generation",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 500) + "...",
        metrics: {
          hasTitle,
          headingCount,
          bulletCount,
          textLength: text.length,
        },
      };
    } catch (error) {
      return {
        testName: "Outline Generation",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 4: XML Generation - Test slide XML generation
   */
  async testXMLGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const prompt = `Create 2 presentation slides in XML format about "Climate Change".

Use this exact structure:
<PRESENTATION>
<SECTION layout="left">
<BULLETS>
  <DIV><H3>Point 1</H3><P>Description</P></DIV>
  <DIV><H3>Point 2</H3><P>Description</P></DIV>
</BULLETS>
<IMG query="detailed image description with at least 10 words" />
</SECTION>

<SECTION layout="right">
<COLUMNS>
  <DIV><H3>First Concept</H3><P>Description</P></DIV>
  <DIV><H3>Second Concept</H3><P>Description</P></DIV>
</COLUMNS>
<IMG query="another detailed image description" />
</SECTION>
</PRESENTATION>

Generate exactly 2 slides with proper XML tags.`;

      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt,
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      // Validate XML structure
      const hasPresentationTag = text.includes("<PRESENTATION>") && text.includes("</PRESENTATION>");
      const sectionCount = (text.match(/<SECTION/g) || []).length;
      const hasLayoutAttrs = /layout="(left|right|vertical)"/g.test(text);
      const hasContentTags = text.includes("<H3>") && text.includes("<P>");
      const hasImageTags = text.includes("<IMG");

      const passed =
        hasPresentationTag &&
        sectionCount >= 2 &&
        hasLayoutAttrs &&
        hasContentTags &&
        hasImageTags;

      return {
        testName: "XML Generation",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 600) + "...",
        metrics: {
          hasPresentationTag,
          sectionCount,
          hasLayoutAttrs,
          hasContentTags,
          hasImageTags,
          textLength: text.length,
        },
      };
    } catch (error) {
      return {
        testName: "XML Generation",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 5: Content Quality - Check for coherence and relevance
   */
  async testContentQuality(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const topic = "Machine Learning Fundamentals";
      const prompt = `Create a detailed explanation of "${topic}" with the following sections:
1. Definition (2-3 sentences)
2. Key Concepts (3 bullet points)
3. Real-world Applications (3 examples)
4. Benefits and Challenges (2 of each)

Be specific and informative.`;

      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt,
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      // Quality checks
      const hasSections = text.toLowerCase().includes("definition") ||
        text.toLowerCase().includes("key concepts") ||
        text.toLowerCase().includes("applications");
      const hasStructure = (text.match(/\d\./g) || []).length >= 3;
      const wordCount = text.trim().split(/\s+/).length;
      const hasRelevantKeywords = /machine learning|algorithm|model|training|data/gi.test(text);

      const passed =
        hasSections &&
        hasStructure &&
        wordCount >= 200 &&
        hasRelevantKeywords;

      return {
        testName: "Content Quality",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 400) + "...",
        metrics: {
          wordCount,
          hasSections,
          hasStructure,
          hasRelevantKeywords,
          avgSentenceLength: (text.split(/[.!?]+/).length / wordCount * 100).toFixed(2),
        },
      };
    } catch (error) {
      return {
        testName: "Content Quality",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 6: Streaming Performance - Test streaming text generation
   */
  async testStreamingPerformance(): Promise<TestResult> {
    const startTime = Date.now();
    let firstChunkTime = 0;
    let chunkCount = 0;

    try {
      const result = streamText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt: "Write a short paragraph about renewable energy (3-4 sentences).",
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      let fullText = "";
      for await (const chunk of result.textStream) {
        if (chunkCount === 0) {
          firstChunkTime = Date.now() - startTime;
        }
        fullText += chunk;
        chunkCount++;
      }

      const totalTime = Date.now() - startTime;
      const passed =
        firstChunkTime < 5000 && // First chunk within 5 seconds
        totalTime < TEST_CONFIG.MAX_RESPONSE_TIME &&
        fullText.length > 100;

      return {
        testName: "Streaming Performance",
        passed,
        duration: totalTime,
        output: fullText.substring(0, 200) + "...",
        metrics: {
          firstChunkTime,
          totalChunks: chunkCount,
          avgChunkSize: (fullText.length / chunkCount).toFixed(2),
          totalLength: fullText.length,
          throughput: `${(fullText.length / totalTime * 1000).toFixed(0)} chars/sec`,
        },
      };
    } catch (error) {
      return {
        testName: "Streaming Performance",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 7: Complex Presentation Scenario - Full workflow test
   */
  async testComplexScenario(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const prompt = `Create a complete 3-slide presentation about "Blockchain Technology" in XML format.

Requirements:
- Exactly 3 slides
- Use different layouts (left, right, vertical)
- Use different components (BULLETS, COLUMNS, ICONS)
- Include detailed image queries
- Add relevant H3 headings and P descriptions

Output format:
<PRESENTATION>
<SECTION layout="left">...</SECTION>
<SECTION layout="right">...</SECTION>
<SECTION layout="vertical">...</SECTION>
</PRESENTATION>`;

      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt,
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      // Complex validation
      const hasPresentationTag = text.includes("<PRESENTATION>") && text.includes("</PRESENTATION>");
      const sectionCount = (text.match(/<SECTION/g) || []).length;
      const layoutVariety = [
        text.includes('layout="left"'),
        text.includes('layout="right"'),
        text.includes('layout="vertical"'),
      ].filter(Boolean).length;
      const componentTypes = [
        text.includes("<BULLETS>"),
        text.includes("<COLUMNS>"),
        text.includes("<ICONS>"),
      ].filter(Boolean).length;
      const imageCount = (text.match(/<IMG/g) || []).length;
      const hasHeadings = text.includes("<H3>") && text.includes("<P>");

      const passed =
        hasPresentationTag &&
        sectionCount === 3 &&
        layoutVariety >= 2 &&
        componentTypes >= 2 &&
        imageCount >= 2 &&
        hasHeadings;

      return {
        testName: "Complex Presentation Scenario",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 800) + "...",
        metrics: {
          sectionCount,
          layoutVariety,
          componentTypes,
          imageCount,
          textLength: text.length,
          compliance: `${Math.round((passed ? 100 : 50))}%`,
        },
      };
    } catch (error) {
      return {
        testName: "Complex Presentation Scenario",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test 8: Multi-language Support
   */
  async testMultiLanguageSupport(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const prompt = `Create a brief presentation outline about "Space Exploration" in Spanish language.

Format:
<TITLE>Your Spanish Title</TITLE>

# Primer Tema
- Punto importante
- Otro punto

# Segundo Tema
- Información relevante
- Detalle adicional

Generate 2 topics in Spanish.`;

      const { text } = await generateText({
        model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
        prompt,
        abortSignal: AbortSignal.timeout(TEST_CONFIG.TIMEOUT_MS),
      });

      // Check for Spanish content (basic check)
      const spanishPatterns = /exploración|espacio|tema|punto|información/i;
      const hasSpanishContent = spanishPatterns.test(text);
      const hasTitle = /<TITLE>.*<\/TITLE>/i.test(text);
      const hasHeadings = (text.match(/^# /gm) || []).length >= 2;

      const passed = hasSpanishContent && hasTitle && hasHeadings;

      return {
        testName: "Multi-language Support",
        passed,
        duration: Date.now() - startTime,
        output: text.substring(0, 300) + "...",
        metrics: {
          hasSpanishContent,
          hasTitle,
          headingCount: (text.match(/^# /gm) || []).length,
        },
      };
    } catch (error) {
      return {
        testName: "Multi-language Support",
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║     Ollama Quality Testing Suite for Presentation     ║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.blue}Configuration:${colors.reset}`);
    console.log(`  • Base URL: ${TEST_CONFIG.OLLAMA_BASE_URL}`);
    console.log(`  • Model: ${TEST_CONFIG.DEFAULT_MODEL}`);
    console.log(`  • Timeout: ${TEST_CONFIG.TIMEOUT_MS}ms\n`);

    const tests = [
      () => this.testHealthCheck(),
      () => this.testBasicGeneration(),
      () => this.testOutlineGeneration(),
      () => this.testXMLGeneration(),
      () => this.testContentQuality(),
      () => this.testStreamingPerformance(),
      () => this.testComplexScenario(),
      () => this.testMultiLanguageSupport(),
    ];

    for (const test of tests) {
      const result = await test();
      this.results.push(result);
      this.printTestResult(result);
    }

    this.printSummary();
  }

  /**
   * Print individual test result
   */
  private printTestResult(result: TestResult): void {
    const status = result.passed
      ? `${colors.green}✓ PASSED${colors.reset}`
      : `${colors.red}✗ FAILED${colors.reset}`;
    const duration = `${result.duration}ms`;

    console.log(`\n${colors.bright}${result.testName}${colors.reset}`);
    console.log(`  Status: ${status} | Duration: ${colors.yellow}${duration}${colors.reset}`);

    if (result.metrics) {
      console.log(`${colors.cyan}  Metrics:${colors.reset}`);
      for (const [key, value] of Object.entries(result.metrics)) {
        console.log(`    • ${key}: ${value}`);
      }
    }

    if (result.output) {
      console.log(`${colors.cyan}  Sample Output:${colors.reset}`);
      console.log(`    ${result.output.replace(/\n/g, "\n    ")}`);
    }

    if (result.error) {
      console.log(`${colors.red}  Error: ${result.error}${colors.reset}`);
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const total = this.results.length;
    const successRate = ((passed / total) * 100).toFixed(1);
    const avgDuration = (
      this.results.reduce((sum, r) => sum + r.duration, 0) / total
    ).toFixed(0);

    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════ SUMMARY ═══════════════════════${colors.reset}\n`);
    console.log(`  Total Tests:     ${total}`);
    console.log(`  ${colors.green}Passed:${colors.reset}          ${passed}`);
    console.log(`  ${colors.red}Failed:${colors.reset}          ${failed}`);
    console.log(`  ${colors.yellow}Success Rate:${colors.reset}    ${successRate}%`);
    console.log(`  Avg Duration:    ${avgDuration}ms`);

    if (failed > 0) {
      console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
      this.results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  • ${r.testName}: ${r.error || "Unknown error"}`);
        });
    }

    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // Overall assessment
    if (successRate === "100.0") {
      console.log(`${colors.green}${colors.bright}✓ All tests passed! Ollama is producing excellent outputs.${colors.reset}\n`);
    } else if (parseFloat(successRate) >= 75) {
      console.log(`${colors.yellow}${colors.bright}⚠ Most tests passed. Ollama is producing good outputs with minor issues.${colors.reset}\n`);
    } else if (parseFloat(successRate) >= 50) {
      console.log(`${colors.yellow}${colors.bright}⚠ Some tests failed. Ollama outputs need improvement.${colors.reset}\n`);
    } else {
      console.log(`${colors.red}${colors.bright}✗ Many tests failed. Ollama may not be suitable for this platform.${colors.reset}\n`);
    }
  }

  /**
   * Export results to JSON
   */
  exportResults(filename: string = "ollama-test-results.json"): void {
    const fs = require("fs");
    const results = {
      timestamp: new Date().toISOString(),
      config: TEST_CONFIG,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.passed).length,
        failed: this.results.filter((r) => !r.passed).length,
        successRate: (
          (this.results.filter((r) => r.passed).length / this.results.length) *
          100
        ).toFixed(1),
        avgDuration: (
          this.results.reduce((sum, r) => sum + r.duration, 0) /
          this.results.length
        ).toFixed(0),
      },
    };

    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    console.log(`${colors.green}Results exported to ${filename}${colors.reset}\n`);
  }
}

// Main execution
async function main() {
  const tester = new OllamaQualityTester();

  try {
    await tester.runAllTests();
    tester.exportResults();
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { OllamaQualityTester, type TestResult };
