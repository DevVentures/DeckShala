/**
 * Quick Ollama Integration Test
 * Tests basic functionality without complex dependencies
 */

const TEST_CONFIG = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  DEFAULT_MODEL: "llama3.2",
};

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

async function testHealth() {
  console.log(`\n${colors.cyan}Testing Ollama Health...${colors.reset}`);
  try {
    const response = await fetch(`${TEST_CONFIG.OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = await response.json();
    const models = data.models?.map((m) => m.name) || [];

    console.log(`${colors.green}✓ Ollama is running${colors.reset}`);
    console.log(`  Models found: ${models.length}`);
    console.log(`  Available: ${models.join(", ")}`);
    return true;
  } catch (/** @type {any} */ error) {
    console.log(`${colors.red}✗ Ollama health check failed${colors.reset}`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function testBasicGeneration() {
  console.log(
    `\n${colors.cyan}Testing Basic Text Generation...${colors.reset}`,
  );
  try {
    const response = await fetch(
      `${TEST_CONFIG.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEST_CONFIG.DEFAULT_MODEL,
          prompt: "Explain quantum computing in one short paragraph.",
          stream: false,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response || "";
    const wordCount = text.trim().split(/\s+/).length;

    console.log(`${colors.green}✓ Text generation successful${colors.reset}`);
    console.log(`  Length: ${text.length} chars`);
    console.log(`  Words: ${wordCount}`);
    console.log(`  Sample: ${text.substring(0, 100)}...`);

    return wordCount >= 30;
  } catch (/** @type {any} */ error) {
    console.log(`${colors.red}✗ Text generation failed${colors.reset}`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function testOutlineGeneration() {
  console.log(
    `\n${colors.cyan}Testing Presentation Outline Generation...${colors.reset}`,
  );
  try {
    const prompt = `Create a presentation outline about "Artificial Intelligence" with 3 main topics.

Format:
<TITLE>Your Title</TITLE>

# First Topic
- Point 1
- Point 2

# Second Topic
- Point 1
- Point 2

# Third Topic
- Point 1
- Point 2`;

    const response = await fetch(
      `${TEST_CONFIG.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEST_CONFIG.DEFAULT_MODEL,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response || "";

    const hasTitle = /<TITLE>.*<\/TITLE>/i.test(text);
    const headingCount = (text.match(/^# /gm) || []).length;
    const bulletCount = (text.match(/^- /gm) || []).length;

    const passed = hasTitle && headingCount >= 3 && bulletCount >= 6;

    if (passed) {
      console.log(
        `${colors.green}✓ Outline generation successful${colors.reset}`,
      );
    } else {
      console.log(
        `${colors.yellow}⚠ Outline structure incomplete${colors.reset}`,
      );
    }

    console.log(`  Has title: ${hasTitle}`);
    console.log(`  Headings: ${headingCount}`);
    console.log(`  Bullets: ${bulletCount}`);
    console.log(`  Sample: ${text.substring(0, 200)}...`);

    return passed;
  } catch (/** @type {any} */ error) {
    console.log(`${colors.red}✗ Outline generation failed${colors.reset}`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function testXMLGeneration() {
  console.log(`\n${colors.cyan}Testing XML Slide Generation...${colors.reset}`);
  try {
    const prompt = `Create a presentation slide about "Machine Learning" in XML format.

Use this exact structure:
<PRESENTATION>
<SECTION layout="left">
<BULLETS>
  <DIV><H3>First Point</H3><P>Description of first point</P></DIV>
  <DIV><H3>Second Point</H3><P>Description of second point</P></DIV>
</BULLETS>
<IMG query="machine learning algorithms visualization with neural networks" />
</SECTION>
</PRESENTATION>`;

    const response = await fetch(
      `${TEST_CONFIG.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEST_CONFIG.DEFAULT_MODEL,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000),
      },
    );

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.response || "";

    const hasPresentationTag =
      text.includes("<PRESENTATION>") && text.includes("</PRESENTATION>");
    const hasSectionTag = text.includes("<SECTION");
    const hasLayoutAttr = /layout="(left|right|vertical)"/g.test(text);
    const hasContentTags = text.includes("<H3>") && text.includes("<P>");
    const hasImageTag = text.includes("<IMG");

    const passed =
      hasPresentationTag &&
      hasSectionTag &&
      hasLayoutAttr &&
      hasContentTags &&
      hasImageTag;

    if (passed) {
      console.log(`${colors.green}✓ XML generation successful${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ XML structure incomplete${colors.reset}`);
    }

    console.log(`  Has PRESENTATION: ${hasPresentationTag}`);
    console.log(`  Has SECTION: ${hasSectionTag}`);
    console.log(`  Has layout attr: ${hasLayoutAttr}`);
    console.log(`  Has content tags: ${hasContentTags}`);
    console.log(`  Has IMG tag: ${hasImageTag}`);

    return passed;
  } catch (/** @type {any} */ error) {
    console.log(`${colors.red}✗ XML generation failed${colors.reset}`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function testStreamingPerformance() {
  console.log(
    `\n${colors.cyan}Testing Streaming Performance...${colors.reset}`,
  );
  try {
    const startTime = Date.now();
    let firstChunkTime = 0;

    const response = await fetch(
      `${TEST_CONFIG.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: TEST_CONFIG.DEFAULT_MODEL,
          prompt: "Write 2 sentences about renewable energy.",
          stream: true,
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      throw new Error(`Status: ${response.status}`);
    }

    let fullText = "";
    let chunkCount = 0;

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (chunkCount === 0) {
        firstChunkTime = Date.now() - startTime;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.response) {
            fullText += json.response;
            chunkCount++;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const passed = firstChunkTime < 5000 && fullText.length > 50;

    if (passed) {
      console.log(`${colors.green}✓ Streaming successful${colors.reset}`);
    } else {
      console.log(
        `${colors.yellow}⚠ Streaming slow or incomplete${colors.reset}`,
      );
    }

    console.log(`  First chunk: ${firstChunkTime}ms`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Chunks: ${chunkCount}`);
    console.log(
      `  Throughput: ${Math.round((fullText.length / totalTime) * 1000)} chars/sec`,
    );

    return passed;
  } catch (/** @type {any} */ error) {
    console.log(`${colors.red}✗ Streaming failed${colors.reset}`);
    console.log(
      `  Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

async function main() {
  console.log(
    `\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}║     Quick Ollama Integration Quality Tests            ║${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );

  console.log(`${colors.cyan}Configuration:${colors.reset}`);
  console.log(`  • Base URL: ${TEST_CONFIG.OLLAMA_BASE_URL}`);
  console.log(`  • Model: ${TEST_CONFIG.DEFAULT_MODEL}`);

  const results = [];

  // Run tests
  results.push({ name: "Health Check", passed: await testHealth() });
  results.push({
    name: "Basic Generation",
    passed: await testBasicGeneration(),
  });
  results.push({
    name: "Outline Generation",
    passed: await testOutlineGeneration(),
  });
  results.push({ name: "XML Generation", passed: await testXMLGeneration() });
  results.push({ name: "Streaming", passed: await testStreamingPerformance() });

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const rate = Math.round((passed / total) * 100);

  console.log(
    `\n${colors.bright}${colors.cyan}═══════════════════════ SUMMARY ═══════════════════════${colors.reset}\n`,
  );
  console.log(`  Total Tests:     ${total}`);
  console.log(`  ${colors.green}Passed:${colors.reset}          ${passed}`);
  console.log(
    `  ${colors.red}Failed:${colors.reset}          ${total - passed}`,
  );
  console.log(`  ${colors.yellow}Success Rate:${colors.reset}    ${rate}%`);

  console.log(`\n${colors.cyan}Test Results:${colors.reset}`);
  results.forEach((r) => {
    const icon = r.passed
      ? `${colors.green}✓${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    console.log(`  ${icon} ${r.name}`);
  });

  console.log(
    `\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`,
  );

  // Assessment
  if (rate === 100) {
    console.log(
      `${colors.green}${colors.bright}🎉 Excellent! Ollama is producing high-quality outputs.${colors.reset}`,
    );
  } else if (rate >= 75) {
    console.log(
      `${colors.yellow}${colors.bright}✓ Good! Ollama is working well with minor issues.${colors.reset}`,
    );
  } else if (rate >= 50) {
    console.log(
      `${colors.yellow}${colors.bright}⚠ Moderate. Consider using a more powerful model.${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.red}${colors.bright}❌ Poor results. Check Ollama configuration.${colors.reset}`,
    );
  }

  console.log();
  process.exit(passed === total ? 0 : 1);
}

main().catch((/** @type {any} */ error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
