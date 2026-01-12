# Site Builder for Breeders

> **Status**: Concept / Future Development
> **Priority**: After paid version launch
> **Target**: Provide breeders with easy-to-build professional websites

## Overview

A website constructor that allows breeders to create professional websites on subdomains (e.g., `my-kennel.breedhub.com`). Unlike generic site builders, this is tailored specifically for breeders with predefined blocks that pull data from the BreedHub database.

### Key Principles

1. **Predefined blocks** - Not granular configs, but cohesive units (Hero, Pets Gallery, Litters, etc.)
2. **Template-based with variations** - Users choose from layout variants, not build from scratch
3. **Drag & drop** - Reorder blocks within pages
4. **Theme system** - Color + font pairs with smart defaults
5. **NOT offline-first** - Standard web approach for public sites

## Architecture

### Site Config Schema

```typescript
interface SiteConfig {
  id: string;
  kennelId: string;              // Link to kennel/breeder account
  subdomain: string;             // "my-kennel" → my-kennel.breedhub.com
  customDomain?: string;         // Future: custom domain support

  // Theme
  theme: SiteTheme;

  // Layout
  header: HeaderConfig;
  footer: FooterConfig;

  // Content
  pages: SitePage[];

  // Meta
  seoDefaults: SEOConfig;

  // Status
  published: boolean;
  publishedAt?: Date;
  updatedAt: Date;
}

interface SiteTheme {
  // Primary color - user picks one, system generates palette
  primaryColor: string;          // e.g., "#3B82F6"

  // Color scheme
  colorScheme: 'light' | 'dark' | 'auto';

  // Font pair - predefined combinations
  fontPair: FontPairKey;

  // Optional overrides for advanced users
  customColors?: {
    accent?: string;
    background?: string;
    text?: string;
  };
}

type FontPairKey = 'classic' | 'modern' | 'elegant' | 'playful' | 'minimal';

interface HeaderConfig {
  variant: 'centered' | 'left-logo' | 'split' | 'minimal' | 'hamburger';
  showLogo: boolean;
  showNav: boolean;
  sticky: boolean;
  transparent: boolean;          // Transparent over hero
}

interface FooterConfig {
  variant: 'simple' | 'columns' | 'centered' | 'minimal';
  showSocial: boolean;
  showContact: boolean;
  showCopyright: boolean;
  customText?: string;
}

interface SitePage {
  id: string;
  slug: string;                  // "about", "puppies", "gallery"
  title: string;
  inNav: boolean;                // Show in navigation
  navOrder: number;
  blocks: PageBlock[];
  seo?: PageSEO;
}

interface PageBlock {
  id: string;
  type: BlockType;
  variant: string;               // Block-specific variant
  order: number;
  settings: BlockSettings;       // Block-specific settings
  hidden: boolean;
}

type BlockType =
  | 'hero'
  | 'about-text'
  | 'pets-gallery'
  | 'pet-spotlight'
  | 'litters-list'
  | 'litter-spotlight'
  | 'achievements'
  | 'testimonials'
  | 'contact-form'
  | 'contact-info'
  | 'map'
  | 'image-gallery'
  | 'video'
  | 'faq'
  | 'pricing'
  | 'cta';
```

### Font Pairs

Predefined font combinations that work well together:

```typescript
const FONT_PAIRS: Record<FontPairKey, { heading: string; body: string; description: string }> = {
  classic: {
    heading: 'Playfair Display',
    body: 'Source Sans Pro',
    description: 'Elegant serif headings with clean body text'
  },
  modern: {
    heading: 'Montserrat',
    body: 'Open Sans',
    description: 'Bold geometric headings, friendly body'
  },
  elegant: {
    heading: 'Cormorant Garamond',
    body: 'Lato',
    description: 'Refined serif headings, modern body'
  },
  playful: {
    heading: 'Poppins',
    body: 'Nunito',
    description: 'Rounded, friendly feel throughout'
  },
  minimal: {
    heading: 'Inter',
    body: 'Inter',
    description: 'Clean, professional, unified look'
  },
};
```

### Color Palette Generation

User selects ONE primary color, system generates full palette:

