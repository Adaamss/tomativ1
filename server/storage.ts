import {
  users,
  categories,
  listings,
  messages,
  conversations,
  userLikes,
  supportTickets,
  supportMessages,
  reviews,
  reviewVotes,
  adRequests,
  type User,
  type UpsertUser,
  type Category,
  type InsertCategory,
  type Listing,
  type InsertListing,
  type Message,
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type UserLike,
  type InsertUserLike,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportMessage,
  type InsertSupportMessage,
  type Review,
  type InsertReview,
  type ReviewVote,
  type InsertReviewVote,
  type AdRequest,
  type InsertAdRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";
import memoize from "memoizee";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPassword(id: string, password: string): Promise<void>;
  updateUserResetToken(id: string, token: string | null, expiry: Date | null): Promise<void>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  
  // Listing operations
  getListings(limit?: number, offset?: number, filters?: { category?: string; search?: string; location?: string }): Promise<Listing[]>;
  getListingById(id: string): Promise<Listing | undefined>;
  getListingsByCategory(categoryId: string, limit?: number): Promise<Listing[]>;
  getListingsByUser(userId: string): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, listing: Partial<InsertListing>): Promise<Listing | undefined>;
  incrementListingViews(id: string): Promise<void>;
  
  // Like operations
  toggleUserLike(userId: string, listingId: string): Promise<{ liked: boolean; likesCount: number }>;
  isUserLikedListing(userId: string, listingId: string): Promise<boolean>;
  getUserLikedListings(userId: string): Promise<Listing[]>;
  
  // Message operations
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(user1Id: string, user2Id: string, listingId?: string): Promise<Conversation | undefined>;
  
  // Support operations
  createSupportTicket(ticketData: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTickets(): Promise<SupportTicket[]>;
  getSupportTicketById(id: string): Promise<SupportTicket | undefined>;
  updateSupportTicket(id: string, ticketData: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  createSupportMessage(messageData: InsertSupportMessage): Promise<SupportMessage>;
  getSupportMessagesByTicket(ticketId: string): Promise<SupportMessage[]>;
  
  // Review operations
  createReview(reviewData: InsertReview): Promise<Review>;
  getReviewsByListing(listingId: string): Promise<Review[]>;
  getReviewsBySeller(sellerId: string): Promise<Review[]>;
  getReviewById(id: string): Promise<Review | undefined>;
  updateReview(id: string, reviewData: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<void>;
  getAverageRating(sellerId: string): Promise<{ average: number; count: number }>;
  
  // Review vote operations
  voteReview(userId: string, reviewId: string, voteType: 'helpful' | 'not_helpful' | 'report'): Promise<ReviewVote>;
  getUserVoteForReview(userId: string, reviewId: string): Promise<ReviewVote | undefined>;
  getReviewVoteCounts(reviewId: string): Promise<{ helpful: number; not_helpful: number; report: number }>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  getAllListingsForAdmin(): Promise<Listing[]>;
  updateListingStatus(listingId: string, isActive: number): Promise<void>;
  createAdRequest(adRequestData: InsertAdRequest): Promise<AdRequest>;
  getAllAdRequests(): Promise<AdRequest[]>;
  updateAdRequestStatus(requestId: string, status: string, adminMessage?: string, reviewedBy?: string): Promise<void>;
  approveAdRequest(listingId: string, approvedBy: string): Promise<void>;
  getAdminStats(): Promise<{
    totalUsers: number;
    totalListings: number;
    totalActiveListings: number;
    totalAds: number;
    pendingAdRequests: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Cache setup for frequently accessed data
  private getCategoriesCache = memoize(this._getCategories.bind(this), {
    maxAge: 5 * 60 * 1000, // 5 minutes
  });

  private getListingsCache = memoize(this._getListings.bind(this), {
    maxAge: 2 * 60 * 1000, // 2 minutes
    max: 100, // Maximum number of cache entries
  });

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({ password, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserResetToken(id: string, token: string | null, expiry: Date | null): Promise<void> {
    await db
      .update(users)
      .set({ 
        resetToken: token,
        resetTokenExpiry: expiry,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id));
  }

  // Category operations - Cached version
  private async _getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategories(): Promise<Category[]> {
    return this.getCategoriesCache();
  }

  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(categoryData)
      .returning();
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug));
    return category;
  }

  // Listing operations - Optimized with caching but return full objects for now
  private async _getListings(limit = 15, offset = 0, filters?: { category?: string; search?: string; location?: string }): Promise<Listing[]> {
    const conditions = [eq(listings.isActive, 1)];
    
    if (filters) {
      // Filter by category
      if (filters.category) {
        conditions.push(eq(listings.categoryId, filters.category));
      }
      
      // Search in title and description
      if (filters.search && filters.search.trim()) {
        const searchTerm = `%${filters.search.trim().toLowerCase()}%`;
        conditions.push(
          or(
            sql`LOWER(${listings.title}) LIKE ${searchTerm}`,
            sql`LOWER(${listings.description}) LIKE ${searchTerm}`
          )!
        );
      }
      
      // Filter by location
      if (filters.location && filters.location.trim()) {
        const locationTerm = `%${filters.location.trim().toLowerCase()}%`;
        conditions.push(sql`LOWER(${listings.location}) LIKE ${locationTerm}`);
      }
    }
    
    return await db
      .select()
      .from(listings)
      .where(and(...conditions))
      .orderBy(desc(listings.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getListings(limit = 15, offset = 0, filters?: { category?: string; search?: string; location?: string }): Promise<Listing[]> {
    // Pour les filtres, on ne met pas en cache pour avoir des résultats à jour
    if (filters && (filters.category || filters.search || filters.location)) {
      return this._getListings(limit, offset, filters);
    }
    return this.getListingsCache(limit, offset);
  }

  async getListingById(id: string): Promise<Listing | undefined> {
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, id), eq(listings.isActive, 1)));
    return listing;
  }

  async getListingsByCategory(categoryId: string, limit = 20): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .where(and(eq(listings.categoryId, categoryId), eq(listings.isActive, 1)))
      .orderBy(desc(listings.createdAt))
      .limit(limit);
  }

  async getListingsByUser(userId: string): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .where(eq(listings.userId, userId))
      .orderBy(desc(listings.createdAt));
  }

  async createListing(listingData: InsertListing): Promise<Listing> {
    const [listing] = await db
      .insert(listings)
      .values(listingData)
      .returning();
    
    // Clear the listings cache so new listing appears immediately
    this.getListingsCache.clear();
    
    return listing;
  }

  async updateListing(id: string, listingData: Partial<InsertListing>): Promise<Listing | undefined> {
    const [listing] = await db
      .update(listings)
      .set({ ...listingData, updatedAt: new Date() })
      .where(eq(listings.id, id))
      .returning();
    return listing;
  }

  async incrementListingViews(id: string): Promise<void> {
    await db
      .update(listings)
      .set({ views: sql`${listings.views} + 1` })
      .where(eq(listings.id, id));
  }

  // Like operations
  async toggleUserLike(userId: string, listingId: string): Promise<{ liked: boolean; likesCount: number }> {
    // Check if user already liked this listing
    const [existingLike] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, userId), eq(userLikes.listingId, listingId)));

    if (existingLike) {
      // Unlike: remove the like record and decrement likes count
      await db
        .delete(userLikes)
        .where(and(eq(userLikes.userId, userId), eq(userLikes.listingId, listingId)));
      
      await db
        .update(listings)
        .set({ 
          likes: sql`GREATEST(${listings.likes} - 1, 0)`
        })
        .where(eq(listings.id, listingId));
      
      const [updatedListing] = await db
        .select({ likes: listings.likes })
        .from(listings)
        .where(eq(listings.id, listingId));
      
      return { liked: false, likesCount: updatedListing?.likes || 0 };
    } else {
      // Like: add like record and increment likes count
      await db
        .insert(userLikes)
        .values({ userId, listingId });
      
      await db
        .update(listings)
        .set({ 
          likes: sql`${listings.likes} + 1`
        })
        .where(eq(listings.id, listingId));
      
      const [updatedListing] = await db
        .select({ likes: listings.likes })
        .from(listings)
        .where(eq(listings.id, listingId));
      
      return { liked: true, likesCount: updatedListing?.likes || 0 };
    }
  }

  async isUserLikedListing(userId: string, listingId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(userLikes)
      .where(and(eq(userLikes.userId, userId), eq(userLikes.listingId, listingId)));
    
    return !!like;
  }

  async getUserLikedListings(userId: string): Promise<Listing[]> {
    return await db
      .select()
      .from(userLikes)
      .innerJoin(listings, eq(userLikes.listingId, listings.id))
      .where(and(eq(userLikes.userId, userId), eq(listings.isActive, 1)))
      .orderBy(desc(userLikes.createdAt))
      .then(rows => rows.map(row => row.listings));
  }

  // Message operations
  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(or(eq(conversations.user1Id, userId), eq(conversations.user2Id, userId)))
      .orderBy(desc(conversations.updatedAt));
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    // First get the conversation to determine participants
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) return [];

    return await db
      .select()
      .from(messages)
      .where(
        and(
          or(
            and(eq(messages.senderId, conversation.user1Id), eq(messages.receiverId, conversation.user2Id)),
            and(eq(messages.senderId, conversation.user2Id), eq(messages.receiverId, conversation.user1Id))
          ),
          conversation.listingId 
            ? eq(messages.listingId, conversation.listingId)
            : isNull(messages.listingId)
        )
      )
      .orderBy(messages.createdAt);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return conversation;
  }

  async getConversation(user1Id: string, user2Id: string, listingId?: string): Promise<Conversation | undefined> {
    const conditions = [
      or(
        and(eq(conversations.user1Id, user1Id), eq(conversations.user2Id, user2Id)),
        and(eq(conversations.user1Id, user2Id), eq(conversations.user2Id, user1Id))
      )
    ];

    if (listingId) {
      conditions.push(eq(conversations.listingId, listingId));
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(...conditions));
    
    return conversation;
  }

  // Support operations
  async createSupportTicket(ticketData: InsertSupportTicket): Promise<SupportTicket> {
    const [ticket] = await db
      .insert(supportTickets)
      .values(ticketData)
      .returning();
    return ticket;
  }

  async getSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketById(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));
    return ticket;
  }

  async updateSupportTicket(id: string, ticketData: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .update(supportTickets)
      .set({ ...ticketData, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return ticket;
  }

  async createSupportMessage(messageData: InsertSupportMessage): Promise<SupportMessage> {
    const [message] = await db
      .insert(supportMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getSupportMessagesByTicket(ticketId: string): Promise<SupportMessage[]> {
    return await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);
  }

  // Review operations
  async createReview(reviewData: InsertReview): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values(reviewData)
      .returning();
    return review;
  }

  async getReviewsByListing(listingId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.listingId, listingId), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt));
  }

  async getReviewsBySeller(sellerId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.status, "published")))
      .orderBy(desc(reviews.createdAt));
  }

  async getReviewById(id: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id));
    return review;
  }

  async updateReview(id: string, reviewData: Partial<InsertReview>): Promise<Review | undefined> {
    const [review] = await db
      .update(reviews)
      .set({ ...reviewData, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  async deleteReview(id: string): Promise<void> {
    await db
      .delete(reviews)
      .where(eq(reviews.id, id));
  }

  async getAverageRating(sellerId: string): Promise<{ average: number; count: number }> {
    const result = await db
      .select({
        average: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`,
        count: sql<number>`COUNT(${reviews.id})::int`
      })
      .from(reviews)
      .where(and(eq(reviews.sellerId, sellerId), eq(reviews.status, "published")));
    
    return {
      average: result[0]?.average || 0,
      count: result[0]?.count || 0
    };
  }

  // Review vote operations
  async voteReview(userId: string, reviewId: string, voteType: 'helpful' | 'not_helpful' | 'report'): Promise<ReviewVote> {
    // First, remove any existing vote by this user for this review
    await db
      .delete(reviewVotes)
      .where(and(eq(reviewVotes.userId, userId), eq(reviewVotes.reviewId, reviewId)));

    // Insert the new vote
    const [vote] = await db
      .insert(reviewVotes)
      .values({ userId, reviewId, voteType })
      .returning();

    // Update the review's vote counts
    if (voteType === 'helpful') {
      await db
        .update(reviews)
        .set({ 
          helpfulVotes: sql`(
            SELECT COUNT(*) FROM ${reviewVotes} 
            WHERE ${reviewVotes.reviewId} = ${reviewId} 
            AND ${reviewVotes.voteType} = 'helpful'
          )`
        })
        .where(eq(reviews.id, reviewId));
    } else if (voteType === 'report') {
      await db
        .update(reviews)
        .set({ 
          reportCount: sql`(
            SELECT COUNT(*) FROM ${reviewVotes} 
            WHERE ${reviewVotes.reviewId} = ${reviewId} 
            AND ${reviewVotes.voteType} = 'report'
          )`
        })
        .where(eq(reviews.id, reviewId));
    }

    return vote;
  }

  async getUserVoteForReview(userId: string, reviewId: string): Promise<ReviewVote | undefined> {
    const [vote] = await db
      .select()
      .from(reviewVotes)
      .where(and(eq(reviewVotes.userId, userId), eq(reviewVotes.reviewId, reviewId)));
    return vote;
  }

  async getReviewVoteCounts(reviewId: string): Promise<{ helpful: number; not_helpful: number; report: number }> {
    const result = await db
      .select({
        voteType: reviewVotes.voteType,
        count: sql<number>`COUNT(*)::int`
      })
      .from(reviewVotes)
      .where(eq(reviewVotes.reviewId, reviewId))
      .groupBy(reviewVotes.voteType);

    const counts = { helpful: 0, not_helpful: 0, report: 0 };
    result.forEach(row => {
      if (row.voteType === 'helpful') counts.helpful = row.count;
      else if (row.voteType === 'not_helpful') counts.not_helpful = row.count;
      else if (row.voteType === 'report') counts.report = row.count;
    });

    return counts;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllListingsForAdmin(): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .orderBy(desc(listings.createdAt));
  }

  async updateListingStatus(listingId: string, isActive: number): Promise<void> {
    await db
      .update(listings)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(listings.id, listingId));
  }

  async createAdRequest(adRequestData: InsertAdRequest): Promise<AdRequest> {
    const [adRequest] = await db
      .insert(adRequests)
      .values(adRequestData)
      .returning();
    return adRequest;
  }

  async getAllAdRequests(): Promise<AdRequest[]> {
    return await db
      .select()
      .from(adRequests)
      .orderBy(desc(adRequests.createdAt));
  }

  async updateAdRequestStatus(requestId: string, status: string, adminMessage?: string, reviewedBy?: string): Promise<void> {
    await db
      .update(adRequests)
      .set({ 
        status, 
        adminMessage, 
        reviewedBy, 
        reviewedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(adRequests.id, requestId));
  }

  async approveAdRequest(listingId: string, approvedBy: string): Promise<void> {
    await db
      .update(listings)
      .set({ 
        isAd: 1, 
        adStatus: "approved",
        adApprovedAt: new Date(),
        adApprovedBy: approvedBy,
        updatedAt: new Date() 
      })
      .where(eq(listings.id, listingId));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalListings: number;
    totalActiveListings: number;
    totalAds: number;
    pendingAdRequests: number;
  }> {
    const [totalUsersResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(users);
    
    const [totalListingsResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(listings);
    
    const [totalActiveListingsResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(listings)
      .where(eq(listings.isActive, 1));
    
    const [totalAdsResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(listings)
      .where(eq(listings.isAd, 1));
    
    const [pendingAdRequestsResult] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(adRequests)
      .where(eq(adRequests.status, "pending"));

    return {
      totalUsers: totalUsersResult?.count || 0,
      totalListings: totalListingsResult?.count || 0,
      totalActiveListings: totalActiveListingsResult?.count || 0,
      totalAds: totalAdsResult?.count || 0,
      pendingAdRequests: pendingAdRequestsResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
