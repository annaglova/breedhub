# BreedHub Product Strategy

## Overview
BreedHub is a comprehensive platform for breeders, pet owners, clubs, and exhibition organizers. The platform consists of multiple specialized applications, each serving specific user needs while sharing a unified configuration and data layer.

## Applications Architecture

### 1. **app** - Main Breeder Application
**Status**: In Development  
**Purpose**: Core functionality for breeders and pet owners

**Features**:
- Animal management (pets, breeds, pedigrees)
- Messaging system
- User profiles
- Marketplace (integrated for now)
- Documents and certificates
- Health records

**Technical Notes**:
- React + TypeScript
- RxDB for local-first data
- Configuration-driven UI

### 2. **site** - Public Website
**Status**: Planned  
**Purpose**: Public-facing website for marketing and user acquisition

**Features**:
- Landing pages
- Service information
- Registration/Login
- Public breeder profiles
- SEO-optimized content
- Blog/Articles
- Pricing information

**Technical Considerations**:
- Consider Next.js for SEO
- Static generation where possible
- Fast loading times
- Mobile-first design

### 3. **club** - Club Management Application
**Status**: Planned  
**Purpose**: Tools for kennel clubs and breed organizations

**Features**:
- Member management
- Club pedigrees and registrations
- Certificate issuance
- Club rules and documentation
- Group accounts
- Events calendar
- Breed standards management

**Special Requirements**:
- Multi-user access with roles
- Document templates
- Bulk operations

### 4. **event** - Exhibition Management System
**Status**: Planned  
**Purpose**: Complete solution for dog shows and exhibitions

**Features**:
- Exhibition registration
- Schedule management
- Results tracking
- Judging system
- Catalogs generation
- Entry fees processing
- Venue management
- Awards and titles

**Technical Considerations**:
- Real-time updates during events
- Offline capability for venues with poor internet
- Print-friendly outputs

### 5. **market** - Marketplace Platform
**Status**: Future (currently integrated in app)  
**Purpose**: Dedicated marketplace for buying/selling pets and services

**Features**:
- Listings management
- Payment processing
- Buyer-seller chat
- Seller ratings and reviews
- Moderation system
- Escrow services
- Shipping coordination

**Migration Strategy**:
- Start within main app
- Extract when volume justifies
- Maintain backwards compatibility

## Configuration Strategy

### Current Approach
All applications share a unified configuration system through `app_config`:
- Single source of truth
- Configuration-driven UI components
- Hierarchical structure (app → workspace → space → view/page)

### User Configuration Structure
```
user_config
  └── menus
      └── user_menu_config (can be multiple for different contexts)
          └── sections
              └── items
```

This structure supports:
- Different menus for different applications
- Role-based menu configurations
- Context-specific navigation (mobile vs desktop)

### Future Considerations
- May introduce app-specific config types (e.g., `event_workspace`, `event_page`)
- Will evaluate after implementing 2-3 applications
- Following YAGNI principle - no premature optimization

## Development Priorities

### Phase 1 (Current) - Q1 2025
- Complete main **app** with core breeder features
- Implement Universal Store architecture
- Stabilize configuration system

### Phase 2 - Q2 2025
- Launch **site** for public presence
- Begin **club** development for early adopters

### Phase 3 - Q3 2025
- Release **club** application
- Start **event** development
- Evaluate **market** extraction

### Phase 4 - Q4 2025
- Launch **event** system
- Consider **market** as separate application

## Technical Principles

1. **Configuration-Driven Development**
   - UI components defined by configuration
   - No hardcoded business logic in components
   - Easy customization without code changes

2. **Local-First Architecture**
   - RxDB for offline capability
   - Sync with Supabase when online
   - Fast, responsive user experience

3. **Modular Architecture**
   - Shared packages (rxdb-store, ui-components)
   - Independent deployment of applications
   - Clear boundaries between applications

4. **Progressive Enhancement**
   - Start simple, add complexity as needed
   - Extract services when volume justifies
   - Maintain backwards compatibility

## Success Metrics

- User adoption rate
- Performance (< 100ms interactions)
- Offline capability
- Configuration flexibility
- Developer productivity
- Deployment frequency

## Notes

- Each application can have different deployment schedules
- Different teams can work on different applications
- Applications can use different technologies where appropriate
- Market remains in main app until transaction volume justifies separation

---

*Last Updated: January 2025*