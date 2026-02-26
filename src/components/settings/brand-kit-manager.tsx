"use client";

import {
  createBrandKitAction,
  deleteBrandKitAction,
  getUserBrandKitsAction,
  setDefaultBrandKitAction,
  updateBrandKitAction,
  validateBrandColorsAction,
} from "@/app/_actions/brand-kit/brand-kit-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type BrandKitData } from "@/lib/brand-kit-service";
import { Check, Palette, Plus, Star, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface BrandKitManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBrandKitSelect?: (brandKitId: string) => void;
}

export function BrandKitManager({
  open,
  onOpenChange,
  onBrandKitSelect,
}: BrandKitManagerProps) {
  const [brandKits, setBrandKits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKit, setEditingKit] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState<BrandKitData>({
    organizationName: "",
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    accentColor: "#ec4899",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    headingFont: "Inter",
    bodyFont: "Inter",
    logoUrl: "",
    isDefault: false,
  });

  const [colorValidation, setColorValidation] = useState<any>(null);

  // Load brand kits on mount
  useEffect(() => {
    if (open) {
      loadBrandKits();
    }
  }, [open]);

  const loadBrandKits = async () => {
    setLoading(true);
    const result = await getUserBrandKitsAction();
    if (result.success) {
      setBrandKits(result.brandKits);
    }
    setLoading(false);
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingKit(null);
    setFormData({
      organizationName: "",
      primaryColor: "#6366f1",
      secondaryColor: "#8b5cf6",
      accentColor: "#ec4899",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      headingFont: "Inter",
      bodyFont: "Inter",
      logoUrl: "",
      isDefault: brandKits.length === 0, // First kit is default
    });
  };

  const handleEdit = (kit: any) => {
    setEditingKit(kit);
    setIsCreating(false);
    setFormData({
      organizationName: kit.organizationName,
      primaryColor: kit.primaryColor,
      secondaryColor: kit.secondaryColor || "",
      accentColor: kit.accentColor || "",
      backgroundColor: kit.backgroundColor || "#ffffff",
      textColor: kit.textColor || "#000000",
      headingFont: kit.headingFont || "Inter",
      bodyFont: kit.bodyFont || "Inter",
      logoUrl: kit.logoUrl || "",
      isDefault: kit.isDefault,
    });
  };

  const handleSave = async () => {
    if (!formData.organizationName || !formData.primaryColor) {
      toast.error("Organization name and primary color are required");
      return;
    }

    setLoading(true);

    if (editingKit) {
      // Update existing
      const result = await updateBrandKitAction(editingKit.id, formData);
      if (result.success) {
        toast.success("Brand kit updated successfully");
        await loadBrandKits();
        setEditingKit(null);
      } else {
        toast.error(result.error || "Failed to update brand kit");
      }
    } else {
      // Create new
      const result = await createBrandKitAction(formData);
      if (result.success) {
        toast.success("Brand kit created successfully");
        await loadBrandKits();
        setIsCreating(false);
      } else {
        toast.error(result.error || "Failed to create brand kit");
      }
    }

    setLoading(false);
  };

  const handleDelete = async (kitId: string) => {
    if (!confirm("Are you sure you want to delete this brand kit?")) return;

    setLoading(true);
    const result = await deleteBrandKitAction(kitId);
    if (result.success) {
      toast.success("Brand kit deleted");
      await loadBrandKits();
    } else {
      toast.error(result.error || "Failed to delete brand kit");
    }
    setLoading(false);
  };

  const handleSetDefault = async (kitId: string) => {
    setLoading(true);
    const result = await setDefaultBrandKitAction(kitId);
    if (result.success) {
      toast.success("Default brand kit updated");
      await loadBrandKits();
    } else {
      toast.error(result.error || "Failed to set default");
    }
    setLoading(false);
  };

  const handleValidateColors = async () => {
    const result = await validateBrandColorsAction({
      primary: formData.primaryColor,
      secondary: formData.secondaryColor,
      accent: formData.accentColor,
      background: formData.backgroundColor,
      text: formData.textColor,
    });

    if (result.success) {
      setColorValidation(result.validation);
      if (result.validation.isValid) {
        toast.success("Colors look good!");
      } else {
        toast.warning("Some color issues detected - check warnings below");
      }
    }
  };

  const isEditMode = isCreating || editingKit !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Palette className="h-6 w-6 text-indigo-500" />
            Brand Kit Manager
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your company branding for consistent AI-generated
            presentations
          </p>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Brand Kits List */}
          {!isEditMode && (
            <div className="w-64 border-r flex flex-col">
              <div className="p-4 border-b">
                <Button
                  onClick={handleCreateNew}
                  className="w-full gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> New Brand Kit
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {brandKits.map((kit) => (
                    <div
                      key={kit.id}
                      className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleEdit(kit)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {kit.organizationName}
                        </h4>
                        {kit.isDefault && (
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-1 mb-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: kit.primaryColor }}
                          title="Primary"
                        />
                        {kit.secondaryColor && (
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: kit.secondaryColor }}
                            title="Secondary"
                          />
                        )}
                        {kit.accentColor && (
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: kit.accentColor }}
                            title="Accent"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {kit.isPremium && (
                          <Badge variant="secondary" className="text-xs">
                            Premium
                          </Badge>
                        )}
                        {kit.isEnterprise && (
                          <Badge variant="default" className="text-xs">
                            Enterprise
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {brandKits.length === 0 && !loading && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No brand kits yet. Create your first one!
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Right Content - Edit/Create Form */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isEditMode ? (
              <>
                <ScrollArea className="flex-1 p-6">
                  <Tabs defaultValue="branding" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="branding">Branding</TabsTrigger>
                      <TabsTrigger value="colors">Colors</TabsTrigger>
                      <TabsTrigger value="typography">Typography</TabsTrigger>
                      <TabsTrigger value="assets">Assets</TabsTrigger>
                    </TabsList>

                    {/* Branding Tab */}
                    <TabsContent value="branding" className="space-y-4">
                      <div>
                        <Label htmlFor="orgName">Organization Name *</Label>
                        <Input
                          id="orgName"
                          value={formData.organizationName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              organizationName: e.target.value,
                            })
                          }
                          placeholder="Acme Corporation"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          checked={formData.isDefault}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isDefault: e.target.checked,
                            })
                          }
                          className="rounded"
                        />
                        <Label htmlFor="isDefault" className="cursor-pointer">
                          Set as default brand kit
                        </Label>
                      </div>
                    </TabsContent>

                    {/* Colors Tab */}
                    <TabsContent value="colors" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="primaryColor">Primary Color *</Label>
                          <div className="flex gap-2">
                            <Input
                              id="primaryColor"
                              type="color"
                              value={formData.primaryColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  primaryColor: e.target.value,
                                })
                              }
                              className="w-20 h-10"
                            />
                            <Input
                              value={formData.primaryColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  primaryColor: e.target.value,
                                })
                              }
                              placeholder="#6366f1"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="secondaryColor">
                            Secondary Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="secondaryColor"
                              type="color"
                              value={formData.secondaryColor || "#8b5cf6"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  secondaryColor: e.target.value,
                                })
                              }
                              className="w-20 h-10"
                            />
                            <Input
                              value={formData.secondaryColor || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  secondaryColor: e.target.value,
                                })
                              }
                              placeholder="#8b5cf6"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="accentColor">Accent Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="accentColor"
                              type="color"
                              value={formData.accentColor || "#ec4899"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  accentColor: e.target.value,
                                })
                              }
                              className="w-20 h-10"
                            />
                            <Input
                              value={formData.accentColor || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  accentColor: e.target.value,
                                })
                              }
                              placeholder="#ec4899"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="backgroundColor">
                            Background Color
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="backgroundColor"
                              type="color"
                              value={formData.backgroundColor || "#ffffff"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  backgroundColor: e.target.value,
                                })
                              }
                              className="w-20 h-10"
                            />
                            <Input
                              value={formData.backgroundColor || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  backgroundColor: e.target.value,
                                })
                              }
                              placeholder="#ffffff"
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex gap-2">
                            <Input
                              id="textColor"
                              type="color"
                              value={formData.textColor || "#000000"}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  textColor: e.target.value,
                                })
                              }
                              className="w-20 h-10"
                            />
                            <Input
                              value={formData.textColor || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  textColor: e.target.value,
                                })
                              }
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleValidateColors}
                        variant="outline"
                        size="sm"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Validate Colors
                      </Button>

                      {colorValidation && (
                        <div className="p-4 rounded-lg bg-muted/30">
                          {colorValidation.warnings.length > 0 && (
                            <div className="space-y-2">
                              <p className="font-medium text-sm">Warnings:</p>
                              {colorValidation.warnings.map(
                                (warning: string, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-sm text-yellow-600"
                                  >
                                    ⚠️ {warning}
                                  </p>
                                ),
                              )}
                            </div>
                          )}
                          {colorValidation.suggestions.length > 0 && (
                            <div className="space-y-2 mt-2">
                              <p className="font-medium text-sm">
                                Suggestions:
                              </p>
                              {colorValidation.suggestions.map(
                                (suggestion: string, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-sm text-muted-foreground"
                                  >
                                    💡 {suggestion}
                                  </p>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    {/* Typography Tab */}
                    <TabsContent value="typography" className="space-y-4">
                      <div>
                        <Label htmlFor="headingFont">Heading Font</Label>
                        <Input
                          id="headingFont"
                          value={formData.headingFont || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              headingFont: e.target.value,
                            })
                          }
                          placeholder="Inter, Poppins, Roboto..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="bodyFont">Body Font</Label>
                        <Input
                          id="bodyFont"
                          value={formData.bodyFont || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              bodyFont: e.target.value,
                            })
                          }
                          placeholder="Inter, Open Sans, Lato..."
                        />
                      </div>
                    </TabsContent>

                    {/* Assets Tab */}
                    <TabsContent value="assets" className="space-y-4">
                      <div>
                        <Label htmlFor="logoUrl">Logo URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="logoUrl"
                            value={formData.logoUrl || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                logoUrl: e.target.value,
                              })
                            }
                            placeholder="https://example.com/logo.png"
                            className="flex-1"
                          />
                          <Button variant="outline" size="icon">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                        {formData.logoUrl && (
                          <div className="mt-2 p-4 border rounded-lg">
                            <img
                              src={formData.logoUrl}
                              alt="Logo preview"
                              className="max-h-20 object-contain"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>

                {/* Action Buttons */}
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="flex gap-2">
                    {editingKit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(editingKit.id)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        {!editingKit.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(editingKit.id)}
                            disabled={loading}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Set Default
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsCreating(false);
                        setEditingKit(null);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? "Saving..." : editingKit ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-4">
                  <Palette className="h-16 w-16 mx-auto text-muted-foreground/50" />
                  <div>
                    <p className="text-lg font-medium">No brand kit selected</p>
                    <p className="text-sm">
                      Select a brand kit or create a new one to get started
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
