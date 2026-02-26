"use client";

import { Badge } from "@/components/ui/badge";
import { useCollaboration } from "@/hooks/globals/use-collaboration";
import { Wifi, WifiOff } from "lucide-react";

export function ConnectionStatus() {
  const { isConnected, isJoined } = useCollaboration();

  if (!isJoined) {
    return null;
  }

  return (
    <Badge
      variant={isConnected ? "default" : "destructive"}
      className="gap-1.5"
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Disconnected</span>
        </>
      )}
    </Badge>
  );
}
