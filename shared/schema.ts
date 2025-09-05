import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password"), // Optional pour migration
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  displayName: varchar("display_name"),
  bio: text("bio"),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  emailVerified: integer("email_verified").default(0),
  role: varchar("role").default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  icon: varchar("icon"),
  color: varchar("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title"),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  currency: varchar("currency").default("TND"),
  categoryId: varchar("category_id").references(() => categories.id),
  userId: varchar("user_id").references(() => users.id),
  location: varchar("location"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: text("images").array(),
  status: varchar("status").default("available"), // available, reserved, sold, inactive
  reservedBy: varchar("reserved_by").references(() => users.id),
  reservedUntil: timestamp("reserved_until"),
  // Car-specific fields
  brand: varchar("brand"),
  model: varchar("model"),
  year: integer("year"),
  mileage: integer("mileage"),
  fuelType: varchar("fuel_type"),
  transmission: varchar("transmission"),
  // Real estate-specific fields
  propertyType: varchar("property_type"), // maison, appartement, terrain
  surface: integer("surface"), // superficie en m²
  rooms: integer("rooms"), // nombre de pièces
  bedrooms: integer("bedrooms"), // nombre de chambres
  bathrooms: integer("bathrooms"), // nombre de salles de bain
  floor: integer("floor"), // étage
  // Job-specific fields
  jobType: varchar("job_type"), // CDI, CDD, freelance, stage
  experience: varchar("experience"), // débutant, 1-3 ans, 3-5 ans, etc.
  salary: decimal("salary", { precision: 10, scale: 2 }),
  sector: varchar("sector"), // informatique, santé, éducation, etc.
  // General fields
  condition: varchar("condition"),
  features: text("features").array(),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  isActive: integer("is_active").default(1),
  isAd: integer("is_ad").default(0), // 0 = normal listing, 1 = publicité
  adStatus: varchar("ad_status"), // pending, approved, rejected (for ad requests)
  adApprovedAt: timestamp("ad_approved_at"),
  adApprovedBy: varchar("ad_approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").references(() => listings.id),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, appointment_request, appointment_response, price_negotiation
  metadata: jsonb("metadata"), // Store appointment details, price offers, etc.
  isRead: integer("is_read").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").references(() => listings.id),
  lastMessageId: varchar("last_message_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userLikes = pgTable("user_likes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_likes_user_id").on(table.userId),
  index("idx_user_likes_listing_id").on(table.listingId),
]);