```typescript
function generatePalette(primaryHex: string): ColorPalette {
  const hsl = hexToHSL(primaryHex);

  return {
    // Primary variations
    primary: primaryHex,
    primaryLight: adjustLightness(hsl, +15),
    primaryLighter: adjustLightness(hsl, +30),
    primaryDark: adjustLightness(hsl, -15),
    primaryDarker: adjustLightness(hsl, -30),

    // Accent (complementary or analogous)
    accent: rotateHue(hsl, 180),        // Complementary
    accentAlt: rotateHue(hsl, 30),      // Analogous

    // Neutrals (slightly tinted with primary)
    background: '#ffffff',
    backgroundAlt: tintWithPrimary('#f9fafb', hsl, 0.02),
    surface: '#ffffff',
    surfaceAlt: tintWithPrimary('#f3f4f6', hsl, 0.03),

    // Text
    text: '#111827',
    textMuted: '#6b7280',
    textOnPrimary: getContrastColor(primaryHex),

    // Semantic
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',

    // Borders
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
  };
}
```

## Block Catalog

### Hero Block

The main banner/header section of a page.

**Variants:**
- `fullscreen` - Full viewport height with overlay
- `split` - Image on one side, text on other
- `centered` - Centered text over image
- `minimal` - Simple text, no image
- `video` - Background video

**Settings:**
```typescript
interface HeroSettings {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  overlay: 'none' | 'light' | 'dark' | 'gradient';
  ctaButton?: { text: string; link: string };
  ctaSecondary?: { text: string; link: string };
  height: 'full' | 'large' | 'medium' | 'small';
  textAlign: 'left' | 'center' | 'right';
}
```

### Pets Gallery Block

Display pets from the database.

**Variants:**
- `grid-3` - 3 columns grid
- `grid-4` - 4 columns grid
- `masonry` - Pinterest-style layout
- `carousel` - Horizontal slider
- `featured` - 1 large + smaller thumbnails

**Settings:**
```typescript
interface PetsGallerySettings {
  title?: string;
  subtitle?: string;
  filter: {
    status?: PetStatus[];        // Available, Reserved, Sold
    sex?: 'male' | 'female' | 'all';
    breed?: string;
  };
  limit?: number;
  showFilters: boolean;          // Let visitors filter
  cardStyle: 'minimal' | 'detailed' | 'overlay';
  linkTo: 'pet-page' | 'modal' | 'external';
}
```

### Litters Block

Display litters/puppies.

**Variants:**
- `cards` - Card layout
- `timeline` - Chronological timeline
- `featured` - Single featured litter
- `compact` - List view

**Settings:**
```typescript
interface LittersSettings {
  title?: string;
  filter: {
    status?: LitterStatus[];     // Planned, Born, Available
  };
  showParents: boolean;
  showPuppyCount: boolean;
  showPrice: boolean;
}
```

### Achievements Block

Display titles, awards, certifications.

**Variants:**
- `grid` - Icon grid
- `list` - Detailed list
- `timeline` - Achievement timeline
- `badges` - Badge/medal style

**Settings:**
```typescript
interface AchievementsSettings {
  title?: string;
  groupBy: 'none' | 'year' | 'type' | 'pet';
  showImages: boolean;
  limit?: number;
}
```

### About Block

Text content about the breeder/kennel.

**Variants:**
- `simple` - Just text
- `with-image` - Text + image side by side
- `with-stats` - Text + statistics (years, litters, etc.)
- `timeline` - History timeline

**Settings:**
```typescript
interface AboutSettings {
  title?: string;
  content: string;               // Rich text
  image?: string;
  imagePosition: 'left' | 'right';
  stats?: { label: string; value: string }[];
}
```

### Contact Block

Contact information and/or form.

**Variants:**
- `form-only` - Just the contact form
- `info-only` - Just contact details
- `split` - Form + info side by side
- `card` - Compact card style

**Settings:**
```typescript
interface ContactSettings {
  title?: string;
  showForm: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showSocial: boolean;
  formFields: ('name' | 'email' | 'phone' | 'message' | 'petInterest')[];
}
```

### Map Block

Location map.

**Variants:**
- `full-width` - Full width map
- `with-info` - Map + address card
- `minimal` - Small embedded map

**Settings:**
```typescript
interface MapSettings {
  showExactLocation: boolean;    // Or just city/region
  height: 'small' | 'medium' | 'large';
  style: 'standard' | 'satellite' | 'minimal';
}
```

### Testimonials Block

Customer reviews/testimonials.

