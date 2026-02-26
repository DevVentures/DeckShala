"use client";

import {
  analyzeSlideWithCopilot,
  autoDesignPresentation,
  createSmartPresentation,
  parseContentToPresentation,
} from "@/app/_actions/presentation/smart-generation-actions";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { useToast } from "@/components/ui/use-toast";
import { type BrandingRules } from "@/lib/auto-design-engine";
import { type ContentInput } from "@/lib/content-parser-service";
import { useCallback, useState } from "react";

/**
 * Custom hook for Smart Content Generation
 */
export function useSmartContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<any>(null);
  const { toast } = useToast();

  const generateFromContent = useCallback(
    async (input: ContentInput) => {
      setIsGenerating(true);

      try {
        const result = await parseContentToPresentation(input);

        if (result.success && result.data) {
          setGeneratedPresentation(result.data);
          toast({
            title: "Success!",
            description: `Generated ${result.data.slides.length} slides`,
          });
          return result.data;
        } else {
          toast({
            title: "Generation Failed",
            description: result.error,
            variant: "destructive",
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [toast],
  );

  const reset = useCallback(() => {
    setGeneratedPresentation(null);
  }, []);

  return {
    isGenerating,
    generatedPresentation,
    generateFromContent,
    reset,
  };
}

/**
 * Custom hook for Auto Design Engine
 */
export function useAutoDesign() {
  const [isDesigning, setIsDesigning] = useState(false);
  const [appliedTheme, setAppliedTheme] = useState<any>(null);
  const { toast } = useToast();

  const applyAutoDesign = useCallback(
    async (
      slides: PlateSlide[],
      options?: {
        branding?: BrandingRules;
        targetAudience?: string;
        presentationType?: string;
      },
    ) => {
      setIsDesigning(true);

      try {
        const result = await autoDesignPresentation(slides, options);

        if (result.success && result.data) {
          setAppliedTheme(result.data.theme);
          toast({
            title: "Design Applied!",
            description: `Applied ${result.data.theme.name} theme`,
          });
          return result.data;
        } else {
          toast({
            title: "Design Failed",
            description: result.error,
            variant: "destructive",
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsDesigning(false);
      }
    },
    [toast],
  );

  return {
    isDesigning,
    appliedTheme,
    applyAutoDesign,
  };
}

/**
 * Custom hook for AI Co-Pilot
 */
export function useAICopilot() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [speakerNotes, setSpeakerNotes] = useState<any>(null);
  const { toast } = useToast();

  const analyzeSlide = useCallback(
    async (
      slide: PlateSlide,
      slideIndex: number,
      options?: {
        checkGrammar?: boolean;
        generateSpeakerNotes?: boolean;
        suggestImages?: boolean;
        simplifyLanguage?: boolean;
        checkReadability?: boolean;
      },
    ) => {
      setIsAnalyzing(true);

      try {
        const result = await analyzeSlideWithCopilot(
          slide,
          slideIndex,
          options,
        );

        if (result.success && result.data) {
          setSuggestions(result.data.suggestions || []);
          setSpeakerNotes(result.data.speakerNotes || null);
          return result.data;
        } else {
          toast({
            title: "Analysis Failed",
            description: result.error,
            variant: "destructive",
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [toast],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSpeakerNotes(null);
  }, []);

  return {
    isAnalyzing,
    suggestions,
    speakerNotes,
    analyzeSlide,
    clearSuggestions,
  };
}

/**
 * Combined hook for all smart features
 * One-stop solution for the complete workflow
 */
export function useSmartPresentation() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [presentation, setPresentation] = useState<any>(null);
  const { toast } = useToast();

  const createSmartPresentationComplete = useCallback(
    async (
      input: ContentInput,
      options?: {
        autoDesign?: boolean;
        branding?: BrandingRules;
        targetAudience?: string;
        presentationType?: string;
        analyzeCopilot?: boolean;
      },
    ) => {
      setIsProcessing(true);

      try {
        const result = await createSmartPresentation(input, {
          autoDesign: options?.autoDesign ?? true,
          analyzeCopilot: options?.analyzeCopilot ?? true,
          ...options,
        });

        if (result.success) {
          setPresentation(result.data);
          toast({
            title: "Presentation Created!",
            description: "Your smart presentation is ready",
          });
          return result.data;
        } else {
          toast({
            title: "Creation Failed",
            description: result.error,
            variant: "destructive",
          });
          return null;
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  return {
    isProcessing,
    presentation,
    createSmartPresentationComplete,
  };
}
