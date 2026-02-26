"use client";

import { createEmptyPresentation } from "@/app/_actions/presentation/presentationActions";
import { AIModeSelector } from "@/components/presentation/templates/ai-mode-selector";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import type { IndustryTemplate } from "@/lib/template-service";
import { usePresentationState } from "@/states/presentation-state";
import type { TemplateCategory } from "@prisma/client";
import { Sparkles, Wand2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PresentationControls } from "./PresentationControls";
import { PresentationExamples } from "./PresentationExamples";
import { PresentationHeader } from "./PresentationHeader";
import { PresentationInput } from "./PresentationInput";
import { PresentationsSidebar } from "./PresentationsSidebar";
import { RecentPresentations } from "./RecentPresentations";

export function PresentationDashboard({
  sidebarSide,
}: {
  sidebarSide?: "left" | "right";
}) {
  const router = useRouter();
  const {
    presentationInput,
    isGeneratingOutline,
    setCurrentPresentation,
    setIsGeneratingOutline,
    language,
    theme,
    setShouldStartOutlineGeneration,
  } = usePresentationState();

  const [showAIModeSelector, setShowAIModeSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{
    category: TemplateCategory;
    template: IndustryTemplate;
  } | null>(null);

  useEffect(() => {
    setCurrentPresentation("", "");
    // Make sure to reset any generation flags when landing on dashboard
    setIsGeneratingOutline(false);
    setShouldStartOutlineGeneration(false);
  }, []);

  const handleGenerate = async () => {
    if (!presentationInput.trim()) {
      toast.error("Please enter a topic for your presentation");
      return;
    }

    // Set UI loading state
    setIsGeneratingOutline(true);

    try {
      const result = await createEmptyPresentation(
        presentationInput.substring(0, 50) || "Untitled Presentation",
        theme,
        language,
        selectedTemplate?.category, // Pass selected template
      );

      if (result.success && result.presentation) {
        // Set the current presentation
        setCurrentPresentation(
          result.presentation.id,
          result.presentation.title,
        );
        router.push(`/presentation/generate/${result.presentation.id}`);
      } else {
        setIsGeneratingOutline(false);
        toast.error(result.message || "Failed to create presentation");
      }
    } catch (error) {
      setIsGeneratingOutline(false);
      logger.error("Error creating presentation", error as Error);
      toast.error("Failed to create presentation");
    }
  };

  const handleAIModeSelect = (
    category: TemplateCategory,
    template: IndustryTemplate,
  ) => {
    setSelectedTemplate({ category, template });
    toast.success(`🎯 AI Mode activated: ${template.displayName}`, {
      description: `AI will automatically structure ${template.defaultSlideCount} slides with ${template.requiredSections.length} key sections`,
      duration: 4000,
    });
  };

  return (
    <div className="notebook-section relative h-full w-full">
      <PresentationsSidebar side={sidebarSide} />
      <div className="mx-auto max-w-4xl space-y-12 px-6 py-12">
        <PresentationHeader />

        <div className="space-y-8">
          <PresentationInput handleGenerate={handleGenerate} />
          <PresentationControls />

          <div className="flex items-center justify-end gap-3">
            {/* AI Mode Selector Button */}
            <Button
              onClick={() => setShowAIModeSelector(true)}
              disabled={isGeneratingOutline}
              variant={selectedTemplate ? "default" : "outline"}
              className={
                selectedTemplate
                  ? "gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  : "gap-2"
              }
              size="lg"
            >
              {selectedTemplate ? (
                <>
                  <Zap className="h-4 w-4" />
                  {selectedTemplate.template.displayName}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Choose AI Mode
                </>
              )}
            </Button>

            <Button
              onClick={handleGenerate}
              disabled={!presentationInput.trim() || isGeneratingOutline}
              variant={isGeneratingOutline ? "loading" : "default"}
              className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
              size="lg"
              aria-label="Generate presentation from your topic"
              title={
                !presentationInput.trim()
                  ? "Please enter a topic first"
                  : selectedTemplate
                    ? `Generate with ${selectedTemplate.template.displayName} structure`
                    : "Generate presentation"
              }
            >
              {!isGeneratingOutline && <Wand2 className="h-4 w-4" />}
              {isGeneratingOutline ? "Generating..." : "Generate Presentation"}
            </Button>
          </div>

          {/* Selected Template Info */}
          {selectedTemplate && (
            <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">
                    🎯 AI Mode: {selectedTemplate.template.displayName}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedTemplate.template.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.template.requiredSections
                      .slice(0, 5)
                      .map((section) => (
                        <span
                          key={section}
                          className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border"
                        >
                          {section}
                        </span>
                      ))}
                    {selectedTemplate.template.requiredSections.length > 5 && (
                      <span className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-800 border">
                        +{selectedTemplate.template.requiredSections.length - 5}{" "}
                        more sections
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}
        </div>

        <PresentationExamples />
        <RecentPresentations />
      </div>

      {/* AI Mode Selector Dialog */}
      <AIModeSelector
        open={showAIModeSelector}
        onOpenChange={setShowAIModeSelector}
        onSelectMode={handleAIModeSelect}
      />
    </div>
  );
}
