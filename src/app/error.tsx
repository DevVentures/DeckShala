"use client";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    logger.error("Unhandled application error", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-destructive opacity-80" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Something went wrong
          </h2>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified. Please try
            again or return to the dashboard.
          </p>
          {process.env.NODE_ENV === "development" && error.message && (
            <pre className="mt-4 rounded-md bg-muted p-3 text-left text-xs font-mono text-muted-foreground overflow-auto max-h-32">
              {error.message}
            </pre>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/presentation";
            }}
          >
            Go to Dashboard
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground/50">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
