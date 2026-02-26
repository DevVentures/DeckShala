"use client";

import { logger } from "@/lib/logger";
import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import * as Y from "yjs";

interface Cursor {
  x: number;
  y: number;
  slideId?: string;
}

interface CollaboratorPresence {
  userId: string;
  userName: string;
  userImage?: string;
  color: string;
  cursor?: Cursor;
  isActive: boolean;
}

interface CollaborationContextType {
  socket: Socket | null;
  isConnected: boolean;
  ydoc: Y.Doc | null;
  collaborators: Map<string, CollaboratorPresence>;
  activeUsers: number;
  joinPresentation: (presentationId: string) => Promise<void>;
  leavePresentation: () => void;
  updateCursor: (cursor: Cursor) => void;
  isJoined: boolean;
}

const CollaborationContext = createContext<
  CollaborationContextType | undefined
>(undefined);

// Generate a random color for user cursor
function generateUserColor(): string {
  const colors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Cyan
    "#45B7D1", // Blue
    "#FFA07A", // Light Salmon
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Sky Blue
    "#F8B739", // Orange
    "#52B788", // Green
  ];
  return colors[Math.floor(Math.random() * colors.length)] ?? "#FF6B6B";
}

interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({
  children,
}: CollaborationProviderProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [collaborators, setCollaborators] = useState<
    Map<string, CollaboratorPresence>
  >(new Map());
  const [activeUsers, setActiveUsers] = useState(0);
  const [currentPresentationId, setCurrentPresentationId] = useState<
    string | null
  >(null);
  const [userColor] = useState(() => generateUserColor());
  const [isJoined, setIsJoined] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user) return;

    const socketInstance = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      logger.info("WebSocket connected", { socketId: socketInstance.id });
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      logger.info("WebSocket disconnected");
      setIsConnected(false);
      setIsJoined(false);
    });

    socketInstance.on("error", (error: { message: string }) => {
      logger.error("WebSocket error", new Error(error.message));
    });

    setSocket(socketInstance);

    return () => {
      if (currentPresentationId) {
        socketInstance.emit("leave-presentation", {
          presentationId: currentPresentationId,
          userId: session.user.id,
        });
      }
      socketInstance.close();
    };
  }, [session?.user]);

  // Set up event listeners for collaboration events
  useEffect(() => {
    if (!socket || !ydoc) return;

    // Presence state
    socket.on("presence-state", (users: CollaboratorPresence[]) => {
      const newCollaborators = new Map<string, CollaboratorPresence>();
      users.forEach((user) => {
        newCollaborators.set(user.userId, user);
      });
      setCollaborators(newCollaborators);
      setActiveUsers(users.length);
    });

    // User joined
    socket.on("user-joined", (user: CollaboratorPresence) => {
      setCollaborators((prev) => {
        const updated = new Map(prev);
        updated.set(user.userId, user);
        return updated;
      });
      setActiveUsers((prev) => prev + 1);
    });

    // User left
    socket.on("user-left", (userId: string) => {
      setCollaborators((prev) => {
        const updated = new Map(prev);
        updated.delete(userId);
        return updated;
      });
      setActiveUsers((prev) => Math.max(0, prev - 1));
    });

    // Cursor updates
    socket.on(
      "cursor-update",
      ({ userId, cursor }: { userId: string; cursor: Cursor }) => {
        setCollaborators((prev) => {
          const updated = new Map(prev);
          const user = updated.get(userId);
          if (user) {
            updated.set(userId, { ...user, cursor });
          }
          return updated;
        });
      },
    );

    // Yjs sync state (when joining)
    socket.on("sync-state", (state: Uint8Array) => {
      if (ydoc && state) {
        Y.applyUpdate(ydoc, new Uint8Array(state));
        logger.info("Applied initial Yjs state from server");
      }
    });

    // Yjs updates from other users
    socket.on("yjs-update", (update: Uint8Array) => {
      if (ydoc && update) {
        Y.applyUpdate(ydoc, new Uint8Array(update));
        logger.debug("Applied Yjs update from remote user");
      }
    });

    // Send local Yjs updates to server
    const handleYjsUpdate = (update: Uint8Array, origin: unknown) => {
      // Don't broadcast updates that came from the network
      if (origin !== socket && currentPresentationId) {
        socket.emit("yjs-update", {
          presentationId: currentPresentationId,
          update: Array.from(update),
        });
        logger.debug("Sent local Yjs update to server");
      }
    };

    ydoc.on("update", handleYjsUpdate);

    return () => {
      socket.off("presence-state");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("cursor-update");
      socket.off("sync-state");
      socket.off("yjs-update");
      ydoc.off("update", handleYjsUpdate);
    };
  }, [socket, ydoc, currentPresentationId]);

  const joinPresentation = useCallback(
    async (presentationId: string) => {
      if (!socket || !session?.user || !isConnected) {
        logger.warn("Cannot join presentation: not ready", {
          hasSocket: !!socket,
          hasUser: !!session?.user,
          isConnected,
        });
        return;
      }

      // Create new Yjs document
      const doc = new Y.Doc();
      setYdoc(doc);
      setCurrentPresentationId(presentationId);

      // Join the presentation room
      socket.emit("join-presentation", {
        presentationId,
        userId: session.user.id,
        userName: session.user.name || "Anonymous",
        userEmail: session.user.email,
        userImage: session.user.image,
        color: userColor,
      });

      logger.info("Joining presentation", {
        presentationId,
        userId: session.user.id,
      });
    },
    [socket, session?.user, isConnected, userColor],
  );

  const leavePresentation = useCallback(() => {
    if (!socket || !session?.user || !currentPresentationId) return;

    socket.emit("leave-presentation", {
      presentationId: currentPresentationId,
      userId: session.user.id,
    });

    setCurrentPresentationId(null);
    setYdoc(null);
    setCollaborators(new Map());
    setActiveUsers(0);
    setIsJoined(false);

    logger.info("Left presentation", { presentationId: currentPresentationId });
  }, [socket, session?.user, currentPresentationId]);

  const updateCursor = useCallback(
    (cursor: Cursor) => {
      if (!socket || !session?.user || !currentPresentationId) return;

      socket.emit("cursor-move", {
        presentationId: currentPresentationId,
        userId: session.user.id,
        cursor,
      });
    },
    [socket, session?.user, currentPresentationId],
  );

  const value: CollaborationContextType = {
    socket,
    isConnected,
    ydoc,
    collaborators,
    activeUsers,
    joinPresentation,
    leavePresentation,
    updateCursor,
    isJoined,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (context === undefined) {
    throw new Error(
      "useCollaboration must be used within a CollaborationProvider",
    );
  }
  return context;
}

// Hook to automatically join and leave presentations
export function useCollaborativePresentation(presentationId: string | null) {
  const { joinPresentation, leavePresentation, isJoined, activeUsers } =
    useCollaboration();

  useEffect(() => {
    if (presentationId && !isJoined) {
      joinPresentation(presentationId);
    }

    return () => {
      if (isJoined) {
        leavePresentation();
      }
    };
  }, [presentationId, isJoined]);

  return { isJoined, activeUsers };
}
