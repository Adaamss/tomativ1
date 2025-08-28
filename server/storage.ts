import {
  users,
  categories,
  listings,
  messages,
  conversations,
  userLikes,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";

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
  getListings(limit?: number, offset?: number): Promise<Listing[]>;
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
}

export class DatabaseStorage implements IStorage {
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

  // Category operations
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
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

  // Listing operations
  async getListings(limit = 20, offset = 0): Promise<Listing[]> {
    return await db
      .select()
      .from(listings)
      .where(eq(listings.isActive, 1))
      .orderBy(desc(listings.createdAt))
      .limit(limit)
      .offset(offset);
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
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        price: listings.price,
        currency: listings.currency,
        categoryId: listings.categoryId,
        userId: listings.userId,
        location: listings.location,
        latitude: listings.latitude,
        longitude: listings.longitude,
        images: listings.images,
        brand: listings.brand,
        model: listings.model,
        year: listings.year,
        mileage: listings.mileage,
        fuelType: listings.fuelType,
        transmission: listings.transmission,
        propertyType: listings.propertyType,
        surface: listings.surface,
        rooms: listings.rooms,
        bedrooms: listings.bedrooms,
        bathrooms: listings.bathrooms,
        floor: listings.floor,
        jobType: listings.jobType,
        experience: listings.experience,
        salary: listings.salary,
        sector: listings.sector,
        condition: listings.condition,
        features: listings.features,
        views: listings.views,
        likes: listings.likes,
        isActive: listings.isActive,
        createdAt: listings.createdAt,
        updatedAt: listings.updatedAt,
      })
      .from(userLikes)
      .innerJoin(listings, eq(userLikes.listingId, listings.id))
      .where(and(eq(userLikes.userId, userId), eq(listings.isActive, 1)))
      .orderBy(desc(userLikes.createdAt));
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
}

export const storage = new DatabaseStorage();
