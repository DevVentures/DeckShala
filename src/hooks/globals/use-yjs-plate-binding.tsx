"use client";

import { logger } from "@/lib/logger";
import { usePresentationState } from "@/states/presentation-state";
import { type Value } from "platejs";
import { useEffect, useRef } from "react";
import * as Y from "yjs";

/**
 * Custom hook to bind Yjs document to Plate.js editor state
 * Enables true collaborative editing with conflict-free replicated data types (CRDTs)
 */
export function useYjsPlateBinding(
  ydoc: Y.Doc | null,
  presentationId: string | null,
  slideIndex: number,
  enabled: boolean = true,
) {
  const slides = usePresentationState((s) => s.slides);
  const setSlides = usePresentationState((s) => s.setSlides);
  const isGenerating = usePresentationState((s) => s.isGeneratingPresentation);
  const isApplyingRemoteChanges = useRef(false);
  const lastLocalContent = useRef<Value | null>(null);

  useEffect(() => {
    if (!ydoc || !presentationId || !enabled || isGenerating) {
      return;
    }

    // Get or create shared type for this presentation's slides
    const ySlidesMap = ydoc.getMap<Y.Map<unknown>>(`slides`);
    const ySlideMap = ySlidesMap.get(`slide-${slideIndex}`) as
      | Y.Map<unknown>
      | undefined;

    let currentYSlideMap: Y.Map<unknown>;

    if (!ySlideMap) {
      // Initialize with current slide content
      currentYSlideMap = new Y.Map<unknown>();
      const currentSlide = slides[slideIndex];

      if (currentSlide) {
        currentYSlideMap.set("content", currentSlide.content);
        currentYSlideMap.set("id", currentSlide.id);
        currentYSlideMap.set("alignment", currentSlide.alignment);
        currentYSlideMap.set("layoutType", currentSlide.layoutType);
        currentYSlideMap.set("bgColor", currentSlide.bgColor);
        currentYSlideMap.set("width", currentSlide.width);
        currentYSlideMap.set("rootImage", currentSlide.rootImage);
      }

      ySlidesMap.set(`slide-${slideIndex}`, currentYSlideMap);
      logger.debug("Initialized Yjs map for slide", {
        slideIndex,
        presentationId,
      });
    } else {
      currentYSlideMap = ySlideMap;
    }

    // Observer for remote changes from other users
    const observeYjsChanges = () => {
      if (isApplyingRemoteChanges.current) return;

      const remoteContent = currentYSlideMap.get("content") as
        | Value
        | undefined;

      if (!remoteContent) return;

      // Check if content actually changed
      const currentContent = slides[slideIndex]?.content;
      if (JSON.stringify(currentContent) === JSON.stringify(remoteContent)) {
        return;
      }

      logger.debug("Applying remote changes to slide", {
        slideIndex,
        presentationId,
        hasChanges: true,
      });

      isApplyingRemoteChanges.current = true;

      try {
        const updatedSlides = [...slides];
        if (updatedSlides[slideIndex]) {
          updatedSlides[slideIndex] = {
            ...updatedSlides[slideIndex],
            content: remoteContent,
            alignment: currentYSlideMap.get("alignment") as
              | "start"
              | "center"
              | "end"
              | undefined,
            layoutType: currentYSlideMap.get("layoutType") as
              | "left"
              | "right"
              | "vertical"
              | "background"
              | undefined,
            bgColor: currentYSlideMap.get("bgColor") as string | undefined,
            width: currentYSlideMap.get("width") as "S" | "M" | "L" | undefined,
            rootImage: currentYSlideMap.get("rootImage") as any,
          };
          setSlides(updatedSlides);
        }
      } finally {
        // Reset flag after a short delay to ensure state has updated
        setTimeout(() => {
          isApplyingRemoteChanges.current = false;
        }, 100);
      }
    };

    currentYSlideMap.observe(observeYjsChanges);

    // Sync local changes to Yjs (triggered by slide changes)
    const syncLocalChanges = () => {
      if (isApplyingRemoteChanges.current) return;

      const currentSlide = slides[slideIndex];
      if (!currentSlide) return;

      const currentContent = currentSlide.content;
      const yjsContent = currentYSlideMap.get("content");

      // Only update if content has changed
      if (JSON.stringify(currentContent) !== JSON.stringify(yjsContent)) {
        logger.debug("Syncing local changes to Yjs", {
          slideIndex,
          presentationId,
        });

        ydoc.transact(() => {
          currentYSlideMap.set("content", currentContent);
          currentYSlideMap.set("alignment", currentSlide.alignment);
          currentYSlideMap.set("layoutType", currentSlide.layoutType);
          currentYSlideMap.set("bgColor", currentSlide.bgColor);
          currentYSlideMap.set("width", currentSlide.width);
          currentYSlideMap.set("rootImage", currentSlide.rootImage);
        });
      }
    };

    // Initial sync
    syncLocalChanges();

    return () => {
      currentYSlideMap.unobserve(observeYjsChanges);
    };
  }, [
    ydoc,
    presentationId,
    slideIndex,
    slides,
    setSlides,
    enabled,
    isGenerating,
  ]);

  // Monitor local slide changes and sync to Yjs
  useEffect(() => {
    if (
      !ydoc ||
      !presentationId ||
      !enabled ||
      isGenerating ||
      isApplyingRemoteChanges.current
    ) {
      return;
    }

    const currentSlide = slides[slideIndex];
    if (!currentSlide) return;

    const currentContent = currentSlide.content;
    const currentContentStr = JSON.stringify(currentContent);

    // Check if content actually changed
    if (
      lastLocalContent.current &&
      currentContentStr === JSON.stringify(lastLocalContent.current)
    ) {
      return;
    }

    lastLocalContent.current = currentContent;

    // Sync to Yjs
    const ySlidesMap = ydoc.getMap<Y.Map<unknown>>(`slides`);
    const ySlideMap = ySlidesMap.get(`slide-${slideIndex}`) as
      | Y.Map<unknown>
      | undefined;

    if (ySlideMap) {
      ydoc.transact(() => {
        ySlideMap.set("content", currentSlide.content);
        ySlideMap.set("alignment", currentSlide.alignment);
        ySlideMap.set("layoutType", currentSlide.layoutType);
        ySlideMap.set("bgColor", currentSlide.bgColor);
        ySlideMap.set("width", currentSlide.width);
        ySlideMap.set("rootImage", currentSlide.rootImage);
      });

      logger.debug("Local change synced to Yjs", {
        slideIndex,
        presentationId,
      });
    }
  }, [slides, slideIndex, ydoc, presentationId, enabled, isGenerating]);
}
