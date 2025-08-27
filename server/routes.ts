import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertListingSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize categories if they don't exist
  app.get('/api/init', async (req, res) => {
    try {
      const existingCategories = await storage.getCategories();
      if (existingCategories.length === 0) {
        // Create default categories
        await storage.createCategory({
          name: "Voiture",
          slug: "voiture",
          icon: "car",
          color: "blue"
        });
        await storage.createCategory({
          name: "Immobilier", 
          slug: "immobilier",
          icon: "home",
          color: "green"
        });
        await storage.createCategory({
          name: "Emploi",
          slug: "emploi", 
          icon: "briefcase",
          color: "purple"
        });
        await storage.createCategory({
          name: "Autre",
          slug: "autre",
          icon: "package",
          color: "orange"
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error initializing categories:", error);
      res.status(500).json({ message: "Failed to initialize categories" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Category routes
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Listing routes
  app.get('/api/listings', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const categoryId = req.query.categoryId as string;

      let listings;
      if (categoryId) {
        listings = await storage.getListingsByCategory(categoryId, limit);
      } else {
        listings = await storage.getListings(limit, offset);
      }

      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get('/api/listings/:id', async (req, res) => {
    try {
      const listing = await storage.getListingById(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      // Increment views
      await storage.incrementListingViews(req.params.id);
      
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post('/api/listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listingData = insertListingSchema.parse({
        ...req.body,
        userId
      });

      const listing = await storage.createListing(listingData);
      res.status(201).json(listing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      console.error("Error creating listing:", error);
      res.status(500).json({ message: "Failed to create listing" });
    }
  });

  app.put('/api/listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listing = await storage.getListingById(req.params.id);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      
      if (listing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this listing" });
      }

      const updatedListing = await storage.updateListing(req.params.id, req.body);
      res.json(updatedListing);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  app.get('/api/user/listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const listings = await storage.getListingsByUser(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch user listings" });
    }
  });

  // Message routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getMessagesByConversation(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { receiverId, listingId, content } = req.body;

      // Check if conversation exists
      let conversation = await storage.getConversation(userId, receiverId, listingId);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          user1Id: userId,
          user2Id: receiverId,
          listingId
        });
      }

      const message = await storage.createMessage({
        senderId: userId,
        receiverId,
        listingId,
        content
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/listing-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting listing image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Messages API
  app.get("/api/messages/:sellerId/:listingId?", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { sellerId, listingId } = req.params;

    try {
      const conversation = await storage.getConversation(userId, sellerId, listingId);
      if (!conversation) {
        return res.json([]);
      }
      const messages = await storage.getMessagesByConversation(conversation.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get conversations for current user
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    try {
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // User profile routes
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { displayName, bio } = req.body;

    try {
      const updatedUser = await storage.upsertUser({
        id: userId,
        displayName,
        bio,
        updatedAt: new Date(),
      });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Get user's listings
  app.get("/api/listings/user/:userId", isAuthenticated, async (req: any, res) => {
    const currentUserId = req.user?.claims?.sub;
    const { userId } = req.params;

    // Users can only see their own listings (for privacy)
    if (currentUserId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const listings = await storage.getListingsByUser(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Toggle like/unlike a listing
  app.post("/api/listings/:id/like", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { id: listingId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const result = await storage.toggleUserLike(userId, listingId);
      res.json(result);
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  // Check if user liked a listing
  app.get("/api/listings/:id/like", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { id: listingId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const liked = await storage.isUserLikedListing(userId, listingId);
      res.json({ liked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Get user's liked listings
  app.get("/api/likes/user/:userId", isAuthenticated, async (req: any, res) => {
    const currentUserId = req.user?.claims?.sub;
    const { userId } = req.params;

    // Users can only see their own liked listings
    if (currentUserId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    try {
      const likedListings = await storage.getUserLikedListings(userId);
      res.json(likedListings);
    } catch (error) {
      console.error("Error fetching liked listings:", error);
      res.status(500).json({ error: "Failed to fetch liked listings" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active connections by user ID
  const userConnections = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    let userId: string | null = null;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'auth') {
          userId = data.userId;
          if (userId) {
            userConnections.set(userId, ws);
            ws.send(JSON.stringify({ type: 'auth_success', userId }));
          }
        } else if (data.type === 'send_message' && userId) {
          // Create message in database
          const messageData = {
            senderId: userId,
            receiverId: data.receiverId,
            listingId: data.listingId || null,
            content: data.content,
          };

          const message = await storage.createMessage(messageData);
          
          // Send to recipient if connected
          const recipientWs = userConnections.get(data.receiverId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            recipientWs.send(JSON.stringify({
              type: 'new_message',
              message: message
            }));
          }

          // Send confirmation to sender
          ws.send(JSON.stringify({
            type: 'message_sent',
            message: message
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (userId) {
        userConnections.delete(userId);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (userId) {
        userConnections.delete(userId);
      }
    });
  });

  return httpServer;
}
