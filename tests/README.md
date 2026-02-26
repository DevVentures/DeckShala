# Ollama Integration Quality Testing Suite

This directory contains comprehensive testing tools to evaluate Ollama's output quality for various presentation generation tasks in this platform.

## 📋 Overview

The testing suite evaluates Ollama's performance across:

1. **Health & Connectivity** - Verify Ollama service is running
2. **Basic Text Generation** - Simple prompt responses
3. **Outline Generation** - Structured presentation outlines with titles and topics
4. **XML Slide Generation** - Complex XML structure for slides
5. **Content Quality** - Relevance, coherence, and depth of generated content
6. **Streaming Performance** - Real-time text streaming capabilities
7. **Complex Scenarios** - Full presentation workflows with multiple components
8. **Multi-language Support** - Content generation in different languages

## 🚀 Quick Start

### Prerequisites

1. **Ollama must be installed and running**

   ```powershell
   # Check if Ollama is installed
   ollama --version

   # Start Ollama service
   ollama serve
   ```

2. **Download required model**
   ```powershell
   ollama pull llama3.2
   ```

### Running Tests

#### Option 1: Quick Test (Recommended)

Fast, simple test without complex dependencies:

```bash
# Using npm
npm run test:ollama

# Using pnpm
pnpm test:ollama

# Direct execution
node tests/quick-ollama-test.js
```

#### Option 2: Full Test Suite

Comprehensive tests with detailed metrics:

```bash
# Using npm
npm run test:ollama:full

# Using pnpm
pnpm test:ollama:full

# Direct execution
npx tsx tests/run-ollama-tests.ts
```

#### Option 3: PowerShell Script (Windows)

Automated setup and testing:

```powershell
# Run from project root
.\tests\test-ollama-quality.ps1
```

This script will:

- Check Ollama installation
- Start Ollama service if needed
- Download models if missing
- Run all tests
- Display comprehensive results

## 📊 Test Details

### 1. Health Check

- **Purpose**: Verify Ollama service availability
- **Tests**: API connectivity, model availability
- **Pass Criteria**: Service responds within 5 seconds

### 2. Basic Text Generation

- **Purpose**: Test simple text generation
- **Tests**: Single paragraph generation
- **Pass Criteria**:
  - Minimum 30 words
  - Minimum 100 characters
  - Coherent content

### 3. Outline Generation

