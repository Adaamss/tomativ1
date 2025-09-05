import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { authenticateToken, hashPassword, comparePassword, generateToken, generateResetToken, type AuthenticatedRequest } from "./auth";
import { insertListingSchema, insertSupportTicketSchema, insertSupportMessageSchema, insertReviewSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import cookieParser from "cookie-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());

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
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
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
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
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
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: "Logged out successfully" });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await storage.updateUserResetToken(user.id, resetToken, expiry);

      // In a real app, you would send an email here
      // For now, just return success
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/auth/user', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
        displayName: user.displayName,
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

  // Get listings by user
  app.get('/api/listings/user/:userId', async (req, res) => {
    try {
      const listings = await storage.getListingsByUser(req.params.userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch user listings" });
    }
  });

  app.post('/api/listings', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
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

  app.put('/api/listings/:id', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
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

  app.get('/api/user/listings', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const listings = await storage.getListingsByUser(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(500).json({ message: "Failed to fetch user listings" });
    }
  });

  // Message routes
  app.get('/api/conversations', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/conversations/:id/messages', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const messages = await storage.getMessagesByConversation(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
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
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      
      // Check if object has public visibility
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: undefined, // Allow public access
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.sendStatus(404);
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/listing-images", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.id;

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
  app.get("/api/messages/:sellerId/:listingId?", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
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
  app.get("/api/conversations", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    try {
      const conversations = await storage.getConversationsByUser(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // User profile routes
  app.put("/api/profile", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
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

  // Update profile image
  app.put("/api/profile-image", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
    const { profileImageURL } = req.body;

    if (!profileImageURL) {
      return res.status(400).json({ error: "profileImageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        profileImageURL,
        {
          owner: userId,
          visibility: "public", // Profile images are public
        },
      );

      // Update user profile with new image
      const updatedUser = await storage.upsertUser({
        id: userId,
        profileImageUrl: objectPath,
        updatedAt: new Date(),
      });

      res.json({ 
        objectPath: objectPath,
        user: updatedUser 
      });
    } catch (error) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // Toggle like/unlike a listing
  app.post("/api/listings/:id/like", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
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
  app.get("/api/listings/:id/like", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const userId = req.user?.id;
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
  app.get("/api/likes/user/:userId", authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    const currentUserId = req.user?.id;
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

  // Support chat routes
  app.post('/api/support/tickets', async (req, res) => {
    try {
      const { subject, category, priority, userEmail, userName } = req.body;
      
      // Get user ID if authenticated
      let userId = null;
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = await authenticateToken(token);
          userId = decoded.id;
        } catch (error) {
          // Continue as anonymous user
        }
      }

      const ticket = await storage.createSupportTicket({
        userId,
        userEmail: userEmail || 'anonymous@tomati.com',
        userName: userName || 'Utilisateur Anonyme',
        subject: subject || 'Demande de support',
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open'
      });

      // Create welcome message from bot - Arabic & French
      await storage.createSupportMessage({
        ticketId: ticket.id,
        senderId: null,
        senderType: 'bot',
        content: `🇹🇳 أهلاً وسهلاً في تومتي! 
السلام عليكم ورحمة الله وبركاته

👋 Bonjour et bienvenue sur Tomati !

🤖 أنا شاتومتي، مساعدك الذكي باللغتين العربية والفرنسية
Je suis Chattomati, votre assistant intelligent bilingue

✅ تم استلام طلبك: "${subject}"
Votre demande a été reçue: "${subject}"

🚀 أقدر أساعدك فوراً بـ:
Je peux vous aider immédiatement avec:

🏠 العقارات والسيارات - Immobilier et automobiles
💼 فرص العمل - Opportunités d'emploi  
🛍️ البيع والشراء - Achat et vente
📱 المشاكل التقنية - Support technique

اكتب رسالتك وأنا هنا لمساعدتك! 
Écrivez votre message et je suis là pour vous aider !`,
        messageType: 'text'
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.get('/api/support/tickets/:id/messages', async (req, res) => {
    try {
      const messages = await storage.getSupportMessagesByTicket(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching support messages:", error);
      res.status(500).json({ message: "Failed to fetch support messages" });
    }
  });

  app.post('/api/support/tickets/:id/messages', async (req, res) => {
    try {
      const { content, senderType } = req.body;
      
      let senderId = null;
      if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = await authenticateToken(token);
          senderId = decoded.id;
        } catch (error) {
          // Continue as anonymous user
        }
      }

      const message = await storage.createSupportMessage({
        ticketId: req.params.id,
        senderId,
        senderType: senderType || 'user',
        content,
        messageType: 'text'
      });

      // Auto-reply with intelligent response (Arabic & French)
      if (senderType === 'user' || !senderType) {
        const autoResponse = generateIntelligentResponse(content);
        if (autoResponse) {
          setTimeout(async () => {
            try {
              await storage.createSupportMessage({
                ticketId: req.params.id,
                senderId: null,
                senderType: 'bot',
                content: autoResponse,
                messageType: 'text'
              });
            } catch (error) {
              console.error("Error sending auto-response:", error);
            }
          }, 1500); // Delay for natural conversation flow
        }
      }

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating support message:", error);
      res.status(500).json({ message: "Failed to create support message" });
    }
  });

  // Intelligent response generator for Arabic & French
  function generateIntelligentResponse(userMessage: string): string | null {
    const msg = userMessage.toLowerCase();
    
    // Arabic greetings
    if (msg.includes('مرحبا') || msg.includes('السلام') || msg.includes('أهلا')) {
      return `🇹🇳 وعليكم السلام ورحمة الله وبركاته! أهلاً وسهلاً بك
      
✨ كيف يمكنني مساعدتك اليوم؟
🏠 تبحث عن عقار؟ 
🚗 تريد تبيع أو تشتري سيارة؟
💼 تدور على شغل؟

أنا هنا لمساعدتك في كل شيء!`;
    }
    
    // French greetings
    if (msg.includes('bonjour') || msg.includes('salut') || msg.includes('bonsoir')) {
      return `👋 Bonjour ! Ravi de vous parler !

🎯 Comment puis-je vous aider aujourd'hui ?
🏡 Vous cherchez un logement ?
🚙 Vous voulez vendre/acheter une voiture ?
💼 Vous recherchez un emploi ?

Je suis là pour vous accompagner !`;
    }
    
    // Car related (Arabic)
    if (msg.includes('سيارة') || msg.includes('عربية') || msg.includes('موتور')) {
      return `🚗 مرحباً بك في قسم السيارات!

✅ عندنا أحسن العروض:
🔥 سيارات مستعملة بأسعار ممتازة
💎 سيارات جديدة من أشهر الماركات
🛠️ خدمة صيانة وقطع غيار
📱 تقدر تنشر إعلانك مجاناً

شنوا تحب بالضبط؟`;
    }
    
    // Car related (French)
    if (msg.includes('voiture') || msg.includes('auto') || msg.includes('véhicule')) {
      return `🚗 Bienvenue dans notre section automobile !

✨ Nous avons les meilleures offres :
🔥 Voitures d'occasion à prix exceptionnels
💎 Véhicules neufs des meilleures marques
🛠️ Service de maintenance et pièces détachées
📱 Publiez votre annonce gratuitement

Que recherchez-vous exactement ?`;
    }
    
    // Real estate (Arabic) 
    if (msg.includes('بيت') || msg.includes('دار') || msg.includes('عقار') || msg.includes('شقة')) {
      return `🏠 أهلاً بك في قسم العقارات!

🌟 عروض مميزة:
🏡 بيوت وفيلات للبيع والكراء
🏢 شقق مفروشة وغير مفروشة
🏬 محلات تجارية ومكاتب
📍 في أحسن المناطق بتونس

وين تحب تسكن؟`;
    }
    
    // Real estate (French)
    if (msg.includes('maison') || msg.includes('appartement') || msg.includes('immobilier') || msg.includes('logement')) {
      return `🏠 Bienvenue dans notre section immobilière !

🌟 Offres exceptionnelles :
🏡 Maisons et villas à vendre/louer
🏢 Appartements meublés et non meublés
🏬 Locaux commerciaux et bureaux
📍 Dans les meilleurs quartiers de Tunisie

Où souhaitez-vous habiter ?`;
    }
    
    // Jobs (Arabic)
    if (msg.includes('شغل') || msg.includes('عمل') || msg.includes('وظيفة') || msg.includes('خدمة')) {
      return `💼 مرحباً بك في قسم الوظائف!

🚀 فرص عمل ممتازة:
👨‍💻 وظائف في التكنولوجيا
🏢 وظائف إدارية ومحاسبة
🛠️ أعمال حرفية ومهنية
🎓 فرص للخريجين الجدد

شنو نوع الشغل اللي تدور عليه؟`;
    }
    
    // Jobs (French)  
    if (msg.includes('emploi') || msg.includes('travail') || msg.includes('job') || msg.includes('poste')) {
      return `💼 Bienvenue dans notre section emploi !

🚀 Opportunités exceptionnelles :
👨‍💻 Emplois dans la technologie
🏢 Postes administratifs et comptabilité
🛠️ Métiers artisanaux et professionnels
🎓 Opportunités pour jeunes diplômés

Quel type d'emploi recherchez-vous ?`;
    }
    
    // Technical issues (Arabic)
    if (msg.includes('مشكلة') || msg.includes('خطأ') || msg.includes('تقني') || msg.includes('لا يعمل')) {
      return `🔧 لا تقلق، أنا هنا لحل مشكلتك!

⚡ دعني أساعدك:
1️⃣ وضّحلي المشكلة بالتفصيل
2️⃣ جرب تحديث الصفحة
3️⃣ امسح الكاش والكوكيز
4️⃣ جرب متصفح آخر

إذا المشكلة باقية، اكتبلي رقمك وأتصل بك فوراً!`;
    }
    
    // Technical issues (French)
    if (msg.includes('problème') || msg.includes('erreur') || msg.includes('technique') || msg.includes('marche pas')) {
      return `🔧 Pas de souci, je suis là pour résoudre votre problème !

⚡ Laissez-moi vous aider :
1️⃣ Décrivez-moi le problème en détail
2️⃣ Essayez de rafraîchir la page
3️⃣ Videz le cache et les cookies
4️⃣ Testez avec un autre navigateur

Si le problème persiste, donnez-moi votre numéro et je vous appelle immédiatement !`;
    }
    
    // Prices (Arabic)
    if (msg.includes('سعر') || msg.includes('ثمن') || msg.includes('فلوس') || msg.includes('مال')) {
      return `💰 أسعارنا هي الأحسن في السوق!

💎 خدماتنا:
✅ نشر الإعلانات مجاني تماماً
🎯 خدمات مميزة بأسعار رمزية
📱 دعم فني 24/7 مجاني
🚀 ترويج متقدم للإعلانات

عايز تعرف سعر شنو بالضبط؟`;
    }
    
    // Prices (French)  
    if (msg.includes('prix') || msg.includes('coût') || msg.includes('tarif') || msg.includes('gratuit')) {
      return `💰 Nos prix sont les meilleurs du marché !

💎 Nos services :
✅ Publication d'annonces totalement gratuite
🎯 Services premium à prix symboliques
📱 Support technique 24/7 gratuit  
🚀 Promotion avancée d'annonces

Quel prix souhaitez-vous connaître exactement ?`;
    }
    
    // Thanks (Arabic)
    if (msg.includes('شكرا') || msg.includes('مرسي') || msg.includes('يعطيك') || msg.includes('بارك الله')) {
      return `🌟 العفو حبيبي! دي خدمتنا

🇹🇳 احنا هنا عشانكم دايماً
💪 أي حاجة تانية تحتاجها؟
📱 متنساش تنزل التطبيق عالموبايل
⭐ وننتظر تقييمك الحلو

تومتي - السوق الإلكتروني الأول في تونس!`;
    }
    
    // Thanks (French)
    if (msg.includes('merci') || msg.includes('remercie') || msg.includes('parfait') || msg.includes('super')) {
      return `🌟 Je vous en prie ! C'est un plaisir de vous aider

🇹🇳 Nous sommes toujours là pour vous
💪 Avez-vous besoin d'autre chose ?
📱 N'oubliez pas de télécharger notre app mobile
⭐ Votre avis nous interesse beaucoup

Tomati - La marketplace N°1 en Tunisie !`;
    }
    
    return null; // No specific response, let human agent handle
  }

  // Review API endpoints
  app.get('/api/listings/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getReviewsByListing(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.post('/api/listings/:id/reviews', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
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

  app.post('/api/reviews/:reviewId/vote', authenticateToken as any, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.id;
      const { voteType } = req.body;
      
      if (!['helpful', 'not_helpful', 'report'].includes(voteType)) {
        return res.status(400).json({ message: "Invalid vote type" });
      }

      const vote = await storage.voteReview(userId, req.params.reviewId, voteType);
      res.json(vote);
    } catch (error) {
      console.error("Error voting on review:", error);
      res.status(500).json({ message: "Failed to vote on review" });
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
