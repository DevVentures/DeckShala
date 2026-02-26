import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export function PresentationHeader() {
  const router = useRouter();

  return (
    <div className="relative space-y-4 text-center">
      {/* Settings Button - Top Right */}
      <div className="absolute right-0 top-0">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push("/settings")}
          className="rounded-full"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
        Create stunning presentations
        <br />
        in seconds with AI
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Powered by AI to turn your ideas into professional presentations
        instantly
      </p>
    </div>
  );
}
