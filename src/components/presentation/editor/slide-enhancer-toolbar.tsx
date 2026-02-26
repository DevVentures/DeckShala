"use client";

import {
  enhanceSlideAction,
  fixGrammarAction,
  generateSpeakerNotesAction,
  rephraseContentAction,
  shortenTextAction,
  suggestImagesAction,
} from "@/app/_actions/presentation/slide-enhancement-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type SlideEnhancementResult } from "@/lib/ai-slide-enhancer";
import {
  Check,
  Image,
  Mic,
  Minimize2,
  RefreshCw,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SlideEnhancerDialog } from "./slide-enhancer-dialog";

interface SlideEnhancerToolbarProps {
  slideContent: string;
  slideIndex: number;
  onContentChange: (content: string) => void;
  onShowSpeakerNotes?: (notes: string) => void;
  onShowImageSuggestions?: (suggestions: string[]) => void;
}

export function SlideEnhancerToolbar({
  slideContent,
  slideIndex,
  onContentChange,
  onShowSpeakerNotes,
  onShowImageSuggestions,
}: SlideEnhancerToolbarProps) {
  const [showEnhancerDialog, setShowEnhancerDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleEnhance = async (options: {
    rephrase?: boolean;
    shorten?: boolean;
    improveStructure?: boolean;
    suggestLayouts?: boolean;
    addVisuals?: boolean;
    tone?: "professional" | "casual" | "academic" | "creative";
  }): Promise<SlideEnhancementResult> => {
    const result = await enhanceSlideAction(slideContent, slideIndex, options);

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to enhance slide");
    }

    return result.data;
  };

  const handleQuickAction = async (
    action: () => Promise<{ success: boolean; data?: any; error?: string }>,
    successMessage: string,
  ) => {
    setIsProcessing(true);
    try {
      const result = await action();
      if (result.success && result.data) {
        if (typeof result.data === "string") {
          onContentChange(result.data);
        }
        toast.success(successMessage);
      } else {
        toast.error(result.error || "Operation failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRephrase = () => {
    handleQuickAction(
      () => rephraseContentAction(slideContent, "professional"),
      "Content rephrased successfully",
    );
  };

  const handleShorten = () => {
    handleQuickAction(
      () => shortenTextAction(slideContent, "moderate"),
      "Text shortened successfully",
    );
  };

  const handleFixGrammar = () => {
    handleQuickAction(
      () => fixGrammarAction(slideContent),
      "Grammar fixed successfully",
    );
  };

  const handleGenerateSpeakerNotes = async () => {
    setIsProcessing(true);
    try {
      const result = await generateSpeakerNotesAction(slideContent, slideIndex);
      if (result.success && result.data) {
        onShowSpeakerNotes?.(result.data);
        toast.success("Speaker notes generated");
      } else {
        toast.error(result.error || "Failed to generate speaker notes");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestImages = async () => {
    setIsProcessing(true);
    try {
      const result = await suggestImagesAction(slideContent);
      if (result.success && result.data) {
        onShowImageSuggestions?.(result.data);
        toast.success("Image suggestions generated");
      } else {
        toast.error(result.error || "Failed to suggest images");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Main Enhancer Button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowEnhancerDialog(true)}
          disabled={isProcessing}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Wand2 className="mr-2 h-4 w-4" />
          Make My Slides Better
        </Button>

        {/* Quick Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isProcessing}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Quick Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Content Enhancement</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleRephrase}>
              <Type className="mr-2 h-4 w-4" />
              Rephrase Content
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShorten}>
              <Minimize2 className="mr-2 h-4 w-4" />
              Shorten Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleFixGrammar}>
              <Check className="mr-2 h-4 w-4" />
              Fix Grammar
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Slide Helpers</DropdownMenuLabel>
            <DropdownMenuItem onClick={handleGenerateSpeakerNotes}>
              <Mic className="mr-2 h-4 w-4" />
              Generate Speaker Notes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSuggestImages}>
              <Image className="mr-2 h-4 w-4" />
              Suggest Images
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setShowEnhancerDialog(true)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Full Enhancement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Enhancer Dialog */}
      <SlideEnhancerDialog
        open={showEnhancerDialog}
        onOpenChange={setShowEnhancerDialog}
        slideContent={slideContent}
        slideIndex={slideIndex}
        onApply={onContentChange}
        onEnhance={handleEnhance}
      />
    </>
  );
}
