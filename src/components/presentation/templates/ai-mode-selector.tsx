"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateService, type IndustryTemplate } from "@/lib/template-service";
import type { TemplateCategory } from "@prisma/client";
import {
  ArrowRight,
  Briefcase,
  DollarSign,
  GraduationCap,
  Lightbulb,
  Megaphone,
  Presentation,
  Rocket,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface AIModeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (
    category: TemplateCategory,
    template: IndustryTemplate,
  ) => void;
}

// Prebuilt AI Mode Categories
const AI_MODE_CATEGORIES = [
  {
    id: "business",
    name: "Business & Sales",
    icon: Briefcase,
    color: "blue",
    modes: ["PITCH_DECK", "INVESTOR_DECK", "SALES_DECK", "BUSINESS_PROPOSAL"],
  },
  {
    id: "education",
    name: "Education & Training",
    icon: GraduationCap,
    color: "green",
    modes: ["CLASSROOM_PPT", "TRAINING_MATERIAL", "CONFERENCE_TALK"],
  },
  {
    id: "marketing",
    name: "Marketing & Growth",
    icon: Megaphone,
    color: "purple",
    modes: ["MARKETING_PLAN", "PRODUCT_LAUNCH", "CASE_STUDY"],
  },
  {
    id: "technical",
    name: "Technical & Research",
    icon: Zap,
    color: "orange",
    modes: ["TECHNICAL_PRESENTATION", "PROJECT_REPORT", "QUARTERLY_REVIEW"],
  },
] as const;

// Icon mapping for each template
const TEMPLATE_ICONS: Record<string, any> = {
  PITCH_DECK: Rocket,
  INVESTOR_DECK: DollarSign,
  SALES_DECK: TrendingUp,
  BUSINESS_PROPOSAL: Briefcase,
  CLASSROOM_PPT: GraduationCap,
  TRAINING_MATERIAL: Users,
  CONFERENCE_TALK: Presentation,
  MARKETING_PLAN: Megaphone,
  PRODUCT_LAUNCH: Lightbulb,
  CASE_STUDY: Lightbulb,
  TECHNICAL_PRESENTATION: Zap,
  PROJECT_REPORT: Briefcase,
  QUARTERLY_REVIEW: TrendingUp,
};

const COLOR_SCHEMES: Record<string, string> = {
  blue: "from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800",
  green:
    "from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800",
  purple:
    "from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800",
  orange:
    "from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800",
};

export function AIModeSelector({
  open,
  onOpenChange,
  onSelectMode,
}: AIModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<{
    category: TemplateCategory;
    template: IndustryTemplate;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("business");

  const allTemplates = TemplateService.getIndustryTemplates();

  const handleSelectMode = (template: IndustryTemplate) => {
    setSelectedMode({
      category: template.category,
      template,
    });
  };

  const handleConfirm = () => {
    if (selectedMode) {
      onSelectMode(selectedMode.category, selectedMode.template);
      onOpenChange(false);
      setSelectedMode(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
          <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            AI-Powered Presentation Modes
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            Select a prebuilt AI mode and let AI automatically structure your
            presentation with industry best practices
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="border-b px-6">
            <TabsList className="grid grid-cols-4 w-full">
              {AI_MODE_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <ScrollArea className="flex-1 p-6" style={{ maxHeight: "55vh" }}>
            {AI_MODE_CATEGORIES.map((category) => (
              <TabsContent
                key={category.id}
                value={category.id}
                className="mt-0"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.modes.map((modeCategory) => {
                    const template = allTemplates.find(
                      (t) => t.category === modeCategory,
                    );
                    if (!template) return null;

                    const Icon =
                      TEMPLATE_ICONS[template.category] || Presentation;
                    const isSelected =
                      selectedMode?.category === template.category;

                    return (
                      <button
                        key={template.category}
                        onClick={() => handleSelectMode(template)}
                        className={`relative p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg ${
                          isSelected
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20 shadow-md"
                            : `bg-gradient-to-br ${COLOR_SCHEMES[category.color]} hover:border-purple-300`
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start gap-4 mb-4">
                          <div
                            className={`p-3 rounded-lg ${
                              isSelected
                                ? "bg-purple-500 text-white"
                                : "bg-white dark:bg-gray-800"
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                              {template.displayName}
                              {isSelected && (
                                <Badge className="bg-purple-500">
                                  Selected
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-3">
                          {/* Target Audience */}
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">For:</span>
                            <span className="text-muted-foreground">
                              {template.targetAudience}
                            </span>
                          </div>

                          {/* Slide Count */}
                          <div className="flex items-center gap-2 text-sm">
                            <Presentation className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              ~{template.defaultSlideCount} slides
                            </span>
                            <span className="text-muted-foreground">
                              with AI structure
                            </span>
                          </div>

                          {/* Key Sections Preview */}
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-2 text-muted-foreground">
                              AI will include:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {template.requiredSections
                                .slice(0, 4)
                                .map((section) => (
                                  <Badge
                                    key={section}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {section}
                                  </Badge>
                                ))}
                              {template.requiredSections.length > 4 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{template.requiredSections.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <div className="p-1 rounded-full bg-purple-500">
                              <ArrowRight className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Category Description */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Why use {category.name} modes?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {category.id === "business" &&
                      "Perfect for pitching ideas, closing deals, and securing funding. AI follows proven frameworks used by successful companies."}
                    {category.id === "education" &&
                      "Create engaging learning materials with clear structure. AI organizes content pedagogically for maximum retention."}
                    {category.id === "marketing" &&
                      "Drive growth with compelling marketing presentations. AI crafts persuasive narratives that convert."}
                    {category.id === "technical" &&
                      "Present complex technical concepts clearly. AI structures information for technical audiences."}
                  </p>
                </div>
              </TabsContent>
            ))}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t p-6 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {selectedMode ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Selected: {selectedMode.template.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      AI will automatically structure your presentation with{" "}
                      {selectedMode.template.requiredSections.length} key
                      sections
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select an AI mode to continue
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedMode}
                  className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Continue with AI Mode
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