**Variants:**
- `carousel` - Sliding testimonials
- `grid` - Grid of cards
- `featured` - One large testimonial
- `masonry` - Mixed sizes

**Settings:**
```typescript
interface TestimonialsSettings {
  title?: string;
  autoPlay: boolean;
  showPhotos: boolean;
  showRating: boolean;
}
```

## Editor UI

### Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  Logo   [Pages ▼]  [Theme]  [Settings]           [Preview]  [Publish]│
├─────────────────┬────────────────────────────────────────────────────┤
│                 │                                                    │
│  BLOCKS         │              CANVAS                                │
│  ───────────    │  ┌──────────────────────────────────────────────┐  │
│                 │  │ ┌────────────────────────────────────────┐   │  │
│  + Hero         │  │ │  HEADER [variant: centered]     [⚙️]  │   │  │
│  + About        │  │ └────────────────────────────────────────┘   │  │
│  + Pets         │  │                                              │  │
│  + Litters      │  │ ┌────────────────────────────────────────┐   │  │
│  + Achievements │  │ │  ≡ HERO BLOCK                  [⚙️][🗑️]│   │  │
│  + Testimonials │  │ │    variant: fullscreen                 │   │  │
│  + Contact      │  │ │    [drag to reorder]                   │   │  │
│  + Map          │  │ └────────────────────────────────────────┘   │  │
│  + Gallery      │  │                                              │  │
│  + Video        │  │ ┌────────────────────────────────────────┐   │  │
│  + FAQ          │  │ │  ≡ PETS GALLERY               [⚙️][🗑️]│   │  │
│  + CTA          │  │ │    variant: grid-3                     │   │  │
│                 │  │ └────────────────────────────────────────┘   │  │
│                 │  │                                              │  │
│                 │  │        [+ Add Block]                         │  │
│                 │  │                                              │  │
│                 │  │ ┌────────────────────────────────────────┐   │  │
│                 │  │ │  FOOTER [variant: columns]      [⚙️]  │   │  │
│                 │  │ └────────────────────────────────────────┘   │  │
│                 │  └──────────────────────────────────────────────┘  │
├─────────────────┴────────────────────────────────────────────────────┤
│  BLOCK SETTINGS (when block selected)                                │
│  ────────────────────────────────────────────────────────────────    │
│  Variant: [fullscreen ▼]  Height: [large ▼]  Overlay: [dark ▼]      │
│  Title: [________________________]                                   │
│  Subtitle: [________________________]                                │
│  Background: [Choose Image]                                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Theme Panel

```
┌─────────────────────────────────────┐
│  THEME                              │
│  ─────                              │
│                                     │
│  Primary Color                      │
│  ┌─────────────────────────────┐   │
│  │ [####] #3B82F6    [picker]  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Preview:                           │
│  ■ Primary  ■ Light  ■ Dark        │
│  ■ Accent   ■ Text   ■ Muted       │
│                                     │
│  Font Pair                          │
│  ○ Classic (Playfair + Source)     │
│  ● Modern (Montserrat + Open Sans) │
│  ○ Elegant (Cormorant + Lato)      │
│  ○ Playful (Poppins + Nunito)      │
│  ○ Minimal (Inter)                  │
│                                     │
│  Color Scheme                       │
│  ○ Light  ● Auto  ○ Dark           │
│                                     │
└─────────────────────────────────────┘
```

### Pages Panel

```
┌─────────────────────────────────────┐
│  PAGES                    [+ Add]   │
│  ─────                              │
│                                     │
│  ≡ Home             ★ [Edit] [⚙️]  │
│  ≡ Our Dogs           [Edit] [⚙️]  │
│  ≡ Available Puppies  [Edit] [⚙️]  │
│  ≡ About Us           [Edit] [⚙️]  │
│  ≡ Contact            [Edit] [⚙️]  │
│                                     │
│  ★ = Homepage                       │
│  Drag to reorder navigation         │
│                                     │
└─────────────────────────────────────┘
```

## Technical Implementation

### Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE                               │
│  *.breedhub.com → Wildcard SSL                              │
│  DNS: *.breedhub.com → Origin Server                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     ORIGIN SERVER                            │
│                                                              │
│  Request: my-kennel.breedhub.com                            │
│     │                                                        │
│     ▼                                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Subdomain Router                                    │    │
│  │  - Extract subdomain from Host header               │    │
│  │  - Lookup site_config by subdomain                  │    │
│  │  - If found → render site                           │    │
│  │  - If not → 404 or redirect to main site           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Database Tables

