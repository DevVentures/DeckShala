import { logger } from "@/lib/logger";
import puppeteer from "puppeteer";
import { Readable } from "stream";

export interface ExportOptions {
  format: "pdf" | "pptx" | "png" | "html";
  quality?: "low" | "medium" | "high";
  includeNotes?: boolean;
  orientation?: "landscape" | "portrait";
  theme?: string;
}

/**
 * Advanced Presentation Export Service
 * Supports multiple formats: PDF, PPTX, PNG, HTML
 */
export class ExportService {
  /**
   * Export presentation to PDF
   */
  static async exportToPDF(
    presentationHTML: string,
    options: ExportOptions = { format: "pdf" }
  ): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Set viewport for presentation size (16:9 aspect ratio)
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: options.quality === "high" ? 2 : 1,
      });

      // Load the presentation HTML
      await page.setContent(presentationHTML, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      // Wait for any images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(
              img =>
                new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  setTimeout(reject, 5000); // Timeout after 5 seconds
                })
            )
        );
      });

      // Generate PDF
      const pdf = await page.pdf({
        format: "A4",
        landscape: options.orientation !== "portrait",
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "10mm",
          bottom: "10mm",
          left: "10mm",
          right: "10mm",
        },
      });

      logger.info("PDF export completed", {
        size: pdf.length,
        quality: options.quality,
      });

      return pdf;
    } catch (error) {
      logger.error("PDF export error", error as Error);
      throw new Error(`Failed to export to PDF: ${(error as Error).message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Export presentation to PNG images (one per slide)
   */
  static async exportToPNG(
    presentationHTML: string,
    options: ExportOptions = { format: "png" }
  ): Promise<Buffer[]> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
        ],
      });

      const page = await browser.newPage();

      const width = 1920;
      const height = 1080;
      const scaleFactor =
        options.quality === "high" ? 2 : options.quality === "low" ? 1 : 1.5;

      await page.setViewport({
        width,
        height,
        deviceScaleFactor: scaleFactor,
      });

      await page.setContent(presentationHTML, {
        waitUntil: ["networkidle0", "domcontentloaded"],
        timeout: 30000,
      });

      // Wait for images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.images)
            .filter(img => !img.complete)
            .map(
              img =>
                new Promise((resolve, reject) => {
                  img.onload = resolve;
                  img.onerror = reject;
                  setTimeout(reject, 5000);
                })
            )
        );
      });

      // Get number of slides
      const slideCount = await page.evaluate(() => {
        const slides = document.querySelectorAll("[data-slide]");
        return slides.length;
      });

      const screenshots: Buffer[] = [];

      // Capture each slide
      for (let i = 0; i < slideCount; i++) {
        await page.evaluate((slideIndex) => {
          const slides = document.querySelectorAll("[data-slide]");
          slides.forEach((slide, idx) => {
            (slide as HTMLElement).style.display =
              idx === slideIndex ? "block" : "none";
          });
        }, i);

        const screenshot = await page.screenshot({
          type: "png",
          fullPage: false,
        });

        screenshots.push(screenshot as Buffer);
      }

      logger.info("PNG export completed", {
        slideCount,
        quality: options.quality,
      });

      return screenshots;
    } catch (error) {
      logger.error("PNG export error", error as Error);
      throw new Error(`Failed to export to PNG: ${(error as Error).message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Export presentation to HTML (standalone)
   */
  static async exportToHTML(
    presentationHTML: string,
    cssContent: string,
    options: ExportOptions = { format: "html" }
  ): Promise<string> {
    try {
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presentation Export</title>
  <style>
    ${cssContent}
    
    /* Print-specific styles */
    @media print {
      body { margin: 0; padding: 0; }
      .slide { page-break-after: always; }
      .no-print { display: none; }
    }
    
    /* Navigation styles */
    .nav-controls {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 10px;
    }
    
    .nav-button {
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    
    .nav-button:hover {
      background: #2563eb;
    }
    
    .nav-button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  ${presentationHTML}
  
  <div class="nav-controls no-print">
    <button class="nav-button" id="prevBtn">← Previous</button>
    <button class="nav-button" id="nextBtn">Next →</button>
    <button class="nav-button" id="fullscreenBtn">Fullscreen</button>
  </div>
  
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('[data-slide]');
    
    function showSlide(index) {
      if (index < 0 || index >= slides.length) return;
      
      slides.forEach((slide, i) => {
        slide.style.display = i === index ? 'block' : 'none';
      });
      
      currentSlide = index;
      
      document.getElementById('prevBtn').disabled = index === 0;
      document.getElementById('nextBtn').disabled = index === slides.length - 1;
    }
    
    document.getElementById('prevBtn').addEventListener('click', () => {
      showSlide(currentSlide - 1);
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
      showSlide(currentSlide + 1);
    });
    
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
      if (e.key === 'ArrowRight') showSlide(currentSlide + 1);
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }
    });
    
    // Initialize
    showSlide(0);
  </script>
</body>
</html>
      `;

      logger.info("HTML export completed");
      return htmlTemplate;
    } catch (error) {
      logger.error("HTML export error", error as Error);
      throw new Error(`Failed to export to HTML: ${(error as Error).message}`);
    }
  }

  /**
   * Get file extension for export format
   */
  static getFileExtension(format: ExportOptions["format"]): string {
    const extensions = {
      pdf: "pdf",
      pptx: "pptx",
      png: "zip", // Multiple PNGs will be zipped
      html: "html",
    };
    return extensions[format];
  }

  /**
   * Get MIME type for export format
   */
  static getMimeType(format: ExportOptions["format"]): string {
    const mimeTypes = {
      pdf: "application/pdf",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      png: "application/zip",
      html: "text/html",
    };
    return mimeTypes[format];
  }
}
