import { type Server as HTTPServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import * as Y from "yjs";
import { YSocketIO, type Persistence } from "y-socket.io/dist/server";
import { db } from "@/server/db";
import { logger } from "@/lib/logger";

interface CollaborationData {
  presentationId: string;
  userId: string;
  userName: string;
  userEmail?: string;
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

// Store for Yjs documents in memory
const documents = new Map<string, Y.Doc>();

// Custom persistence layer for Yjs
const yjsPersistence = {
  bindState: async (docName: string, ydoc: Y.Doc) => {
    try {
      const presentationId = docName.replace("presentation:", "");

      // Load existing state from database
      const presentation = await db.presentation.findUnique({
        where: { id: presentationId },
        select: { yjsState: true },
      });

      if (presentation?.yjsState) {
        Y.applyUpdate(ydoc, presentation.yjsState);
        logger.debug("Loaded Yjs state from database", { presentationId });
      }

      // Store document in memory
      documents.set(docName, ydoc);
    } catch (error) {
      logger.error("Failed to load Yjs state", error as Error, { docName });
    }
  },

  writeState: async (docName: string, ydoc: Y.Doc): Promise<void> => {
    try {
      const presentationId = docName.replace("presentation:", "");
      const state = Y.encodeStateAsUpdate(ydoc);

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

      logger.debug("Saved Yjs state to database", { presentationId });
    } catch (error) {
      logger.error("Failed to save Yjs state", error as Error, { docName });
    }
  },
};

// Persistence layer is passed to YSocketIO when initialized (see yjsPersistence above)

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

    // Handle joining a collaboration room
    socket.on("join-presentation", async (data: CollaborationData) => {
      const { presentationId, userId, userName, userEmail, userImage, color } = data;
      const roomName = `presentation:${presentationId}`;

      try {
        // Verify user has access to presentation
        const presentation = await db.presentation.findFirst({
          where: { id: presentationId },
          include: {
            base: true,
          },
        });

        if (!presentation) {
          socket.emit("error", { message: "Presentation not found" });
          return;
        }

        // Check if user owns the presentation or if it's public
        if (presentation.base.userId !== userId && !presentation.base.isPublic) {
          socket.emit("error", { message: "Unauthorized access" });
          return;
        }

        // Join the Socket.IO room
        await socket.join(roomName);

        // Create or update collaboration session
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
            userEmail,
            userImage,
            color,
            isActive: true,
            lastSeenAt: new Date(),
          },
          update: {
            isActive: true,
            lastSeenAt: new Date(),
            userName,
            userImage,
          },
        });

        // Update room stats
        await db.collaborationRoom.upsert({
          where: { presentationId },
          create: {
            presentationId,
            activeUsers: 1,
            lastActivity: new Date(),
          },
          update: {
            activeUsers: { increment: 1 },
            lastActivity: new Date(),
          },
        });

        // Get all active users in the room
        const activeUsers = await db.collaborationSession.findMany({
          where: {
            presentationId,
            isActive: true,
          },
          select: {
            userId: true,
            userName: true,
            userImage: true,
            color: true,
            cursorPosition: true,
          },
        });

        // Send current active users to the new user
        socket.emit("presence-state", activeUsers);

        // Notify others that a new user joined
        socket.to(roomName).emit("user-joined", {
          userId,
          userName,
          userImage,
          color,
        });

        // Yjs collaboration is handled via y-socket.io / YSocketIO (initialized separately)

        logger.info("User joined collaboration room", {
          presentationId,
          userId,
          userName,
          socketId: socket.id,
        });

        socket.emit("joined-presentation", { presentationId, activeUsers: activeUsers.length });
      } catch (error) {
        logger.error("Failed to join presentation", error as Error, {
          presentationId,
          userId,
        });
        socket.emit("error", { message: "Failed to join collaboration room" });
      }
    });

    // Handle cursor movements
    socket.on("cursor-move", async (data: { presentationId: string; userId: string; cursor: CursorPosition }) => {
      const { presentationId, userId, cursor } = data;
      const roomName = `presentation:${presentationId}`;

      try {
        // Update cursor position in database
        await db.collaborationSession.update({
          where: {
            presentationId_userId: {
              presentationId,
              userId,
            },
          },
          data: {
            cursorPosition: cursor as any,
            lastSeenAt: new Date(),
          },
        });

        // Broadcast cursor position to other users in the room
        socket.to(roomName).emit("cursor-update", {
          userId,
          cursor,
        });
      } catch (error) {
        logger.error("Failed to update cursor position", error as Error, {
          presentationId,
          userId,
        });
      }
    });

    // Handle leaving a presentation
    socket.on("leave-presentation", async (data: { presentationId: string; userId: string }) => {
      const { presentationId, userId } = data;
      await handleUserLeave(presentationId, userId, socket);
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      logger.info("Client disconnected", { socketId: socket.id });

      // Find all rooms this socket was in and mark user as inactive
      const rooms = Array.from(socket.rooms).filter((room) => room.startsWith("presentation:"));

      for (const roomName of rooms) {
        const presentationId = roomName.replace("presentation:", "");

        // Find the collaboration session for this socket
        const session = await db.collaborationSession.findFirst({
          where: {
            presentationId,
            isActive: true,
          },
        });

        if (session) {
          await handleUserLeave(presentationId, session.userId, socket);
        }
      }
    });
  });

  // Clean up inactive sessions periodically (every 5 minutes)
  setInterval(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      // Mark sessions as inactive if they haven't been seen in 5 minutes
      const inactiveSessions = await db.collaborationSession.updateMany({
        where: {
          lastSeenAt: { lt: fiveMinutesAgo },
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      if (inactiveSessions.count > 0) {
        logger.info("Cleaned up inactive collaboration sessions", {
          count: inactiveSessions.count,
        });

        // Update room stats
        const rooms = await db.collaborationRoom.findMany({
          select: { id: true, presentationId: true },
        });

        for (const room of rooms) {
          const activeCount = await db.collaborationSession.count({
            where: {
              presentationId: room.presentationId,
              isActive: true,
            },
          });

          await db.collaborationRoom.update({
            where: { id: room.id },
            data: { activeUsers: activeCount },
          });
        }
      }
    } catch (error) {
      logger.error("Failed to clean up inactive sessions", error as Error);
    }
  }, 5 * 60 * 1000); // 5 minutes

  logger.info("WebSocket server initialized");
  return io;
}