```sql
-- Site configuration
CREATE TABLE breeder_site (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kennel_id UUID REFERENCES kennel(id),
  subdomain VARCHAR(63) UNIQUE NOT NULL,
  custom_domain VARCHAR(255) UNIQUE,

  -- Theme
  theme JSONB NOT NULL DEFAULT '{}',

  -- Structure
  header JSONB NOT NULL DEFAULT '{}',
  footer JSONB NOT NULL DEFAULT '{}',

  -- SEO defaults
  seo_defaults JSONB DEFAULT '{}',

  -- Status
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Pages within a site
CREATE TABLE breeder_site_page (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES breeder_site(id) ON DELETE CASCADE,

  slug VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,

  in_nav BOOLEAN DEFAULT true,
  nav_order INT DEFAULT 0,
  is_homepage BOOLEAN DEFAULT false,

  seo JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(site_id, slug)
);

-- Blocks within a page
CREATE TABLE breeder_site_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES breeder_site_page(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  variant VARCHAR(50) NOT NULL,
  order_index INT NOT NULL,

  settings JSONB NOT NULL DEFAULT '{}',
  hidden BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Testimonials (user-entered content)
CREATE TABLE breeder_site_testimonial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES breeder_site(id) ON DELETE CASCADE,

  author_name VARCHAR(100) NOT NULL,
  author_photo_url TEXT,
  content TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),

  pet_id UUID REFERENCES pet(id),  -- Optional link to pet they bought

  approved BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_breeder_site_subdomain ON breeder_site(subdomain);
CREATE INDEX idx_breeder_site_custom_domain ON breeder_site(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_breeder_site_page_site ON breeder_site_page(site_id);
CREATE INDEX idx_breeder_site_block_page ON breeder_site_block(page_id);
```

### Tech Stack

- **Drag & Drop**: `@dnd-kit/core` + `@dnd-kit/sortable`
- **Color Picker**: `react-colorful` (lightweight)
- **Rich Text**: `@tiptap/react` (for about text, etc.)
- **Rendering**: Server-side or static generation for public sites
- **SSL**: Let's Encrypt wildcard certificate via Cloudflare
- **CDN**: Cloudflare for caching public sites

## Development Phases

### Phase 1: Foundation
- [ ] Database schema for sites
- [ ] Subdomain routing
- [ ] Basic site renderer (read config → render HTML)
- [ ] 3-4 basic blocks (Hero, About, Pets, Contact)
- [ ] Single theme, no customization

### Phase 2: Editor MVP
- [ ] Editor UI shell
- [ ] Page management (add/remove/reorder)
- [ ] Block library panel
- [ ] Drag & drop block reordering
- [ ] Block settings panel
- [ ] Save/publish flow

### Phase 3: Customization
- [ ] Theme panel (color picker)
- [ ] Font pair selection
- [ ] Header/footer variants
- [ ] Block variants
- [ ] Preview mode (desktop/tablet/mobile)

### Phase 4: Advanced Blocks
- [ ] All remaining block types
- [ ] Testimonials with moderation
- [ ] Image gallery with upload
- [ ] Video embed
- [ ] FAQ accordion
- [ ] Map integration

### Phase 5: Production Polish
- [ ] Wildcard SSL setup
- [ ] SEO optimization (meta, sitemap, og-tags)
- [ ] Performance optimization
- [ ] Analytics integration
- [ ] Custom domain support

## Inspiration & References

- **Nicepage** - Block-based, variant approach
- **Wix** - Drag & drop, templates
- **Tilda** - Clean blocks, typography focus
- **Squarespace** - Design quality, limited but polished options
- **Carrd** - Simple, single-page focus

## Open Questions

1. **Pricing model**: Include in premium? Separate add-on? Per-site fee?
2. **Storage**: Where to store uploaded images? (Supabase storage, S3, Cloudflare R2)
3. **Analytics**: Built-in basic stats or integrate Google Analytics?
4. **Forms**: Where do contact form submissions go? Email? Dashboard?
5. **Custom domains**: Support from launch or add later?
6. **Multi-language**: Support for translated content?

---

*Document created: January 2026*
*Last updated: January 2026*
