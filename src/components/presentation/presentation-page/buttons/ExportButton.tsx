// components/export-ppt-button.tsx
"use client";

import {
  exportPresentation,
  exportPresentationAsPDF,
} from "@/app/_actions/presentation/exportPresentationActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { logger } from "@/lib/logger";
import { themes } from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import { Download, FileText, Presentation } from "lucide-react";
import { useState } from "react";

interface ExportPPTButtonProps {
  presentationId: string;
  fileName?: string;
}

type ExportFormat = "pptx" | "pdf";

export function ExportButton({
  presentationId,
  fileName = "presentation",
}: ExportPPTButtonProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pptx");
  const { toast } = useToast();
  const theme = usePresentationState((s) => s.theme);
  const customThemeData = usePresentationState((s) => s.customThemeData);

  const getThemeColors = () => {
    if (customThemeData) {
      const colors = customThemeData.colors.light;
      return {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        background: colors.background,
        text: colors.text,
        heading: colors.heading,
        muted: colors.muted,
      };
    }
    if (typeof theme === "string" && theme in themes) {
      const t = themes[theme as keyof typeof themes];
      const colors = t.colors.light;
      return {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        background: colors.background,
        text: colors.text,
        heading: colors.heading,
        muted: colors.muted,
      };
    }
    return undefined;
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const themeColors = getThemeColors();

      let result;
      let mimeType: string;
      let fileExtension: string;

      if (selectedFormat === "pdf") {
        result = await exportPresentationAsPDF(
          presentationId,
          fileName,
          themeColors,
        );
        mimeType = "application/pdf";
        fileExtension = "pdf";
      } else {
        // Remove # from colors for PPTX
        const pptxThemeColors = themeColors
          ? Object.entries(themeColors).reduce((acc, [key, value]) => {
              acc[key as keyof typeof themeColors] = value.replace("#", "");
              return acc;
            }, {} as any)
          : undefined;

        result = await exportPresentation(
          presentationId,
          fileName,
          pptxThemeColors,
        );
        mimeType =
          "application/vnd.openxmlformats-officedocument.presentationml.presentation";
        fileExtension = "pptx";
      }

      if (result.success && result.data) {
        // Create blob from base64 data
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName ?? `${fileName}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        document.body.removeChild(link);

        toast({
          title: "Export Successful",
          description: `Your presentation has been exported as ${selectedFormat.toUpperCase()}.`,
          variant: "default",
        });

        setIsExportDialogOpen(false);
      } else {
        throw new Error(result.error ?? "Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your presentation.",
        variant: "destructive",
      });
      logger.error("Export error", error as Error, {
        presentationId,
        fileName,
        format: selectedFormat,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors"
          disabled={isExporting}
          aria-label="Export presentation"
          title="Download presentation"
        >
          <Download className="mr-1 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Presentation</DialogTitle>
          <DialogDescription>
            Choose your preferred export format.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* PowerPoint Option */}
            <button
              type="button"
              onClick={() => setSelectedFormat("pptx")}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                selectedFormat === "pptx"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Presentation className="h-8 w-8 mb-2" />
              <span className="font-medium">PowerPoint</span>
              <span className="text-xs text-muted-foreground">.pptx</span>
            </button>

            {/* PDF Option */}
            <button
              type="button"
              onClick={() => setSelectedFormat("pdf")}
              className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                selectedFormat === "pdf"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <FileText className="h-8 w-8 mb-2" />
              <span className="font-medium">PDF</span>
              <span className="text-xs text-muted-foreground">.pdf</span>
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedFormat === "pptx"
              ? "Export as PowerPoint format with full editing capabilities."
              : "Export as PDF format for easy sharing and viewing."}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsExportDialogOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? "Exporting..."
              : `Export as ${selectedFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
