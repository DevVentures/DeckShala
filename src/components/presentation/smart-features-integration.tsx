"use client";

import { type PlateSlide } from "@/components/presentation/utils/parser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { AICopilotPanel } from "./ai-copilot-panel";
import { AutoDesignThemeSelector } from "./auto-design-theme-selector";
import { SmartContentGenerator } from "./smart-content-generator";

/**
 * Integrated Smart Features Component
 * Combines all three core features:
 * 1. Smart Content-to-Presentation Generator
 * 2. Auto Design & Theme Engine
 * 3. Real-Time AI Co-Pilot
 */

interface SmartFeaturesIntegrationProps {
  currentSlides?: PlateSlide[];
  currentSlideIndex?: number;
  onSlidesUpdate?: (slides: PlateSlide[]) => void;
  onSlideUpdate?: (slide: PlateSlide, index: number) => void;
}

export function SmartFeaturesIntegration({
  currentSlides = [],
  currentSlideIndex = 0,
  onSlidesUpdate,
  onSlideUpdate,
}: SmartFeaturesIntegrationProps) {
  const [generatedSlides, setGeneratedSlides] =
    useState<PlateSlide[]>(currentSlides);
  const [selectedSlideIndex, setSelectedSlideIndex] =
    useState(currentSlideIndex);
  const [showContentGenerator, setShowContentGenerator] = useState(false);
  const [showDesignSelector, setShowDesignSelector] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  const handleContentGenerated = (presentation: any) => {
    setGeneratedSlides(presentation.slides);
    onSlidesUpdate?.(presentation.slides);
    setShowContentGenerator(false);
    setShowDesignSelector(true); // Auto-open design selector
    setActiveTab("design");
  };

  const handleDesignApplied = (designedSlides: PlateSlide[], theme: any) => {
    setGeneratedSlides(designedSlides);
    onSlidesUpdate?.(designedSlides);
    setShowDesignSelector(false);
    setActiveTab("copilot"); // Move to copilot
  };

  const handleCopilotSuggestionApplied = (updatedSlide: PlateSlide) => {
    const newSlides = [...generatedSlides];
    newSlides[selectedSlideIndex] = updatedSlide;
    setGeneratedSlides(newSlides);
    onSlidesUpdate?.(newSlides);
    onSlideUpdate?.(updatedSlide, selectedSlideIndex);
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog
          open={showContentGenerator}
          onOpenChange={setShowContentGenerator}
        >
          <DialogTrigger asChild>
            <Button size="lg" className="flex-1">
              <Sparkles className="h-5 w-5 mr-2" />
              Generate from Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <SmartContentGenerator
              onGenerate={handleContentGenerated}
              onClose={() => setShowContentGenerator(false)}
            />
          </DialogContent>
        </Dialog>

        {generatedSlides.length > 0 && (
          <>
            <Dialog
              open={showDesignSelector}
              onOpenChange={setShowDesignSelector}
            >
              <DialogTrigger asChild>
                <Button size="lg" variant="outline" className="flex-1">
                  <Wand2 className="h-5 w-5 mr-2" />
                  Auto-Design
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Auto Design Your Presentation</DialogTitle>
                  <DialogDescription>
                    Let AI apply professional design to all your slides
                  </DialogDescription>
                </DialogHeader>
                <AutoDesignThemeSelector
                  slides={generatedSlides}
                  onApplyDesign={handleDesignApplied}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Main Interface */}
      {generatedSlides.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator">
              <Sparkles className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="design">
              <Wand2 className="h-4 w-4 mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="copilot">
              <Bot className="h-4 w-4 mr-2" />
              Co-Pilot
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="mt-6">
            <SmartContentGenerator onGenerate={handleContentGenerated} />
          </TabsContent>

          <TabsContent value="design" className="mt-6">
            <AutoDesignThemeSelector
              slides={generatedSlides}
              onApplyDesign={handleDesignApplied}
            />
          </TabsContent>

          <TabsContent value="copilot" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Slide Preview */}
              <div className="lg:col-span-2 space-y-4">
                <div className="border rounded-lg p-6 bg-muted/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">
                      Slide {selectedSlideIndex + 1} of {generatedSlides.length}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedSlideIndex === 0}
                        onClick={() =>
                          setSelectedSlideIndex(selectedSlideIndex - 1)
                        }
                      >
                        Previous
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          selectedSlideIndex === generatedSlides.length - 1
                        }
                        onClick={() =>
                          setSelectedSlideIndex(selectedSlideIndex + 1)
                        }
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  {/* Simple slide preview */}
                  <div className="min-h-[400px] bg-white rounded-lg shadow-lg p-8">
                    <div className="prose max-w-none">
                      {generatedSlides[selectedSlideIndex]?.content?.map(
                        (child: any, idx: number) => (
                          <div key={idx}>
                            {child.type === "h1" && (
                              <h1 className="text-4xl font-bold">
                                {child.children?.[0]?.text || ""}
                              </h1>
                            )}
                            {child.type === "h2" && (
                              <h2 className="text-3xl font-semibold">
                                {child.children?.[0]?.text || ""}
                              </h2>
                            )}
                            {child.type === "p" && (
                              <p className="text-lg">
                                {child.children?.[0]?.text || ""}
                              </p>
                            )}
                            {child.type === "ul" && (
                              <ul className="list-disc list-inside">
                                {child.children?.map(
                                  (li: any, liIdx: number) => (
                                    <li key={liIdx} className="text-lg">
                                      {li.children?.[0]?.text || ""}
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Slide Thumbnails */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generatedSlides.map((slide, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSlideIndex(idx)}
                      className={`flex-shrink-0 w-32 h-24 border-2 rounded-lg p-2 text-xs transition-all ${
                        idx === selectedSlideIndex
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <div className="truncate font-semibold">
                        Slide {idx + 1}
                      </div>
                      <div className="truncate text-muted-foreground text-[10px]">
                        {(slide.content?.[0] as any)?.children?.[0]?.text ||
                          "Untitled"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Co-Pilot Panel */}
              <div className="lg:col-span-1">
                {generatedSlides[selectedSlideIndex] && (
                  <AICopilotPanel
                    slide={generatedSlides[selectedSlideIndex]}
                    slideIndex={selectedSlideIndex}
                    onApplySuggestion={handleCopilotSuggestionApplied}
                  />
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {generatedSlides.length === 0 && (
        <div className="text-center py-16">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            Create Your First Smart Presentation
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Use our AI-powered tools to generate, design, and enhance your
            presentations like a pro
          </p>
          <Button size="lg" onClick={() => setShowContentGenerator(true)}>
            <Sparkles className="h-5 w-5 mr-2" />
            Get Started
          </Button>
        </div>
      )}
    </div>
  );
}
