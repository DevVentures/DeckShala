"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateService, type IndustryTemplate } from "@/lib/template-service";
import { type TemplateCategory } from "@prisma/client";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (
    category: TemplateCategory,
    template: IndustryTemplate,
  ) => void;
}

export function TemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const industryTemplates = TemplateService.getIndustryTemplates();

  // Filter templates based on search
  const filteredTemplates = industryTemplates.filter(
    (template) =>
      template.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.targetAudience.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectTemplate = (template: IndustryTemplate) => {
    setSelectedCategory(template.category);
  };

  const handleConfirmSelection = () => {
    if (!selectedCategory) return;

    const template = industryTemplates.find(
      (t) => t.category === selectedCategory,
    );
    if (template) {
      onSelectTemplate(selectedCategory, template);
      toast.success(`${template.displayName} template selected`);
      onOpenChange(false);
    }
  };

  const selectedTemplate = industryTemplates.find(
    (t) => t.category === selectedCategory,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Choose Industry Template
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Select a template to generate presentations optimized for your
            industry and use case
          </p>
        </DialogHeader>

        {/* Search Bar */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, use case, or audience..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: "50vh" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <button
                key={template.category}
                onClick={() => handleSelectTemplate(template)}
                className={`
                  relative p-5 rounded-lg border-2 text-left transition-all hover:shadow-lg
                  ${
                    selectedCategory === template.category
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                      : "border-border hover:border-purple-300"
                  }
                `}
              >
                {/* Icon and Title */}
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{template.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base mb-1">
                      {template.displayName}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {template.defaultSlideCount} slides
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {template.description}
                </p>

                {/* Target Audience */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">For:</span>
                  <span className="line-clamp-1">
                    {template.targetAudience}
                  </span>
                </div>

                {/* Selected Indicator */}
                {selectedCategory === template.category && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No templates found matching "{searchQuery}"</p>
            </div>
          )}
        </ScrollArea>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="px-6 py-4 bg-muted/30 border-t">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  {selectedTemplate.icon} {selectedTemplate.displayName}
                </h4>
                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  <p>
                    <strong>Sections:</strong>{" "}
                    {selectedTemplate.requiredSections.slice(0, 3).join(", ")}
                    {selectedTemplate.requiredSections.length > 3 &&
                      ` +${selectedTemplate.requiredSections.length - 3} more`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.bestPractices
                    .slice(0, 2)
                    .map((practice, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {practice}
                      </Badge>
                    ))}
                </div>
              </div>
              <Button
                onClick={handleConfirmSelection}
                size="sm"
                className="gap-2"
              >
                Use Template <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!selectedTemplate && (
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Select a template above to continue
            </p>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
