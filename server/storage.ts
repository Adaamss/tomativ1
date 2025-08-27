import {
  users,
  categories,
  listings,
  messages,
  conversations,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, isNull } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
  incrementListingLikes(id: string): Promise<void>;
  
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

  async incrementListingLikes(id: string): Promise<void> {
    await db
      .update(listings)
      .set({ likes: sql`${listings.likes} + 1` })
      .where(eq(listings.id, id));
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