// Appointments table for scheduling meetings
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").default(60), // minutes
  location: varchar("location"),
  notes: text("notes"),
  status: varchar("status").default("pending"), // pending, confirmed, cancelled, completed
  messageId: varchar("message_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Price negotiations table
export const priceNegotiations = pgTable("price_negotiations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }).notNull(),
  offeredPrice: decimal("offered_price", { precision: 10, scale: 2 }).notNull(),
  counterPrice: decimal("counter_price", { precision: 10, scale: 2 }),
  status: varchar("status").default("pending"), // pending, accepted, rejected, countered
  buyerMessage: text("buyer_message"),
  sellerMessage: text("seller_message"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  messageId: varchar("message_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Online status tracking for users
export const userStatus = pgTable("user_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  isOnline: integer("is_online").default(0),
  lastSeen: timestamp("last_seen").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support system tables
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for anonymous users
  userEmail: varchar("user_email"), // for tracking anonymous users
  userName: varchar("user_name"), // for display
  subject: varchar("subject").notNull(),
  category: varchar("category").default("general"), // general, technical, billing, feature
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("open"), // open, in_progress, resolved, closed
  assignedTo: varchar("assigned_to").references(() => users.id), // support agent
  tags: text("tags").array(), // for categorization
  metadata: jsonb("metadata"), // extra data like browser, device, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id),
  senderId: varchar("sender_id").references(() => users.id), // null for system messages
  senderType: varchar("sender_type").notNull().default("user"), // user, agent, system, bot
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, file, system_notification
  attachments: text("attachments").array(), // file URLs
  isInternal: integer("is_internal").default(0), // internal agent notes
  metadata: jsonb("metadata"), // for rich content, reactions, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const supportAgents = pgTable("support_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  department: varchar("department").default("general"), // general, technical, billing
  specialties: text("specialties").array(), // areas of expertise
  isActive: integer("is_active").default(1),
  maxTickets: integer("max_tickets").default(10), // concurrent ticket limit
  avgResponseTime: integer("avg_response_time"), // in minutes
  rating: decimal("rating", { precision: 3, scale: 2 }), // customer satisfaction
  totalTickets: integer("total_tickets").default(0),
  resolvedTickets: integer("resolved_tickets").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews and ratings table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  sellerId: varchar("seller_id").notNull().references(() => users.id), // The user being reviewed
  rating: integer("rating").notNull(), // 1-5 star rating
  title: varchar("title"),
  comment: text("comment"),
  isVerified: integer("is_verified").default(0), // 1 if purchase was verified
  isAnonymous: integer("is_anonymous").default(0), // 1 if reviewer wants to be anonymous
  status: varchar("status").default("published"), // published, pending, rejected, flagged
  helpfulVotes: integer("helpful_votes").default(0), // how many found this helpful
  reportCount: integer("report_count").default(0), // abuse reports
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_listing_id").on(table.listingId),
  index("idx_reviews_seller_id").on(table.sellerId),
  index("idx_reviews_reviewer_id").on(table.reviewerId),
]);

// Review helpful votes table (to track who voted)
export const reviewVotes = pgTable("review_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").notNull().references(() => reviews.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  voteType: varchar("vote_type").notNull(), // helpful, not_helpful, report
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_review_votes_review_id").on(table.reviewId),
  index("idx_review_votes_user_id").on(table.userId),
]);

// Ad requests table for managing advertisement requests
export const adRequests = pgTable("ad_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestMessage: text("request_message"), // User's message explaining why they want this ad
  adminMessage: text("admin_message"), // Admin's feedback message
  status: varchar("status").default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id), // Admin who reviewed
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_ad_requests_listing_id").on(table.listingId),
  index("idx_ad_requests_status").on(table.status),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  listings: many(listings),
  reservedListings: many(listings, { relationName: "reservedBy" }),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  userLikes: many(userLikes),
  buyerAppointments: many(appointments, { relationName: "buyer" }),
  sellerAppointments: many(appointments, { relationName: "seller" }),
  buyerNegotiations: many(priceNegotiations, { relationName: "buyer" }),
  sellerNegotiations: many(priceNegotiations, { relationName: "seller" }),
  userStatus: one(userStatus, {
    fields: [users.id],
    references: [userStatus.userId],
  }),
  supportTickets: many(supportTickets),
  supportMessages: many(supportMessages),
  supportAgent: one(supportAgents, {
    fields: [users.id],
    references: [supportAgents.userId],
  }),
  writtenReviews: many(reviews, { relationName: "reviewer" }),
  receivedReviews: many(reviews, { relationName: "seller" }),
  reviewVotes: many(reviewVotes),
  adRequests: many(adRequests, { relationName: "requester" }),
  reviewedAdRequests: many(adRequests, { relationName: "reviewer" }),
  approvedListings: many(listings, { relationName: "approvedBy" }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [listings.userId],
    references: [users.id],
  }),
  reservedByUser: one(users, {
    fields: [listings.reservedBy],
    references: [users.id],
    relationName: "reservedBy",
  }),
  messages: many(messages),
  userLikes: many(userLikes),
  appointments: many(appointments),
  priceNegotiations: many(priceNegotiations),
  reviews: many(reviews),
  adRequests: many(adRequests),
  adApprover: one(users, {
    fields: [listings.adApprovedBy],
    references: [users.id],
    relationName: "approvedBy",
  }),
}));

