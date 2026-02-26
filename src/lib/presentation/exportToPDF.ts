import { PDFDocument, rgb, StandardFonts, type PDFPage } from "pdf-lib";
import { logger } from "@/lib/logger";
import { type PlateSlide, type PlateNode } from "@/components/presentation/utils/parser";
import { type Descendant } from "platejs";

interface TextNode {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontFamily?: string;
  fontSize?: number | string;
  color?: string;
}

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  heading: string;
  muted: string;
}

interface PresentationData {
  slides: PlateSlide[];
}

export class PlateJSToPDFConverter {
  private pdfDoc: PDFDocument | null = null;
  private currentPage: PDFPage | null = null;

  // Layout constants (8.5" x 11" landscape = 16:9 approximate)
  private readonly PAGE_WIDTH = 792; // 11 inches * 72 pts/inch
  private readonly PAGE_HEIGHT = 612; // 8.5 inches * 72 pts/inch  
  private readonly MARGIN = 50;
  private readonly LINE_HEIGHT = 1.4;

  // Theme defaults
  private THEME: ThemeColors = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    accent: "#f59e0b",
    background: "#ffffff",
    text: "#1f2937",
    heading: "#111827",
    muted: "#6b7280",
  };

  constructor(customTheme?: Partial<ThemeColors>) {
    if (customTheme) {
      this.THEME = { ...this.THEME, ...customTheme };
    }
  }

  /**
   * Convert PlateJS presentation data to PDF
   */
  async convert(data: PresentationData): Promise<Uint8Array> {
    try {
      // Create PDF document
      this.pdfDoc = await PDFDocument.create();

      // Process each slide
      for (let i = 0; i < data.slides.length; i++) {
        const slide = data.slides[i];
        if (slide) {
          await this.convertSlide(slide, i + 1);
        }
      }

      // Save and return PDF as Uint8Array
      const pdfBytes = await this.pdfDoc.save();
      return pdfBytes;
    } catch (error) {
      logger.error("Error converting to PDF", error as Error);
      throw error;
    }
  }

  /**
   * Convert a single slide to PDF page
   */
  private async convertSlide(slide: PlateSlide, slideNumber: number) {
    if (!this.pdfDoc) throw new Error("PDF document not initialized");

    // Add new page (landscape)
    this.currentPage = this.pdfDoc.addPage([this.PAGE_WIDTH, this.PAGE_HEIGHT]);

    // Set background color
    const bgColor = this.hexToRgb(slide.bgColor || this.THEME.background);
    this.currentPage.drawRectangle({
      x: 0,
      y: 0,
      width: this.PAGE_WIDTH,
      height: this.PAGE_HEIGHT,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    });

    // Track Y position for content
    let currentY = this.PAGE_HEIGHT - this.MARGIN;

    // Add slide number (top right)
    const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    const mutedColor = this.hexToRgb(this.THEME.muted);
    const slideNumText = `${slideNumber}`;
    this.currentPage.drawText(slideNumText, {
      x: this.PAGE_WIDTH - this.MARGIN - 20,
      y: this.PAGE_HEIGHT - 30,
      size: 10,
      font,
      color: rgb(mutedColor.r, mutedColor.g, mutedColor.b),
    });

    // Process slide content
    currentY = await this.renderSlideContent(slide, currentY);
  }

  /**
   * Render slide content
   */
  private async renderSlideContent(slide: PlateSlide, startY: number): Promise<number> {
    if (!this.pdfDoc || !this.currentPage) return startY;

    let currentY = startY;
    const font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process slide content
    for (const node of slide.content) {
      if (node.type === "heading") {
        currentY = await this.renderHeading(node as any, currentY, boldFont, 28);
      } else if (node.type === "paragraph") {
        currentY = await this.renderParagraph(node as any, currentY, font, 14);
      } else if (node.type === "ul" || node.type === "ol") {
        currentY = await this.renderList(node as any, currentY, font, 14);
      } else if (node.type === "column_group") {
        // Handle column layouts
        currentY = await this.renderColumns(node as any, currentY, font, boldFont);
      }
      currentY -= 10; // Space between elements
    }

    return currentY;
  }

  /**
   * Render column group
   */
  private async renderColumns(
    columnGroup: any,
    y: number,
    font: any,
    boldFont: any
  ): Promise<number> {
    if (!this.currentPage) return y;

    const columns = columnGroup.children || [];
    const columnCount = columns.length;
    if (columnCount === 0) return y;

    const columnWidth = (this.PAGE_WIDTH - this.MARGIN * 2 - 30 * (columnCount - 1)) / columnCount;
    let minY = y;

    for (let i = 0; i < columns.length; i++) {
      const column = columns[i];
      const columnX = this.MARGIN + i * (columnWidth + 30);
      let columnY = y;

      // Render column content
      if (column.children) {
        for (const child of column.children) {
          if (child.type === "heading") {
            columnY = await this.renderHeading(child, columnY, boldFont, 20, columnX, columnWidth);
          } else if (child.type === "paragraph") {
            columnY = await this.renderParagraph(child, columnY, font, 12, columnX, columnWidth);
          } else if (child.type === "ul" || child.type === "ol") {
            columnY = await this.renderList(child, columnY, font, 12, columnX, columnWidth);
          }
          columnY -= 8;
        }
      }

      minY = Math.min(minY, columnY);
    }

    return minY;
  }

  /**
   * Render heading element
   */
  private async renderHeading(
    node: any,
    y: number,
    font: any,
    size: number,
    x: number = this.MARGIN,
    maxWidth: number = this.PAGE_WIDTH - this.MARGIN * 2
  ): Promise<number> {
    if (!this.currentPage) return y;

    const text = this.extractText(node);
    const color = this.hexToRgb(this.THEME.heading);

    // Handle text wrapping
    const lines = this.wrapText(text, maxWidth, size);
    let currentY = y;

    for (const line of lines) {
      this.currentPage.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
      currentY -= size * this.LINE_HEIGHT;
    }

    return currentY - 10;
  }

  /**
   * Render paragraph element
   */
  private async renderParagraph(
    node: any,
    y: number,
    font: any,
    size: number,
    x: number = this.MARGIN,
    maxWidth: number = this.PAGE_WIDTH - this.MARGIN * 2
  ): Promise<number> {
    if (!this.currentPage) return y;

    const text = this.extractText(node);
    const color = this.hexToRgb(this.THEME.text);

    // Handle text wrapping
    const lines = this.wrapText(text, maxWidth, size);
    let currentY = y;

    for (const line of lines) {
      this.currentPage.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });
      currentY -= size * this.LINE_HEIGHT;
    }

    return currentY;
  }

  /**
   * Render list element (ul/ol)
   */
  private async renderList(
    node: any,
    y: number,
    font: any,
    size: number,
    x: number = this.MARGIN,
    maxWidth: number = this.PAGE_WIDTH - this.MARGIN * 2
  ): Promise<number> {
    if (!this.currentPage) return y;

    let currentY = y;
    const bulletIndent = 20;
    const color = this.hexToRgb(this.THEME.text);

    const items = node.children || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const bullet = node.type === "ol" ? `${i + 1}.` : "•";
      const text = this.extractText(item);

      // Draw bullet
      this.currentPage.drawText(bullet, {
        x: x + 10,
        y: currentY,
        size,
        font,
        color: rgb(color.r, color.g, color.b),
      });

      // Draw text with wrapping
      const lines = this.wrapText(text, maxWidth - bulletIndent - 20, size);
      for (const line of lines) {
        this.currentPage.drawText(line, {
          x: x + bulletIndent + 10,
          y: currentY,
          size,
          font,
          color: rgb(color.r, color.g, color.b),
        });
        currentY -= size * this.LINE_HEIGHT;
      }

      currentY -= 5; // Space between items
    }

    return currentY;
  }

  /**
   * Extract plain text from a node tree
   */
  private extractText(node: any): string {
    if (typeof node === "string") {
      return node;
    }

    if (node && "text" in node) {
      return node.text || "";
    }

    if (node && node.children && Array.isArray(node.children)) {
      return node.children.map((child: any) => this.extractText(child)).join("");
    }

    return "";
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    if (!text) return [""];

    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    // Approximate character width (Helvetica)
    const charWidth = fontSize * 0.5;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = testLine.length * charWidth;

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  /**
   * Convert hex color to RGB values (0-1 range)
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace("#", "");
    const r = Number.parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = Number.parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = Number.parseInt(cleanHex.substring(4, 6), 16) / 255;

    return { r, g, b };
  }
}

/**
 * Main export function - converts PlateJS presentation to PDF
 */
export async function convertPlateJSToPDF(
  data: PresentationData,
  customTheme?: Partial<ThemeColors>
): Promise<Uint8Array> {
  const converter = new PlateJSToPDFConverter(customTheme);
  return await converter.convert(data);
}

