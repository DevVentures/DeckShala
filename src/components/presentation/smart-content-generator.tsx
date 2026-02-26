"use client";

import {
  estimateSlideCount,
  parseTextContent,
  parseURLContent,
  parseYouTubeVideo,
} from "@/app/_actions/presentation/smart-generation-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  FileText,
  FileType,
  Link2,
  Loader2,
  Sparkles,
  Upload,
  Youtube,
} from "lucide-react";
import { useState } from "react";

interface SmartContentGeneratorProps {
  onGenerate: (presentation: any) => void;
  onClose?: () => void;
}

export function SmartContentGenerator({
  onGenerate,
  onClose,
}: SmartContentGeneratorProps) {
  const [contentType, setContentType] = useState<string>("text");
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [estimatedSlides, setEstimatedSlides] = useState<number | null>(null);
  const { toast } = useToast();

  // Estimate slide count as user types
  const handleTextChange = async (text: string) => {
    setTextContent(text);

    if (text.length > 100) {
      const result = await estimateSlideCount(text);
      if (result.success && result.data) {
        setEstimatedSlides(result.data.estimatedSlides);
      }
    } else {
      setEstimatedSlides(null);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      let result;

      switch (contentType) {
        case "text":
          if (!textContent.trim()) {
            toast({
              title: "Error",
              description: "Please enter some text content",
              variant: "destructive",
            });
            return;
          }
          result = await parseTextContent(textContent);
          break;

        case "url":
          if (!urlContent.trim()) {
            toast({
              title: "Error",
              description: "Please enter a URL",
              variant: "destructive",
            });
            return;
          }
          result = await parseURLContent(urlContent);
          break;

        case "youtube":
          if (!urlContent.trim()) {
            toast({
              title: "Error",
              description: "Please enter a YouTube URL",
              variant: "destructive",
            });
            return;
          }
          result = await parseYouTubeVideo(urlContent);
          break;

        default:
          toast({
            title: "Coming Soon",
            description: `${contentType} parsing is coming soon!`,
          });
          return;
      }

      if (result.success) {
        toast({
          title: "Success!",
          description: `Generated ${result.data.slides.length} slides from your content`,
        });
        onGenerate(result.data);
        onClose?.();
      } else {
        toast({
          title: "Generation Failed",
          description: result.error || "Failed to generate presentation",
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
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Smart Content-to-Presentation Generator
        </CardTitle>
        <CardDescription>
          Transform any content into a professional presentation instantly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="text" onValueChange={setContentType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="url">
              <Link2 className="h-4 w-4 mr-2" />
              URL
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="h-4 w-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="h-4 w-4 mr-2" />
              File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="text-content">Paste your content</Label>
              <Textarea
                id="text-content"
                placeholder="Paste your text, meeting notes, research paper, or any content here..."
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              {estimatedSlides && (
                <p className="text-sm text-muted-foreground">
                  📊 Estimated slides: ~{estimatedSlides}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type (Optional)</Label>
              <Select>
                <SelectTrigger id="content-type">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="meeting-notes">Meeting Notes</SelectItem>
                  <SelectItem value="research-paper">Research Paper</SelectItem>
                  <SelectItem value="article">Article/Blog</SelectItem>
                  <SelectItem value="transcript">Voice Transcript</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Enter URL</Label>
              <Input
                id="url-input"
                type="url"
                placeholder="https://example.com/article"
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                We&apos;ll extract the main content from the webpage
              </p>
            </div>
          </TabsContent>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube Video URL</Label>
              <Input
                id="youtube-url"
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={urlContent}
                onChange={(e) => setUrlContent(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                We&apos;ll analyze the video content and create slides
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-2">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supports PDF, Word, PowerPoint, Text files
                </p>
                <Button variant="outline" size="sm">
                  <FileType className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                File upload is coming soon! Use text paste for now.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="min-w-[200px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Presentation
              </>
            )}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">✨ What We&apos;ll Do:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Analyze and understand your content</li>
            <li>• Extract key points and main ideas</li>
            <li>• Create a logical presentation flow</li>
            <li>• Generate structured, professional slides</li>
            <li>• Apply beautiful design automatically</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
