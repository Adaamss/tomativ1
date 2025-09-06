import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authenticateToken, generateToken, hashPassword, comparePassword } from "./simpleAuth";
import type { Request } from "express";
import type { User } from "@shared/schema";

export interface AuthenticatedRequest extends Request {
  user?: User;
}
import { insertListingSchema, insertUserSchema, insertSupportTicketSchema, insertSupportMessageSchema, insertReviewSchema, insertAdRequestSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import cookieParser from "cookie-parser";

// Middleware pour vérifier le rôle admin
const requireAdmin = async (req: AuthenticatedRequest, res: any, next: any) => {
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify admin status" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

  // Object Storage routes - Serve uploaded images
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Object upload endpoint
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Remove conflicting /api/login route that might interfere
  // Simple auth routes  
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Un compte existe déjà avec cette adresse email" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Generate token
      const token = generateToken(user.id);

      // Set cookie and return user
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erreur du serveur" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      // Generate token
      const token = generateToken(user.id);

      // Set cookie and return user
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erreur du serveur" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Déconnexion réussie" });
  });

  app.get('/api/auth/user', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur" });
    }
  });

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

  // Get public user information (for seller profiles)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return only public information
      const publicUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
      };
      
      res.json(publicUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update profile image
  app.put('/api/profile-image', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { profileImageURL } = req.body;

      if (!profileImageURL) {
        return res.status(400).json({ message: 'Profile image URL is required' });
      }

      // Normalize the image URL (convert Google Cloud Storage URLs to /objects/ format)
      const normalizeImageUrl = (url: string): string => {
        if (url.includes('storage.googleapis.com')) {
          const parts = url.split('/');
          const uploadId = parts[parts.length - 1];
          return `/objects/uploads/${uploadId}`;
        }
        return url;
      };

      const normalizedImageUrl = normalizeImageUrl(profileImageURL);
      await storage.updateUserProfileImage(userId, normalizedImageUrl);
      
      res.json({ message: 'Profile image updated successfully' });
    } catch (error) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ message: 'Failed to update profile image' });
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
      const { category, search, location, page = 1, limit = 15 } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limitNum = Math.min(parseInt(limit as string) || 15, 50); // Max 50 per request
      const offset = (pageNum - 1) * limitNum;
      
      // Prepare filters object
      const filters: { category?: string; search?: string; location?: string } = {};
      if (category && typeof category === 'string') filters.category = category;
      if (search && typeof search === 'string') filters.search = search;
      if (location && typeof location === 'string') filters.location = location;
      
      const listings = await storage.getListings(limitNum, offset, Object.keys(filters).length > 0 ? filters : undefined);
      
      // Add cache headers for better client-side caching
      const hasFilters = Object.keys(filters).length > 0;
      res.set({
        'Cache-Control': hasFilters ? 'public, max-age=60' : 'public, max-age=120, s-maxage=300', 
        'ETag': `"listings-${offset}-${limitNum}-${JSON.stringify(filters)}"`,
      });
      
      res.json({
        listings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          hasMore: listings.length === limitNum
        }
      });
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

      // View count increment would be handled here in a real app
      
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.post('/api/listings', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.put('/api/listings/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const listing = await storage.getListingById(req.params.id);
      
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      if (listing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this listing" });
      }

      const updateData = insertListingSchema.partial().parse(req.body);
      const updatedListing = await storage.updateListing(req.params.id, updateData);
      
      res.json(updatedListing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      console.error("Error updating listing:", error);
      res.status(500).json({ message: "Failed to update listing" });
    }
  });

  // Delete listing would be implemented here

  // Like routes
  app.get('/api/listings/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const liked = await storage.isUserLikedListing(userId, req.params.id);
      res.json({ liked, likeCount: 0 }); // Like count would be calculated here
    } catch (error) {
      console.error("Error fetching like status:", error);
      res.status(500).json({ message: "Failed to fetch like status" });
    }
  });

  app.post('/api/listings/:id/like', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const result = await storage.toggleUserLike(userId, req.params.id);
      res.json({ liked: result.liked });
    } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Message routes
  app.get('/api/messages/:userId/:listingId', authenticateToken, async (req: any, res) => {
    try {
      const currentUserId = req.user!.id;
      const { userId, listingId } = req.params;
      
      // Get conversation between users for this listing
      const conversation = await storage.getConversation(currentUserId, userId, listingId);
      if (conversation) {
        const messages = await storage.getMessagesByConversation(conversation.id);
        res.json(messages);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', authenticateToken, async (req: any, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, listingId, content } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({ message: "Receiver and content are required" });
      }

      // Check if conversation exists between these users for this listing
      let conversation = await storage.getConversation(senderId, receiverId, listingId);
      
      // If no conversation exists, create one
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: senderId,
          user2Id: receiverId,
          listingId: listingId || null,
        });
      }

      // Create the message
      const message = await storage.createMessage({
        senderId,
        receiverId,
        listingId: listingId || null,
        content
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/conversations', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Quick message endpoints for chat functionality
  app.post('/api/appointments', authenticateToken, async (req: any, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, listingId, content, appointmentDate } = req.body;

      // Create or get conversation
      let conversation = await storage.getConversation(senderId, receiverId, listingId);
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: senderId,
          user2Id: receiverId,
          listingId: listingId || null,
        });
      }

      // Create appointment message
      const message = await storage.createMessage({
        senderId,
        receiverId,
        listingId: listingId || null,
        content: content || `Rendez-vous proposé pour ${appointmentDate || 'bientôt'}`,
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.post('/api/negotiations', authenticateToken, async (req: any, res) => {
    try {
      const senderId = req.user!.id;
      const { receiverId, listingId, content, proposedPrice } = req.body;

      // Create or get conversation
      let conversation = await storage.getConversation(senderId, receiverId, listingId);
      if (!conversation) {
        conversation = await storage.createConversation({
          user1Id: senderId,
          user2Id: receiverId,
          listingId: listingId || null,
        });
      }

      // Create negotiation message
      const message = await storage.createMessage({
        senderId,
        receiverId,
        listingId: listingId || null,
        content: content || `Offre de prix: ${proposedPrice} TND`,
      });

      res.json(message);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      res.status(500).json({ message: "Failed to create negotiation" });
    }
  });

  // Support routes
  app.post('/api/support/tickets', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const ticketData = insertSupportTicketSchema.parse({
        ...req.body,
        userId
      });

      const ticket = await storage.createSupportTicket(ticketData);
      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      console.error("Error creating support ticket:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get('/api/support/tickets', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const tickets = await storage.getSupportTickets();
      res.json(tickets.filter(t => t.userId === userId));
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.post('/api/support/tickets/:ticketId/messages', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { ticketId } = req.params;
      
      const messageData = insertSupportMessageSchema.parse({
        ...req.body,
        ticketId,
        senderId: userId
      });

      const message = await storage.createSupportMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating support message:", error);
      res.status(500).json({ message: "Failed to create support message" });
    }
  });

  // Review routes
  app.get('/api/listings/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getReviewsByListing(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/listings/:id/reviews', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const listingId = req.params.id;
      
      // Validate that the listing exists
      const listing = await storage.getListingById(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Prevent users from reviewing their own listings
      if (listing.userId === userId) {
        return res.status(400).json({ message: "Cannot review your own listing" });
      }

      const reviewData = insertReviewSchema.parse({
        ...req.body,
        listingId,
        reviewerId: userId,
        sellerId: listing.userId
      });

      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get('/api/sellers/:sellerId/reviews', async (req, res) => {
    try {
      const reviews = await storage.getReviewsBySeller(req.params.sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching seller reviews:", error);
      res.status(500).json({ message: "Failed to fetch seller reviews" });
    }
  });

  app.get('/api/sellers/:sellerId/rating', async (req, res) => {
    try {
      const rating = await storage.getAverageRating(req.params.sellerId);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching average rating:", error);
      res.status(500).json({ message: "Failed to fetch average rating" });
    }
  });

  app.post('/api/reviews/:reviewId/vote', authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user!.id;
      const { voteType } = req.body;
      
      if (!['helpful', 'not_helpful', 'report'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }

      // Use the voteReview method from storage
      await storage.voteReview(userId, req.params.reviewId, voteType);
      res.json({ message: "Vote recorded" });
    } catch (error) {
      console.error("Error handling review vote:", error);
      res.status(500).json({ message: "Failed to handle review vote" });
    }
  });

  app.get('/api/reviews/:reviewId/votes', async (req, res) => {
    try {
      const votes = await storage.getReviewVoteCounts(req.params.reviewId);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching review votes:", error);
      res.status(500).json({ message: "Failed to fetch review votes" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/role', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      await storage.updateUserRole(userId, role);
      res.json({ message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get('/api/admin/listings', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const listings = await storage.getAllListingsForAdmin();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching admin listings:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.put('/api/admin/listings/:listingId/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { listingId } = req.params;
      const { isActive } = req.body;
      
      await storage.updateListingStatus(listingId, isActive);
      res.json({ message: "Listing status updated successfully" });
    } catch (error) {
      console.error("Error updating listing status:", error);
      res.status(500).json({ message: "Failed to update listing status" });
    }
  });

  app.get('/api/admin/ad-requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const adRequests = await storage.getAllAdRequests();
      res.json(adRequests);
    } catch (error) {
      console.error("Error fetching ad requests:", error);
      res.status(500).json({ message: "Failed to fetch ad requests" });
    }
  });

  app.put('/api/admin/ad-requests/:requestId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { requestId } = req.params;
      const { status, adminMessage } = req.body;
      const reviewedBy = req.user!.id;
      
      await storage.updateAdRequestStatus(requestId, status, adminMessage, reviewedBy);
      
      // If approved, also update the listing
      if (status === 'approved') {
        // Get the ad request to find the listing ID
        const adRequests = await storage.getAllAdRequests();
        const adRequest = adRequests.find(r => r.id === requestId);
        if (adRequest) {
          await storage.approveAdRequest(adRequest.listingId, reviewedBy);
        }
      }
      
      res.json({ message: "Ad request updated successfully" });
    } catch (error) {
      console.error("Error updating ad request:", error);
      res.status(500).json({ message: "Failed to update ad request" });
    }
  });

  // Route pour les utilisateurs pour demander une publicité
  app.post('/api/ad-requests', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const requestedBy = req.user!.id;
      const { listingId, requestMessage } = req.body;
      
      const adRequestData = insertAdRequestSchema.parse({
        listingId,
        requestedBy,
        requestMessage
      });
      
      const adRequest = await storage.createAdRequest(adRequestData);
      res.status(201).json(adRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error("Error creating ad request:", error);
      res.status(500).json({ message: "Failed to create ad request" });
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