export const userLikesRelations = relations(userLikes, ({ one }) => ({
  user: one(users, {
    fields: [userLikes.userId],
    references: [users.id],
  }),
  listing: one(listings, {
    fields: [userLikes.listingId],
    references: [listings.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
  listing: one(listings, {
    fields: [messages.listingId],
    references: [listings.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user1: one(users, {
    fields: [conversations.user1Id],
    references: [users.id],
    relationName: "user1",
  }),
  user2: one(users, {
    fields: [conversations.user2Id],
    references: [users.id],
    relationName: "user2",
  }),
  listing: one(listings, {
    fields: [conversations.listingId],
    references: [listings.id],
  }),
  lastMessage: one(messages, {
    fields: [conversations.lastMessageId],
    references: [messages.id],
  }),
}));

// Appointments relations
export const appointmentsRelations = relations(appointments, ({ one }) => ({
  listing: one(listings, {
    fields: [appointments.listingId],
    references: [listings.id],
  }),
  buyer: one(users, {
    fields: [appointments.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [appointments.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  message: one(messages, {
    fields: [appointments.messageId],
    references: [messages.id],
  }),
}));

// Price negotiations relations
export const priceNegotiationsRelations = relations(priceNegotiations, ({ one }) => ({
  listing: one(listings, {
    fields: [priceNegotiations.listingId],
    references: [listings.id],
  }),
  buyer: one(users, {
    fields: [priceNegotiations.buyerId],
    references: [users.id],
    relationName: "buyer",
  }),
  seller: one(users, {
    fields: [priceNegotiations.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  message: one(messages, {
    fields: [priceNegotiations.messageId],
    references: [messages.id],
  }),
}));

// User status relations
export const userStatusRelations = relations(userStatus, ({ one }) => ({
  user: one(users, {
    fields: [userStatus.userId],
    references: [users.id],
  }),
}));

// Support system relations
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignedAgent: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
    relationName: "assignedAgent",
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
  }),
}));

export const supportAgentsRelations = relations(supportAgents, ({ one, many }) => ({
  user: one(users, {
    fields: [supportAgents.userId],
    references: [users.id],
  }),
  assignedTickets: many(supportTickets, { relationName: "assignedAgent" }),
}));

// Review relations
export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  listing: one(listings, {
    fields: [reviews.listingId],
    references: [listings.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  seller: one(users, {
    fields: [reviews.sellerId],
    references: [users.id],
    relationName: "seller",
  }),
  votes: many(reviewVotes),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id],
  }),
}));

// Ad requests relations
export const adRequestsRelations = relations(adRequests, ({ one }) => ({
  listing: one(listings, {
    fields: [adRequests.listingId],
    references: [listings.id],
  }),
  requester: one(users, {
    fields: [adRequests.requestedBy],
    references: [users.id],
    relationName: "requester",
  }),
  reviewer: one(users, {
    fields: [adRequests.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  likes: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLikeSchema = createInsertSchema(userLikes).omit({
  id: true,
  createdAt: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceNegotiationSchema = createInsertSchema(priceNegotiations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserStatusSchema = createInsertSchema(userStatus).omit({
  id: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSupportAgentSchema = createInsertSchema(supportAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalTickets: true,
  resolvedTickets: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  helpfulVotes: true,
  reportCount: true,
});

export const insertReviewVoteSchema = createInsertSchema(reviewVotes).omit({
  id: true,
  createdAt: true,
});

export const insertAdRequestSchema = createInsertSchema(adRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertUserLike = z.infer<typeof insertUserLikeSchema>;
export type UserLike = typeof userLikes.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertPriceNegotiation = z.infer<typeof insertPriceNegotiationSchema>;
export type PriceNegotiation = typeof priceNegotiations.$inferSelect;
export type InsertUserStatus = z.infer<typeof insertUserStatusSchema>;
export type UserStatus = typeof userStatus.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportAgent = z.infer<typeof insertSupportAgentSchema>;
export type SupportAgent = typeof supportAgents.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReviewVote = z.infer<typeof insertReviewVoteSchema>;
export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertAdRequest = z.infer<typeof insertAdRequestSchema>;
export type AdRequest = typeof adRequests.$inferSelect;
