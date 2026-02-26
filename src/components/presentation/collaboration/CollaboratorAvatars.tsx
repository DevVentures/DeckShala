"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCollaboration } from "@/hooks/globals/use-collaboration";
import { Users } from "lucide-react";

export function CollaboratorAvatars() {
  const { collaborators, activeUsers, isConnected } = useCollaboration();

  if (!isConnected || collaborators.size === 0) {
    return null;
  }

  const collaboratorList = Array.from(collaborators.values()).filter(
    (collab) => collab.isActive,
  );

  // Show max 5 avatars
  const displayedCollaborators = collaboratorList.slice(0, 5);
  const remainingCount = Math.max(0, collaboratorList.length - 5);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center -space-x-2">
          {displayedCollaborators.map((collaborator) => (
            <Tooltip key={collaborator.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage
                    src={collaborator.userImage}
                    alt={collaborator.userName}
                  />
                  <AvatarFallback
                    style={{ backgroundColor: collaborator.color }}
                    className="text-xs font-semibold text-white"
                  >
                    {collaborator.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm font-medium">{collaborator.userName}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {remainingCount} more{" "}
                  {remainingCount === 1 ? "person" : "people"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {activeUsers} online
        </span>
      </div>
    </TooltipProvider>
  );
}
