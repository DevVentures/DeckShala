"use client";

import {
  autoDesignPresentation,
  getAvailableThemes,
} from "@/app/_actions/presentation/smart-generation-actions";
import { type PlateSlide } from "@/components/presentation/utils/parser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Check, Loader2, Palette, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";

interface AutoDesignThemeSelectorProps {
  slides: PlateSlide[];
  onApplyDesign: (designedSlides: PlateSlide[], theme: any) => void;
  targetAudience?: string;
  presentationType?: string;
}

export function AutoDesignThemeSelector({
  slides,
  onApplyDesign,
  targetAudience,
  presentationType,
}: AutoDesignThemeSelectorProps) {
  const [themes, setThemes] = useState<any[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: "",
    secondary: "",
  });
  const [showCustomBranding, setShowCustomBranding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    const result = await getAvailableThemes();
    if (result.success && result.data) {
      setThemes(result.data);
    }
  };

  const handleAutoDesign = async (themeId?: string) => {
    setIsApplying(true);

    try {
      const branding = showCustomBranding
        ? {
            primaryColor: customColors.primary || undefined,
            secondaryColor: customColors.secondary || undefined,
          }
        : undefined;

      const result = await autoDesignPresentation(slides, {
        branding,
        targetAudience,
        presentationType,
        preferredStyle: themeId,
      });

      if (result.success && result.data) {
        toast({
          title: "Design Applied! ✨",
          description: `Your presentation now looks professional with the ${result.data.theme.name} theme`,
        });
        onApplyDesign(result.data.designedSlides, result.data.theme);
      } else {
        toast({
          title: "Design Failed",
          description: result.error || "Failed to apply design",
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
      setIsApplying(false);
    }
  };

  const handleOneClickDesign = async () => {
    // AI automatically selects the best theme
    await handleAutoDesign();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            Auto Design & Theme Engine
          </CardTitle>
          <CardDescription>
            One-click beautiful slides - AI chooses the perfect design for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* One-Click Auto Design */}
          <div className="p-6 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg border-2 border-primary/20">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Recommended: AI Auto-Design
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Let AI analyze your content and apply the perfect theme,
                  colors, layouts, and spacing automatically. No design skills
                  needed!
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary">Smart Layouts</Badge>
                  <Badge variant="secondary">Color Matching</Badge>
                  <Badge variant="secondary">Typography</Badge>
                  <Badge variant="secondary">Icon Suggestions</Badge>
                </div>
              </div>
              <Button
                size="lg"
                onClick={handleOneClickDesign}
                disabled={isApplying}
                className="min-w-[180px]"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    One-Click Design
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Manual Theme Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Or Choose a Theme Manually
              </Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((theme) => (
                <Card
                  key={theme.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTheme === theme.id
                      ? "ring-2 ring-primary"
                      : "hover:ring-1 hover:ring-muted-foreground"
                  }`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{theme.name}</h4>
                        {selectedTheme === theme.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      {/* Color Preview */}
                      <div className="flex gap-2">
                        <div
                          className="h-10 w-10 rounded"
                          style={{ backgroundColor: theme.colors.primary }}
                          title="Primary"
                        />
                        <div
                          className="h-10 w-10 rounded"
                          style={{ backgroundColor: theme.colors.secondary }}
                          title="Secondary"
                        />
                        <div
                          className="h-10 w-10 rounded"
                          style={{ backgroundColor: theme.colors.accent }}
                          title="Accent"
                        />
                      </div>

                      {/* Typography Preview */}
                      <div className="text-xs text-muted-foreground">
                        <p style={{ fontFamily: theme.fonts.heading }}>
                          Heading Font
                        </p>
                        <p style={{ fontFamily: theme.fonts.body }}>
                          Body Font
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedTheme && (
              <Button
                className="w-full"
                onClick={() => handleAutoDesign(selectedTheme)}
                disabled={isApplying}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying Theme...
                  </>
                ) : (
                  <>
                    <Palette className="h-4 w-4 mr-2" />
                    Apply Selected Theme
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Custom Branding */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                Custom Branding (Optional)
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomBranding(!showCustomBranding)}
              >
                {showCustomBranding ? "Hide" : "Show"}
              </Button>
            </div>

            {showCustomBranding && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={customColors.primary}
                      onChange={(e) =>
                        setCustomColors({
                          ...customColors,
                          primary: e.target.value,
                        })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      placeholder="#2563eb"
                      value={customColors.primary}
                      onChange={(e) =>
                        setCustomColors({
                          ...customColors,
                          primary: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary-color"
                      type="color"
                      value={customColors.secondary}
                      onChange={(e) =>
                        setCustomColors({
                          ...customColors,
                          secondary: e.target.value,
                        })
                      }
                      className="w-16 h-10"
                    />
                    <Input
                      type="text"
                      placeholder="#3b82f6"
                      value={customColors.secondary}
                      onChange={(e) =>
                        setCustomColors({
                          ...customColors,
                          secondary: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">
              ✨ What Auto-Design Does:
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Analyzes content to select optimal theme</li>
              <li>• Applies professional typography and spacing</li>
              <li>• Matches colors for visual harmony</li>
              <li>• Suggests icons and visual elements</li>
              <li>• Optimizes layouts for each slide type</li>
              <li>• Makes you look like a design pro!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