async function handleUserLeave(
  presentationId: string,
  userId: string,
  socket: Socket,
): Promise<void> {
  const roomName = `presentation:${presentationId}`;

  try {
    // Mark user as inactive
    await db.collaborationSession.update({
      where: {
        presentationId_userId: {
          presentationId,
          userId,
        },
      },
      data: {
        isActive: false,
        lastSeenAt: new Date(),
      },
    });

    // Update room stats
    await db.collaborationRoom.update({
      where: { presentationId },
      data: {
        activeUsers: { decrement: 1 },
        lastActivity: new Date(),
      },
    });

    // Leave the Socket.IO room
    await socket.leave(roomName);

    // Notify others that user left
    socket.to(roomName).emit("user-left", { userId });

    logger.info("User left collaboration room", {
      presentationId,
      userId,
      socketId: socket.id,
    });
  } catch (error) {
    logger.error("Failed to handle user leave", error as Error, {
      presentationId,
      userId,
    });
  }
}

// Export cleanup function for graceful shutdown
export async function cleanupWebSocketServer(io: SocketIOServer): Promise<void> {
  logger.info("Cleaning up WebSocket server");

  // Mark all sessions as inactive
  await db.collaborationSession.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Reset all room active user counts
  await db.collaborationRoom.updateMany({
    data: { activeUsers: 0 },
  });

  // Close all connections
  io.close();

  logger.info("WebSocket server cleaned up");
}
