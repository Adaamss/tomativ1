# Tomati - Marketplace Tunisien

## Overview

Tomati is a Tunisian marketplace web application that allows users to buy and sell various products including cars, real estate, jobs, and other items. The application features a modern, mobile-first design with French language support and provides a comprehensive platform for classified advertisements. Users can create listings with images, browse products by categories, communicate through messaging, and view items on a map interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React 18 with TypeScript, utilizing a component-based architecture with reusable UI components from shadcn/ui. The application uses Wouter for client-side routing and TanStack Query for state management and API communication. The UI follows a mobile-first responsive design approach with Tailwind CSS for styling, implementing a bottom navigation pattern common in mobile applications.

### Backend Architecture
The backend follows a REST API architecture using Express.js with TypeScript. The server implements middleware for authentication, request logging, and error handling. The API provides endpoints for user management, listings, categories, conversations, and file uploads. The architecture separates concerns between route handlers, storage operations, and authentication logic.

### Authentication System
The application uses Replit's OpenID Connect (OIDC) authentication system with Passport.js for session management. User sessions are stored in PostgreSQL using connect-pg-simple, providing secure authentication and authorization. The system includes middleware for protecting routes and handling unauthorized access.

### Data Storage
The application uses PostgreSQL as the primary database with Drizzle ORM for type-safe database operations. The database schema includes tables for users, categories, listings, messages, conversations, and sessions. The storage layer is abstracted through an interface pattern, allowing for potential future database migrations or testing with mock implementations.

### File Storage and Management
File uploads are handled through Google Cloud Storage with a custom object storage service that implements access control lists (ACL) for secure file management. The system uses Uppy for the frontend file upload interface, supporting drag-and-drop functionality and progress tracking. Files are organized with proper permissions and metadata management.

### State Management
The frontend uses TanStack Query for server state management, providing caching, background updates, and optimistic updates. Local component state is managed through React hooks. The query client is configured with custom error handling and authentication-aware request functions.

### UI Component System
The application implements a comprehensive design system using shadcn/ui components built on top of Radix UI primitives. Components are styled with Tailwind CSS using CSS variables for theming, supporting both light and dark modes. The component library includes forms, navigation, cards, dialogs, and other interactive elements.

## External Dependencies

### Cloud Infrastructure
- **Neon Database**: PostgreSQL database hosting with connection pooling through @neondatabase/serverless
- **Google Cloud Storage**: Object storage for file uploads and static assets
- **Replit Authentication**: OIDC-based authentication service integrated with the Replit platform

### Frontend Libraries
- **React Ecosystem**: React 18, React DOM, React Hook Form for form management
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens and responsive utilities
- **File Uploads**: Uppy for file upload interface with AWS S3 integration
- **Date Handling**: date-fns for date formatting and manipulation with French locale support

### Backend Dependencies
- **Server Framework**: Express.js with TypeScript support
- **Database**: Drizzle ORM with PostgreSQL adapter and migration support
- **Authentication**: Passport.js with OpenID Connect strategy
- **Session Management**: express-session with PostgreSQL store
- **Validation**: Zod for runtime type validation and schema definition
- **Utilities**: Various utility libraries for memoization, UUID generation, and data processing

### Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **TypeScript**: Full TypeScript support across frontend and backend
- **Code Quality**: ESLint and TypeScript compiler for code quality assurance
- **Development Experience**: Hot module replacement, error overlays, and development-specific tooling