import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

interface CollaborationData {
  presentationId: string;
  userId: string;
  userName: string;
  userImage?: string;
  color: string;
}

interface CursorPosition {
  x: number;
  y: number;
  slideId?: string;
}

interface PresenceUpdate {
  userId: string;
  userName: string;
  userImage?: string;
  color: string;
  cursor?: CursorPosition;
  isActive: boolean;
}

// Store Yjs documents and presence for each presentation
const documentsStore = new Map<string, Y.Doc>();
const presenceStore = new Map<string, Map<string, PresenceUpdate>>();

// Get or create Yjs document for a presentation
function getOrCreateDoc(presentationId: string): Y.Doc {
  let doc = documentsStore.get(presentationId);

  if (!doc) {
    doc = new Y.Doc();
    documentsStore.set(presentationId, doc);

    // Load persisted state from database
    loadDocumentState(presentationId, doc);

    // Set up persistence on updates
    doc.on("update", (update: Uint8Array) => {
      persistDocumentState(presentationId, doc!, update);
    });

    logger.info("Created new Yjs document", { presentationId });
  }

  return doc;
}

// Load document state from database
async function loadDocumentState(presentationId: string, doc: Y.Doc) {
  try {
    const presentation = await db.presentation.findUnique({
      where: { id: presentationId },
      select: { yjsState: true },
    });

    if (presentation?.yjsState) {
      Y.applyUpdate(doc, presentation.yjsState);
      logger.info("Loaded Yjs state from database", { presentationId });
    }
  } catch (error) {
    logger.error("Failed to load Yjs state", error as Error, { presentationId });
  }
}

// Persist document state to database (debounced)
const persistQueue = new Map<string, NodeJS.Timeout>();

async function persistDocumentState(presentationId: string, doc: Y.Doc, update: Uint8Array) {
  // Clear existing timeout
  const existingTimeout = persistQueue.get(presentationId);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Debounce: persist after 2 seconds of no changes
  const timeout = setTimeout(async () => {
    try {
      const state = Y.encodeStateAsUpdate(doc);

      await db.presentation.update({
        where: { id: presentationId },
        data: {
          yjsState: Buffer.from(state),
          base: {
            update: {
              updatedAt: new Date(),
            },
          },
        },
      });

      logger.debug("Persisted Yjs state to database", {
        presentationId,
        stateSize: state.length
      });
    } catch (error) {
      logger.error("Failed to persist Yjs state", error as Error, { presentationId });
    } finally {
      persistQueue.delete(presentationId);
    }
  }, 2000);

  persistQueue.set(presentationId, timeout);
}

