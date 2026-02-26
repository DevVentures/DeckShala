import { type Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { logger } from "@/lib/logger";
import { db } from "@/server/db";

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

// Store active presence for each presentation
const presenceStore = new Map<string, Map<string, PresenceUpdate>>();

export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
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
          // Find user by socket ID
          for (const [userId, presence] of presentationPresence) {
            if (presence.isActive) {
              presentationPresence.delete(userId);

              // Notify others
              socket.to(`presentation:${presentationId}`).emit("user-left", userId);

              // Update database
              await db.collaborationSession.delete({
                where: {
                  presentationId_userId: {
                    presentationId,
                    userId,
                  },
                },
              }).catch(() => {
                // Ignore errors if already deleted
              });

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
          }).catch(() => {
            // Ignore errors if room doesn't exist
          });
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

          // Update presence in memory
          const presentationPresence = presenceStore.get(presentationId);
          if (presentationPresence) {
            const userPresence = presentationPresence.get(userId);
            if (userPresence) {
              userPresence.cursor = cursor;
              presentationPresence.set(userId, userPresence);
            }
          }

          // Broadcast to others in the room
          socket.to(`presentation:${presentationId}`).emit("cursor-update", {
            userId,
            cursor,
          });

          // Update database (throttled/async)
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

      // Clean up presence for all presentations this socket was in
      for (const [presentationId, presentationPresence] of presenceStore) {
        for (const [userId, presence] of presentationPresence) {
          if (presence.isActive) {
            presentationPresence.delete(userId);

            // Notify others
            io.to(`presentation:${presentationId}`).emit("user-left", userId);

            // Update database
            await db.collaborationSession.delete({
              where: {
                presentationId_userId: {
                  presentationId,
                  userId,
                },
              },
            }).catch(() => {
              // Ignore errors
            });
          }
        }

        // Update room statistics
        await db.collaborationRoom.update({
          where: { presentationId },
          data: {
            activeUsers: presentationPresence.size,
            lastActivity: new Date(),
          },
        }).catch(() => {
          // Ignore errors
        });
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

  logger.info("WebSocket server initialized");
  return io;
}

export function cleanupWebSocketServer(io: SocketIOServer): void {
  logger.info("Cleaning up WebSocket server");
  presenceStore.clear();
  io.close(() => {
    logger.info("WebSocket server closed");
  });
}
