"use client";

import {
  analyzeSlideWithCopilot,
  applyCopilotSuggestion,
} from "@/app/_actions/presentation/smart-generation-actions";
import type { PlateSlide } from "@/components/presentation/utils/parser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertCircle,
  Bot,
  CheckCircle,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AICopilotPanelProps {
  slide: PlateSlide;
  slideIndex: number;
  onApplySuggestion: (updatedSlide: PlateSlide) => void;
  onUpdateSpeakerNotes?: (notes: string) => void;
}

interface CopilotSuggestion {
  id: string;
  type: string;
  severity: "info" | "suggestion" | "warning" | "error";
  title: string;
  description: string;
  original: string;
  suggested: string;
  confidence: number;
}

export function AICopilotPanel({
  slide,
  slideIndex,
  onApplySuggestion,
  onUpdateSpeakerNotes,
}: AICopilotPanelProps) {
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [speakerNotes, setSpeakerNotes] = useState<any>(null);
  const [readability, setReadability] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const { toast } = useToast();

  useEffect(() => {
    analyzeCurrentSlide();
  }, [slideIndex]);

  const analyzeCurrentSlide = async () => {
    setIsAnalyzing(true);

    try {
      const result = await analyzeSlideWithCopilot(slide, slideIndex, {
        checkGrammar: true,
        generateSpeakerNotes: true,
        suggestImages: false, // Keep false for performance
        simplifyLanguage: true,
        checkReadability: true,
      });

      if (result.success && result.data) {
        setSuggestions(result.data.suggestions || []);
        setSpeakerNotes(result.data.speakerNotes || null);
        setReadability(result.data.readability || null);
      } else {
        toast({
          title: "Analysis Failed",
          description: result.error || "Failed to analyze slide",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplySuggestion = async (suggestion: CopilotSuggestion) => {
    try {
      const result = await applyCopilotSuggestion(
        slide,
        suggestion.id,
        slideIndex,
      );

      if (result.success && result.data) {
        onApplySuggestion(result.data);
        setAppliedSuggestions(new Set(appliedSuggestions).add(suggestion.id));
        toast({
          title: "Applied!",
          description: "Suggestion has been applied to your slide",
        });
      } else {
        toast({
          title: "Failed",
          description: result.error || "Failed to apply suggestion",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "destructive";
      case "warning":
        return "default";
      case "suggestion":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Co-Pilot
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={analyzeCurrentSlide}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Re-analyze slide</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Real-time suggestions to improve your slides
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing slide...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Readability Score */}
              {readability && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Readability Score
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold">
                      {readability.score}
                    </div>
                    <div>
                      <Badge
                        variant={
                          readability.grade === "excellent"
                            ? "default"
                            : readability.grade === "good"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {readability.grade}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {readability.metrics.readingLevel} level
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Suggestions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Suggestions ({suggestions.length})
                </h3>

                {suggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="text-sm font-medium">Looks great!</p>
                    <p className="text-xs text-muted-foreground">
                      No suggestions for this slide
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <Card
                        key={suggestion.id}
                        className={
                          appliedSuggestions.has(suggestion.id)
                            ? "bg-muted/50 border-green-500/50"
                            : ""
                        }
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div>
                                <p className="text-sm font-medium">
                                  {suggestion.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {suggestion.description}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                getSeverityColor(suggestion.severity) as any
                              }
                            >
                              {suggestion.confidence}%
                            </Badge>
                          </div>

                          {suggestion.original && (
                            <div className="space-y-2 text-xs">
                              <div className="p-2 bg-destructive/10 rounded border border-destructive/20">
                                <p className="font-medium text-destructive mb-1">
                                  Original:
                                </p>
                                <p className="text-muted-foreground">
                                  {suggestion.original}
                                </p>
                              </div>

                              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                                <p className="font-medium text-green-700 dark:text-green-400 mb-1">
                                  Suggested:
                                </p>
                                <p className="text-muted-foreground">
                                  {suggestion.suggested}
                                </p>
                              </div>
                            </div>
                          )}

                          {!appliedSuggestions.has(suggestion.id) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleApplySuggestion(suggestion)}
                            >
                              <CheckCircle className="h-3 w-3 mr-2" />
                              Apply Suggestion
                            </Button>
                          ) : (
                            <div className="text-center text-sm text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Applied
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Speaker Notes */}
              {speakerNotes && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Speaker Notes
                    </h3>

                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm text-muted-foreground">
                          {speakerNotes.notes}
                        </div>

                        <Separator />

                        <div>
                          <p className="text-xs font-semibold mb-2">
                            Key Points:
                          </p>
                          <ul className="text-xs space-y-1">
                            {speakerNotes.keyPoints.map(
                              (point: string, idx: number) => (
                                <li key={idx} className="flex gap-2">
                                  <span className="text-primary">•</span>
                                  {point}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            ⏱️ Est. time: ~{speakerNotes.talkingTime}s
                          </span>
                        </div>

                        {onUpdateSpeakerNotes && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              onUpdateSpeakerNotes?.(speakerNotes.notes)
                            }
                          >
                            Add to Presentation
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
