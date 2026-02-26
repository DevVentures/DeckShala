"use client";

import { BrandKitManager } from "@/components/settings/brand-kit-manager";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Palette } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [showBrandKitManager, setShowBrandKitManager] = useState(false);

  return (
    <div className="container mx-auto max-w-5xl space-y-8 py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and presentation preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <Palette className="h-5 w-5 text-primary" />
                    Brand Kits
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Create and manage your brand kits for consistent, on-brand
                    presentations
                  </p>
                </div>
                <Button onClick={() => setShowBrandKitManager(true)}>
                  Manage Brand Kits
                </Button>
              </div>

              <div className="rounded-md border-l-4 border-primary bg-primary/5 p-4">
                <h4 className="mb-2 font-semibold">What are Brand Kits?</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Store your organization's colors, fonts, and logo</li>
                  <li>
                    • Automatically apply your brand to AI-generated
                    presentations
                  </li>
                  <li>
                    • Ensure consistent, professional look across all decks
                  </li>
                  <li>• Set a default brand kit for automatic application</li>
                </ul>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border bg-muted/30 p-4">
                  <h4 className="mb-2 font-medium">Industry Templates</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose from 12 industry-specific templates when creating
                    presentations. Your brand kit will be automatically applied.
                  </p>
                </div>
                <div className="rounded-md border bg-muted/30 p-4">
                  <h4 className="mb-2 font-medium">AI-Enhanced Prompts</h4>
                  <p className="text-sm text-muted-foreground">
                    AI generation uses your brand guidelines to create perfectly
                    aligned content with your organization's identity.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-muted-foreground">
              Presentation preferences will be added here.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <p className="text-muted-foreground">
              Account settings will be added here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Brand Kit Manager Dialog */}
      <BrandKitManager
        open={showBrandKitManager}
        onOpenChange={setShowBrandKitManager}
      />
    </div>
  );
}
