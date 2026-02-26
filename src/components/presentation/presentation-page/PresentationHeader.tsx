"use client";
import SideBarDropdown from "@/components/auth/Dropdown";
import { Brain } from "@/components/ui/icons";
import { usePresentationState } from "@/states/presentation-state";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Import our new components
import DeckShalaText from "@/components/globals/allweone-logo";
import { Button } from "@/components/ui/button";
import * as motion from "framer-motion/client";
import { ExportButton } from "./buttons/ExportButton";
import { PresentButton } from "./buttons/PresentButton";
import { SaveStatus } from "./buttons/SaveStatus";
import { ShareButton } from "./buttons/ShareButton";

// Collaboration components
import { CollaboratorAvatars } from "@/components/presentation/collaboration/CollaboratorAvatars";
import { ConnectionStatus } from "@/components/presentation/collaboration/ConnectionStatus";
import { useCollaboration } from "@/hooks/globals/use-collaboration";

interface PresentationHeaderProps {
  title?: string;
}

export default function PresentationHeader({ title }: PresentationHeaderProps) {
  const currentPresentationTitle = usePresentationState(
    (s) => s.currentPresentationTitle,
  );
  const isPresenting = usePresentationState((s) => s.isPresenting);
  const currentPresentationId = usePresentationState(
    (s) => s.currentPresentationId,
  );
  const [presentationTitle, setPresentationTitle] =
    useState<string>("Presentation");
  const pathname = usePathname();
  const params = useParams();
  const presentationId = params.id as string;

  // Collaboration hooks
  const { joinPresentation, leavePresentation, isConnected } =
    useCollaboration();

  // Check if we're on the generate/outline page
  const isPresentationPage =
    pathname.startsWith("/presentation/") && !pathname.includes("generate");

  // Update title when it changes in the state
  useEffect(() => {
    if (currentPresentationTitle) {
      setPresentationTitle(currentPresentationTitle);
    } else if (title) {
      setPresentationTitle(title);
    }
  }, [currentPresentationTitle, title]);

  // Auto join/leave presentation for collaboration
  useEffect(() => {
    if (presentationId && isConnected && isPresentationPage && !isPresenting) {
      joinPresentation(presentationId);

      return () => {
        leavePresentation();
      };
    }
  }, [
    presentationId,
    isConnected,
    isPresentationPage,
    isPresenting,
    joinPresentation,
    leavePresentation,
  ]);

  if (pathname === "/presentation/create")
    return (
      <header className="flex h-12 max-w-[100vw]  items-center justify-between overflow-clip border-accent px-2 py-2">
        <div className="flex items-center gap-2">
          {/* This component is suppose to be logo but for now its is actually hamburger menu */}

          <Link href={"/presentation/create"}>
            <Button size={"icon"} className="rounded-full" variant={"ghost"}>
              <Brain></Brain>
            </Button>
          </Link>

          <motion.div
            initial={false}
            layout="position"
            transition={{ duration: 1 }}
          >
            <Link href="/" className="h-max">
              <DeckShalaText className="h-10 w-[7.5rem] cursor-pointer transition-transform duration-100 active:scale-95"></DeckShalaText>
            </Link>
          </motion.div>
        </div>

        <SideBarDropdown />
      </header>
    );

  return (
    <header className="flex h-12 w-full items-center justify-between border-b border-accent bg-background px-4">
      {/* Left section with breadcrumb navigation */}
      <div className="flex items-center gap-2">
        <Link
          href="/presentation"
          className="text-muted-foreground hover:text-foreground"
        >
          <Brain className="h-5 w-5"></Brain>
        </Link>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{presentationTitle}</span>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center gap-2">
        {/* Collaboration UI - Only in presentation page, not present mode */}
        {isPresentationPage && !isPresenting && (
          <>
            <ConnectionStatus />
            <CollaboratorAvatars />
          </>
        )}

        {/* Save status indicator */}
        <SaveStatus />

        {/* Theme selector moved to right editor panel */}

        {/* Export button - Only in presentation page, not outline or present mode */}
        {isPresentationPage && !isPresenting && (
          <ExportButton presentationId={currentPresentationId ?? ""} />
        )}

        {/* Share button - Only in presentation page, not outline */}
        {isPresentationPage && !isPresenting && <ShareButton />}

        {/* Present button - Only in presentation page, not outline */}
        {isPresentationPage && <PresentButton />}

        {/* User profile dropdown - Keep this on all pages */}
        {!isPresenting && <SideBarDropdown />}
      </div>
    </header>
  );
}