- **Purpose**: Test structured outline creation
- **Tests**: Multi-topic presentation outline
- **Pass Criteria**:
  - Contains `<TITLE>` tags
  - Minimum 3-5 main topics (# headings)
  - Minimum 6-10 bullet points
  - Proper markdown formatting

### 4. XML Slide Generation

- **Purpose**: Test complex XML structure generation
- **Tests**: Complete slide markup with various components
- **Pass Criteria**:
  - Valid XML structure
  - Contains `<PRESENTATION>` and `<SECTION>` tags
  - Has layout attributes (left/right/vertical)
  - Includes content tags (`<H3>`, `<P>`)
  - Contains image queries (`<IMG>`)

### 5. Content Quality

- **Purpose**: Evaluate content depth and relevance
- **Tests**: Detailed explanations with structure
- **Pass Criteria**:
  - Minimum 200 words
  - Contains relevant keywords
  - Has proper structure (sections, bullets)
  - Factually coherent

### 6. Streaming Performance

- **Purpose**: Test real-time streaming
- **Tests**: Token streaming speed and latency
- **Pass Criteria**:
  - First chunk within 5 seconds
  - Total response within 30 seconds
  - Consistent streaming without gaps

### 7. Complex Presentation Scenario

- **Purpose**: Full workflow test
- **Tests**: Multi-slide presentation with various layouts
- **Pass Criteria**:
  - Correct number of slides
  - Different layouts used (left/right/vertical)
  - Multiple component types (BULLETS, COLUMNS, ICONS)
  - Proper nesting and structure

### 8. Multi-language Support

- **Purpose**: Test non-English content generation
- **Tests**: Spanish presentation outline
- **Pass Criteria**:
  - Content in requested language
  - Proper structure maintained
  - Language-specific terms used

## 📈 Interpreting Results

### Success Rates

- **100%**: ✅ Excellent - Ollama is production-ready
- **75-99%**: ✓ Good - Minor issues, generally reliable
- **50-74%**: ⚠️ Moderate - Some tasks struggle, consider alternatives
- **Below 50%**: ❌ Poor - Not recommended for this platform

### Common Issues and Solutions

#### Issue: Health check fails

**Solution**:

```powershell
# Start Ollama service
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

#### Issue: Model not found

**Solution**:

```powershell
# Download the default model
ollama pull llama3.2

# Or try alternative models
ollama pull llama3.1
ollama pull mistral
```

#### Issue: Slow performance

**Solutions**:

- Upgrade to a more powerful model (llama3.1, mixtral)
- Increase system resources (RAM, CPU)
- Close other applications
- Check if running on GPU vs CPU

#### Issue: Poor XML/outline structure

**Solutions**:

- Try a larger model (llama3.1 8B → 70B)
- Use a model specifically trained for structured output
- Adjust prompts in the test files
- Consider hybrid approach (Ollama + OpenAI for complex tasks)

## 🔧 Customization

### Change Test Model

Edit test files to use a different model:

```javascript
// In quick-ollama-test.js or ollama-quality-tests.ts
const TEST_CONFIG = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  DEFAULT_MODEL: "llama3.1", // Change here
};
```

### Adjust Timeouts

Modify timeout settings for slower systems:

```javascript
const TEST_CONFIG = {
  TIMEOUT_MS: 120000, // 2 minutes
  MAX_RESPONSE_TIME: 60000, // 1 minute
};
```

### Add Custom Tests

Add your own test in `ollama-quality-tests.ts`:

```typescript
async testCustomScenario(): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const { text } = await generateText({
      model: this.ollama(TEST_CONFIG.DEFAULT_MODEL),
      prompt: "Your custom prompt here",
    });

    // Your validation logic
    const passed = text.length > 100;

    return {
      testName: "My Custom Test",
      passed,
      duration: Date.now() - startTime,
      output: text,
    };
  } catch (error) {
    return {
      testName: "My Custom Test",
      passed: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}
```

## 📁 Test Files

- **`quick-ollama-test.js`** - Fast, standalone test script
- **`ollama-quality-tests.ts`** - Comprehensive test suite with AI SDK
- **`run-ollama-tests.ts`** - Test runner
- **`test-ollama-quality.ps1`** - Windows PowerShell automation script
- **`ollama-test-results.json`** - Generated results file (after running tests)

## 🎯 Best Practices

1. **Always run health check first**

   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Test with your target model**

   - Don't just test with llama3.2
   - Try the actual model you'll use in production

3. **Run tests multiple times**

   - AI outputs can vary
   - Run 3-5 times to get average performance

4. **Monitor system resources**

   - Check CPU/RAM usage during tests
   - Ensure adequate resources for production

5. **Compare with alternatives**
   - Test OpenAI API if available
   - Compare quality vs cost tradeoffs

## 🐛 Troubleshooting

### Tests hang or timeout

1. Check Ollama service:

   ```powershell
   # Check if service is running
   Get-Process ollama

   # Restart if needed
   Stop-Process -Name ollama -Force
   ollama serve
   ```

2. Verify model is downloaded:

   ```powershell
   ollama list
   ```

3. Test direct API:
   ```powershell
   curl -X POST http://localhost:11434/api/generate -d '{"model":"llama3.2","prompt":"test","stream":false}'
   ```

### Port conflicts

If port 11434 is in use:

1. Kill the process:

   ```powershell
   Get-Process -Id (Get-NetTCPConnection -LocalPort 11434).OwningProcess | Stop-Process
   ```

2. Or change the port in `.env`:
   ```env
   OLLAMA_BASE_URL="http://localhost:11435"
   ```

### Permission errors

Run PowerShell as Administrator:

```powershell
Start-Process powershell -Verb RunAs
```

## 📝 License

Same as parent project.

## 🤝 Contributing

To add new tests:

1. Create test method in `OllamaQualityTester` class
2. Add to `tests` array in `runAllTests()`
3. Document in this README
4. Submit PR with test rationale

## 📞 Support

If tests consistently fail:

1. Check [Ollama documentation](https://ollama.com)
2. Review system requirements
3. Try different models
4. Consider OpenAI fallback in production
5. Open an issue with test results attached

---

**Last Updated**: February 2026
