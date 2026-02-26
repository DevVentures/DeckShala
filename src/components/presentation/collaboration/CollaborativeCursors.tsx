"use client";

import { useCollaboration } from "@/hooks/globals/use-collaboration";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface CursorPosition {
  x: number;
  y: number;
  slideId?: string;
}

interface RemoteCursorProps {
  userId: string;
  userName: string;
  color: string;
  position: CursorPosition;
}

function RemoteCursor({
  userId,
  userName,
  color,
  position,
}: RemoteCursorProps) {
  return (
    <motion.div
      key={userId}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1, x: position.x, y: position.y }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="pointer-events-none absolute left-0 top-0 z-50"
      style={{ willChange: "transform" }}
    >
      {/* Cursor SVG */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5.65376 12.3673L5.46026 12.4673L5.65376 12.3673L8.18965 4.03183L15.7644 11.6065L11.7286 13.5106L11.5667 13.5834L11.5832 13.7562L12.0946 19.0825L9.58786 16.5758L9.43643 16.4243L9.21722 16.4985L5.65376 12.3673ZM10.8325 14.6573L16.6968 12.1768L7.50815 2.98801L10.8325 14.6573Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* User name label */}
      <div
        className="mt-1 ml-4 whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium text-white shadow-lg"
        style={{ backgroundColor: color }}
      >
        {userName}
      </div>
    </motion.div>
  );
}

export function CollaborativeCursors() {
  const { collaborators, updateCursor } = useCollaboration();
  const containerRef = useRef<HTMLDivElement>(null);
  const [localCursor, setLocalCursor] = useState<CursorPosition | null>(null);

  // Track local cursor movement
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let lastUpdate = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      setLocalCursor({ x, y });

      // Throttle cursor updates to server (every 50ms)
      if (!lastUpdate || Date.now() - lastUpdate > 50) {
        updateCursor({ x, y });
        lastUpdate = Date.now();
      }
    };

    container.addEventListener("mousemove", handleMouseMove);
    return () => container.removeEventListener("mousemove", handleMouseMove);
  }, [updateCursor]);

  const activeCursors = Array.from(collaborators.values()).filter(
    (collab) => collab.isActive && collab.cursor,
  );

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
    >
      <AnimatePresence>
        {activeCursors.map((collaborator) =>
          collaborator.cursor ? (
            <RemoteCursor
              key={collaborator.userId}
              userId={collaborator.userId}
              userName={collaborator.userName}
              color={collaborator.color}
              position={collaborator.cursor}
            />
          ) : null,
        )}
      </AnimatePresence>
    </div>
  );
}
