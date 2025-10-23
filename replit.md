# FI Planner - Financial Independence Planning Tool

## Overview

FI Planner is a web-based financial planning application that models the Smith Manoeuvre strategy combined with rental property acquisitions. The application helps users plan their path to financial independence by simulating mortgage strategies, investment lines of credit (LOC), and rental property purchases to replace salary income. All calculations are performed client-side with no backend data persistence required.

**Key Features:**
- Smith Manoeuvre mortgage strategy modeling
- Rental property acquisition planning
- Investment portfolio tracking with tax-deductible interest
- Multi-year financial projections
- Interactive charts and visualizations
- CSV export functionality
- No user authentication or sign-in required

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks (useState, useEffect) for local state
- **Data Fetching**: TanStack Query (React Query) for potential API interactions
- **Build Tool**: Vite for fast development and optimized production builds

**Rationale**: React with TypeScript provides type safety and component reusability. Vite offers superior developer experience with hot module replacement and fast builds compared to traditional bundlers.

**UI Component Library**: Radix UI with shadcn/ui
- Headless, accessible components from Radix UI
- Pre-styled components from shadcn/ui (New York style variant)
- Tailwind CSS for utility-first styling
- Custom design tokens for consistent theming

**Rationale**: Radix UI provides production-ready accessible components without imposing specific styles. The shadcn/ui layer adds beautiful defaults while maintaining full customization capability. Tailwind CSS enables rapid UI development with minimal custom CSS.

**Charts & Visualization**: Chart.js with react-chartjs-2
- Line charts for financial projections over time
- Interactive tooltips and legends
- Responsive design for mobile and desktop

**Rationale**: Chart.js is mature, performant, and provides the specific chart types needed for financial data visualization.

### Data Flow Architecture

**Client-Side Computation Model**:
- All financial calculations performed in the browser
- No server-side processing or data storage
- State persists only during browser session
- Export functionality for data portability

**Rationale**: The application is designed as an educational tool with no need for user accounts or data persistence. Client-side computation eliminates backend complexity, reduces infrastructure costs, and ensures user privacy.

**Calculation Engine** (`client/src/lib/calculations.ts`):
- Pure TypeScript functions for financial modeling
- Mortgage payment calculations using standard amortization formulas
- Multi-property rental analysis with separate mortgage tracking
- Investment portfolio simulation with dividend yields and total returns
- Tax calculation for deductible interest expenses

**Input Validation**: Zod schemas in `shared/schema.ts`
- Type-safe validation for all user inputs
- Ensures data consistency across components
- Enables form validation with react-hook-form integration

### Backend Architecture

**Server Framework**: Express.js with TypeScript
- Minimal backend serving only the SPA
- Development mode: Vite middleware for HMR
- Production mode: Static file serving from dist/public

**Rationale**: The backend is intentionally minimal since all business logic runs client-side. Express provides just enough infrastructure to serve the application and handle potential future API endpoints.

**Build Process**:
- Client: Vite bundles React application to dist/public
- Server: esbuild bundles Express server to dist/index.js
- Separate compilation for client and server code

### Data Storage

**Current State**: No database or persistent storage
- Application operates entirely in-memory
- User data exists only in browser session
- Export to CSV for data portability

**Database Configuration Present** (not currently used):
- Drizzle ORM configured with PostgreSQL dialect
- Neon serverless database connection setup
- Schema defined but no active database operations

**Rationale**: The application was initially scaffolded with database support for potential future features (user accounts, saved scenarios), but current requirements are met with client-side-only architecture.

### Styling System

**Approach**: Design system foundation with Material Design principles
- CSS custom properties for theming (light/dark modes)
- Tailwind utility classes for layout and spacing
- Component-level styling with class-variance-authority
- Responsive design with mobile-first approach

**Theme System**:
- HSL-based color system for easy theme variations
- CSS variables for dynamic theme switching
- Light and dark mode support via `.dark` class
- Elevation system using shadow-* utilities

**Typography**:
- Inter font family for clean, modern appearance
- Hierarchical font sizes for information architecture
- Right-aligned numerical displays for financial data

### Component Architecture

**Atomic Design Pattern**:
- UI primitives in `client/src/components/ui/`
- Page-level components in `client/src/pages/`
- Shared utilities in `client/src/lib/`

**Key Components**:
- **PlannerPage**: Main application interface with input forms and results
- **Charts**: Financial projection visualizations
- **Input Forms**: Property lists, mortgage parameters, investment settings
- **Results Display**: Capacity snapshots, year summaries, goal tracking

**Reusable Patterns**:
- Form inputs with Label + Input combinations
- Card containers for grouped information
- Button variants for different actions
- Badge components for status indicators

## External Dependencies

### Core Framework Dependencies
- **React** (^18.x): UI framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety and developer experience
- **Express**: Minimal backend server

### UI & Styling
- **@radix-ui/***: Headless accessible component primitives (accordion, dialog, dropdown, tooltip, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Type-safe component variants
- **clsx** / **tailwind-merge**: Conditional class name utilities

### Data Visualization
- **Chart.js**: Canvas-based charting library
- **react-chartjs-2**: React wrapper for Chart.js

### Data Management
- **@tanstack/react-query**: Async state management (configured but minimal usage)
- **Zod**: Schema validation and type inference
- **react-hook-form**: Form state management with validation

### Database (Configured but Unused)
- **Drizzle ORM**: TypeScript ORM for SQL databases
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **drizzle-kit**: Database migration tool

### Routing
- **Wouter**: Lightweight React router alternative

### Development Tools
- **@replit/vite-plugin-***: Replit-specific development plugins
- **tsx**: TypeScript execution for Node.js
- **esbuild**: Fast JavaScript bundler for server code

### Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation
- **lucide-react**: Icon library

**Note**: While database dependencies are present, they are not actively used in the current implementation. The application may be extended in the future to include user authentication and persistent storage of planning scenarios.