export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    maxHttpBufferSize: 1e8, // 100 MB for large documents
  });

  io.on("connection", async (socket: Socket) => {
    logger.info("Client connected", { socketId: socket.id });

    // Handle joining a presentation
    socket.on(
      "join-presentation",
      async (data: CollaborationData, callback: (success: boolean) => void) => {
        try {
          const { presentationId, userId, userName, userImage, color } = data;

          logger.info("User joining presentation", {
            presentationId,
            userId,
            socketId: socket.id,
          });

          // Join the presentation room
          await socket.join(`presentation:${presentationId}`);

          // Get or create Yjs document
          const doc = getOrCreateDoc(presentationId);

          // Send current document state to the new client
          const state = Y.encodeStateAsUpdate(doc);
          socket.emit("sync-state", state);

          // Initialize presence store for this presentation if needed
          if (!presenceStore.has(presentationId)) {
            presenceStore.set(presentationId, new Map());
          }

          const presentationPresence = presenceStore.get(presentationId)!;

          // Add user to presence
          const userPresence: PresenceUpdate = {
            userId,
            userName,
            userImage,
            color,
            isActive: true,
          };

          presentationPresence.set(userId, userPresence);

          // Create/update collaboration session in database
          await db.collaborationSession.upsert({
            where: {
              presentationId_userId: {
                presentationId,
                userId,
              },
            },
            create: {
              presentationId,
              userId,
              userName,
              userImage,
              color,
              lastSeenAt: new Date(),
            },
            update: {
              color,
              lastSeenAt: new Date(),
            },
          });

          // Update room statistics
          await db.collaborationRoom.upsert({
            where: { presentationId },
            create: {
              presentationId,
              activeUsers: presentationPresence.size,
              lastActivity: new Date(),
            },
            update: {
              activeUsers: presentationPresence.size,
              lastActivity: new Date(),
            },
          });

          // Send current presence state to the new user
          const presenceArray = Array.from(presentationPresence.values());
          socket.emit("presence-state", presenceArray);

          // Notify others about new user
          socket.to(`presentation:${presentationId}`).emit("user-joined", userPresence);

          logger.info("User joined successfully", {
            presentationId,
            userId,
            totalUsers: presentationPresence.size,
          });

          callback(true);
        } catch (error) {
          logger.error("Failed to join presentation", error as Error);
          callback(false);
        }
      }
    );

    // Handle Yjs document updates
    socket.on("yjs-update", async (data: { presentationId: string; update: Uint8Array }) => {
      try {
        const { presentationId, update } = data;

        const doc = getOrCreateDoc(presentationId);

        // Apply update to document
        Y.applyUpdate(doc, new Uint8Array(update));

        // Broadcast to other users in the room (excluding sender)
        socket.to(`presentation:${presentationId}`).emit("yjs-update", update);

        logger.debug("Applied and broadcasted Yjs update", {
          presentationId,
          updateSize: update.length
        });
      } catch (error) {
        logger.error("Failed to handle Yjs update", error as Error);
      }
    });

    // Handle leaving a presentation
    socket.on("leave-presentation", async (presentationId: string) => {
      try {
        logger.info("User leaving presentation", {
          presentationId,
          socketId: socket.id,
        });

        await socket.leave(`presentation:${presentationId}`);

        // Remove from presence
        const presentationPresence = presenceStore.get(presentationId);
        if (presentationPresence) {
          for (const [userId, presence] of presentationPresence) {
            if (presence.isActive) {
              presentationPresence.delete(userId);

              socket.to(`presentation:${presentationId}`).emit("user-left", userId);

              await db.collaborationSession.delete({
                where: {
                  presentationId_userId: {
                    presentationId,
                    userId,
                  },
                },
              }).catch(() => { });

              break;
            }
          }

          // Update room statistics
          await db.collaborationRoom.update({
            where: { presentationId },
            data: {
              activeUsers: presentationPresence.size,
              lastActivity: new Date(),
            },
          }).catch(() => { });
        }
      } catch (error) {
        logger.error("Failed to leave presentation", error as Error);
      }
    });

    // Handle cursor updates
    socket.on(
      "cursor-move",
      async (data: { presentationId: string; userId: string; cursor: CursorPosition }) => {
        try {
          const { presentationId, userId, cursor } = data;

          const presentationPresence = presenceStore.get(presentationId);
          if (presentationPresence) {
            const userPresence = presentationPresence.get(userId);
            if (userPresence) {
              userPresence.cursor = cursor;
              presentationPresence.set(userId, userPresence);
            }
          }

          socket.to(`presentation:${presentationId}`).emit("cursor-update", {
            userId,
            cursor,
          });

          db.collaborationSession.update({
            where: {
              presentationId_userId: {
                presentationId,
                userId,
              },
            },
            data: {
              cursorPosition: cursor as unknown as any,
              lastSeenAt: new Date(),
            },
          }).catch((error) => {
            logger.warn("Failed to update cursor in database", { error });
          });
        } catch (error) {
          logger.error("Failed to handle cursor move", error as Error);
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", async () => {
      logger.info("Client disconnected", { socketId: socket.id });

      for (const [presentationId, presentationPresence] of presenceStore) {
        for (const [userId] of presentationPresence) {
          presentationPresence.delete(userId);

          io.to(`presentation:${presentationId}`).emit("user-left", userId);

          await db.collaborationSession.delete({
            where: {
              presentationId_userId: {
                presentationId,
                userId,
              },
            },
          }).catch(() => { });
        }

        await db.collaborationRoom.update({
          where: { presentationId },
          data: {
            activeUsers: presentationPresence.size,
            lastActivity: new Date(),
          },
        }).catch(() => { });
      }
    });
  });

  // Cleanup inactive sessions every 5 minutes
  setInterval(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
      await db.collaborationSession.deleteMany({
        where: {
          lastSeenAt: {
            lt: fiveMinutesAgo,
          },
        },
      });
      logger.debug("Cleaned up inactive collaboration sessions");
    } catch (error) {
      logger.error("Failed to cleanup sessions", error as Error);
    }
  }, 5 * 60 * 1000);

  // Cleanup old documents from memory every 30 minutes
  setInterval(() => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    for (const [presentationId, presence] of presenceStore) {
      if (presence.size === 0) {
        const doc = documentsStore.get(presentationId);
        if (doc) {
          // Persist final state before removing
          persistDocumentState(presentationId, doc, Y.encodeStateAsUpdate(doc));
          documentsStore.delete(presentationId);
          presenceStore.delete(presentationId);
          logger.info("Cleaned up inactive document", { presentationId });
        }
      }
    }
  }, 30 * 60 * 1000);

  logger.info("WebSocket server with Yjs initialized");
  return io;
}

export function cleanupWebSocketServer(io: SocketIOServer): void {
  logger.info("Cleaning up WebSocket server");

  // Persist all documents before cleanup
  for (const [presentationId, doc] of documentsStore) {
    persistDocumentState(presentationId, doc, Y.encodeStateAsUpdate(doc));
  }

  documentsStore.clear();
  presenceStore.clear();

  io.close(() => {
    logger.info("WebSocket server closed");
  });
}
