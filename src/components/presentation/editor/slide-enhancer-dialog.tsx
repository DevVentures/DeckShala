"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SlideEnhancementResult } from "@/lib/ai-slide-enhancer";
import {
  Check,
  Image,
  Layout,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";

interface SlideEnhancerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideContent: string;
  slideIndex: number;
  onApply: (enhancedContent: string) => void;
  onEnhance: (options: {
    rephrase?: boolean;
    shorten?: boolean;
    improveStructure?: boolean;
    suggestLayouts?: boolean;
    addVisuals?: boolean;
    tone?: "professional" | "casual" | "academic" | "creative";
  }) => Promise<SlideEnhancementResult>;
}

export function SlideEnhancerDialog({
  open,
  onOpenChange,
  slideContent,
  slideIndex,
  onApply,
  onEnhance,
}: SlideEnhancerDialogProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancementResult, setEnhancementResult] =
    useState<SlideEnhancementResult | null>(null);
  const [selectedTab, setSelectedTab] = useState("preview");

  // Enhancement options
  const [rephrase, setRephrase] = useState(true);
  const [shorten, setShorten] = useState(true);
  const [improveStructure, setImproveStructure] = useState(true);
  const [suggestLayouts, setSuggestLayouts] = useState(true);
  const [addVisuals, setAddVisuals] = useState(true);
  const [tone, setTone] = useState<
    "professional" | "casual" | "academic" | "creative"
  >("professional");

  const handleEnhance = async () => {
    setIsEnhancing(true);
    try {
      const result = await onEnhance({
        rephrase,
        shorten,
        improveStructure,
        suggestLayouts,
        addVisuals,
        tone,
      });
      setEnhancementResult(result);
      setSelectedTab("preview");
    } catch (error) {
      console.error("Enhancement error:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleApply = () => {
    if (enhancementResult) {
      onApply(enhancementResult.enhancedContent);
      onOpenChange(false);
      setEnhancementResult(null);
    }
  };

  const handleReset = () => {
    setEnhancementResult(null);
    setSelectedTab("preview");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            Make My Slides Better
          </DialogTitle>
          <DialogDescription>
            Enhance slide {slideIndex + 1} with AI-powered improvements
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4">
          {/* Left Panel: Options */}
          <div className="col-span-1 space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                Enhancement Options
              </Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rephrase"
                    checked={rephrase}
                    onCheckedChange={(checked) =>
                      setRephrase(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="rephrase"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Rephrase content
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shorten"
                    checked={shorten}
                    onCheckedChange={(checked) =>
                      setShorten(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="shorten"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Shorten text
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="structure"
                    checked={improveStructure}
                    onCheckedChange={(checked) =>
                      setImproveStructure(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="structure"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Improve structure
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="layouts"
                    checked={suggestLayouts}
                    onCheckedChange={(checked) =>
                      setSuggestLayouts(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="layouts"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Suggest layouts
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visuals"
                    checked={addVisuals}
                    onCheckedChange={(checked) =>
                      setAddVisuals(checked as boolean)
                    }
                  />
                  <Label
                    htmlFor="visuals"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Add visuals
                  </Label>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-sm font-semibold mb-3 block">Tone</Label>
              <RadioGroup value={tone} onValueChange={setTone as any}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professional" id="professional" />
                  <Label htmlFor="professional" className="text-sm font-normal">
                    Professional
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="casual" id="casual" />
                  <Label htmlFor="casual" className="text-sm font-normal">
                    Casual
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="academic" id="academic" />
                  <Label htmlFor="academic" className="text-sm font-normal">
                    Academic
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="creative" id="creative" />
                  <Label htmlFor="creative" className="text-sm font-normal">
                    Creative
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleEnhance}
              disabled={isEnhancing}
              className="w-full"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance Slide
                </>
              )}
            </Button>
          </div>

          {/* Right Panel: Results */}
          <div className="col-span-2">
            {!enhancementResult ? (
              <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Click "Enhance Slide" to see improvements</p>
                </div>
              </div>
            ) : (
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <div className="flex items-center justify-between mb-2">
                  <TabsList>
                    <TabsTrigger value="preview">Enhanced</TabsTrigger>
                    <TabsTrigger value="original">Original</TabsTrigger>
                    <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                  </TabsList>
                  <Badge variant="secondary">
                    Confidence: {enhancementResult.confidence}%
                  </Badge>
                </div>

                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <TabsContent value="preview" className="m-0">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Enhanced Content
                        </Label>
                        <div className="mt-2 p-4 bg-muted/50 rounded-md">
                          <p className="whitespace-pre-wrap">
                            {enhancementResult.enhancedContent}
                          </p>
                        </div>
                      </div>

                      {enhancementResult.improvements.rephrasedContent && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Rephrased Version
                          </Label>
                          <div className="mt-2 p-4 bg-muted/30 rounded-md">
                            <p className="whitespace-pre-wrap">
                              {enhancementResult.improvements.rephrasedContent}
                            </p>
                          </div>
                        </div>
                      )}

                      {enhancementResult.improvements.shortenedText && (
                        <div>
                          <Label className="text-xs text-muted-foreground">
                            Shortened Version
                          </Label>
                          <div className="mt-2 p-4 bg-muted/30 rounded-md">
                            <p className="whitespace-pre-wrap">
                              {enhancementResult.improvements.shortenedText}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="original" className="m-0">
                    <div className="p-4 bg-muted/30 rounded-md">
                      <p className="whitespace-pre-wrap">{slideContent}</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="suggestions" className="m-0 space-y-4">
                    {enhancementResult.improvements.structuralImprovements &&
                      enhancementResult.improvements.structuralImprovements
                        .length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Structural Improvements
                          </Label>
                          <ul className="mt-2 space-y-2">
                            {enhancementResult.improvements.structuralImprovements.map(
                              (item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {enhancementResult.improvements.layoutSuggestions &&
                      enhancementResult.improvements.layoutSuggestions.length >
                        0 && (
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Layout className="h-4 w-4" />
                            Layout Suggestions
                          </Label>
                          <ul className="mt-2 space-y-2">
                            {enhancementResult.improvements.layoutSuggestions.map(
                              (item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}

                    {enhancementResult.improvements.visualRecommendations &&
                      enhancementResult.improvements.visualRecommendations
                        .length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Image className="h-4 w-4" />
                            Visual Recommendations
                          </Label>
                          <ul className="mt-2 space-y-2">
                            {enhancementResult.improvements.visualRecommendations.map(
                              (item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <Check className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter>
          {enhancementResult && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleApply}>
                <Check className="mr-2 h-4 w-4" />
                Apply Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
