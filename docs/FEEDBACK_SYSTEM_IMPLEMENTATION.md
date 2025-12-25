# Feedback System Implementation Plan

## Overview

Система фідбеку дозволяє користувачам надсилати баг-репорти, запити на фічі та питання. Система автоматично збирає контекст (сторінка, девайс), використовує AI для валідації та модерації (через Windmill), і опціонально синхронізує з GitHub Issues.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FEEDBACK SYSTEM                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐       │
│  │   User Menu      │      │  Feedback Modal  │      │  Device Info     │       │
│  │   "Feedback"     │─────▶│  (Form + Upload) │◀─────│  Collector       │       │
│  └──────────────────┘      └────────┬─────────┘      └──────────────────┘       │
│                                     │                                            │
│                                     │ Submit                                     │
│                                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                          Supabase                                         │   │
│  │  ┌────────────┐    ┌────────────────┐    ┌─────────────────┐             │   │
│  │  │  feedback  │    │ feedback_votes │    │ feedback_comments│            │   │
│  │  │   table    │    │     table      │    │      table       │            │   │
│  │  └─────┬──────┘    └────────────────┘    └─────────────────┘             │   │
│  └────────┼─────────────────────────────────────────────────────────────────┘   │
│           │                                                                      │
│           │ Database trigger                                                     │
│           ▼                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  Windmill (Backend)                                                       │   │
│  │  - AI Validation (spam, category, priority)                               │   │
│  │  - Duplicate Detection                                                    │   │
│  │  - GitHub Sync                                                            │   │
│  │  - Auto-Reply for Questions                                               │   │
│  │  - Notifications                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Таблиця `feedback`

```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User info (nullable for anonymous feedback)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,

  -- Category (user selects)
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'question')),

  -- AI validation results (populated by Windmill)
  ai_suggested_category TEXT,
  ai_category_match BOOLEAN DEFAULT TRUE,
  ai_spam_score FLOAT DEFAULT 0,
  ai_priority_suggestion TEXT,

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Priority
  user_priority TEXT CHECK (user_priority IN ('low', 'medium', 'high')),
  final_priority TEXT CHECK (final_priority IN ('low', 'medium', 'high', 'critical')),

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'validated',
    'in_progress',
    'resolved',
    'closed',
    'spam'
  )),

  -- Context (auto-collected by frontend)
  entity_context JSONB,
  device_info JSONB,
  app_version TEXT,

  -- Attachments
  screenshot_urls TEXT[],

  -- GitHub sync (managed by Windmill)
  github_issue_url TEXT,
  github_issue_number INTEGER,
  github_synced_at TIMESTAMPTZ,

  -- Duplicate detection
  duplicate_of_id UUID REFERENCES feedback(id),
  similar_feedback_ids UUID[],

  -- Voting
  vote_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT
);
```

### Таблиця `feedback_votes`

```sql
CREATE TABLE feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(feedback_id, user_id)
);
```

### Таблиця `feedback_comments`

```sql
CREATE TABLE feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT FALSE,
  is_ai_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Device Info Collection

### Utility: `collectDeviceInfo.ts`

```typescript
export interface DeviceInfo {
  browser: {
    name: string;
    version: string;
    language: string;
  };
  os: {
    name: string;
    version: string;
  };
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  connection?: {
    type: string;
    downlink: number;
  };
  timezone: string;
  touchSupport: boolean;
  userAgent: string;
}

export function collectDeviceInfo(): DeviceInfo {
  // Parse browser, OS from navigator.userAgent
  // Collect screen/viewport dimensions
  // Check connection info if available
  return { ... };
}
```

### Utility: `collectEntityContext.ts`

```typescript
export interface EntityContext {
  type: string;        // 'breed', 'pet', 'kennel', 'contact'
  id: string;
  name: string;
  url: string;
  spaceId?: string;
}

export function collectEntityContext(): EntityContext | null {
  // Get current entity from spaceStore
  // Return null if not on entity page
  return { ... };
}
```

## Frontend Components

### Component Structure

```
apps/app/src/
├── components/
│   └── feedback/
│       ├── FeedbackModal.tsx           # Main form modal
│       ├── FeedbackButton.tsx          # Menu trigger button
│       ├── FeedbackList.tsx            # User's feedback history
│       ├── FeedbackDetail.tsx          # Single feedback view
│       ├── FeedbackCategorySelect.tsx  # Category radio buttons
│       ├── FeedbackPrioritySelect.tsx  # Priority selector
│       ├── FeedbackScreenshots.tsx     # Screenshot upload
│       ├── FeedbackContextInfo.tsx     # Shows collected context
│       └── index.ts
├── utils/
│   ├── collectDeviceInfo.ts
│   └── collectEntityContext.ts
└── stores/
    └── feedback-store.ts               # Signal-based store
```

### FeedbackModal UI

```
┌─────────────────────────────────────────────────────────────┐
│                     Send Feedback                        ✕  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Category:  ○ Bug  ○ Feature Request  ○ Question           │
│                                                             │
│  Title: ┌─────────────────────────────────────────────────┐ │
│         │ Short description of your feedback              │ │
│         └─────────────────────────────────────────────────┘ │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │ Detailed description...                                 ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Priority (optional):  ○ Low  ○ Medium  ○ High             │
│                                                             │
│  Screenshots:                                               │
│  ┌───────┐ ┌───────┐                                       │
│  │  📷   │ │  ➕   │  Drag & drop or click to add          │
│  └───────┘ └───────┘                                       │
│                                                             │
│  ℹ️ Context: German Shepherd breed page                     │
│  ℹ️ Device: Chrome 120 / macOS 14.1                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Submit Feedback]    │
└─────────────────────────────────────────────────────────────┘
```

### FeedbackList UI

```
┌─────────────────────────────────────────────────────────────┐
│  My Feedback                                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🐛 BUG  Navigation broken on mobile                     ││
│  │ Status: In Progress  •  Created: 2 days ago             ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✨ FEATURE  Add dark mode                      ▲ 12     ││
│  │ Status: Pending  •  Created: 1 week ago                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Database & Basic Form (MVP)

- [ ] Створити Supabase migration для `feedback` таблиці
- [ ] Створити RLS policies
- [ ] Імплементувати `collectDeviceInfo.ts`
- [ ] Імплементувати `collectEntityContext.ts`
- [ ] Створити `FeedbackModal` компонент
- [ ] Додати "Feedback" в user menu
- [ ] Базова відправка feedback в Supabase
- [ ] Toast notification про успішну відправку

### Phase 2: Screenshots & Attachments

- [ ] Налаштувати Supabase Storage bucket
- [ ] Імплементувати `FeedbackScreenshots` компонент
- [ ] Drag & drop upload
- [ ] Image preview
- [ ] Paste from clipboard support

### Phase 3: User Feedback History

- [ ] Створити `FeedbackList` компонент
- [ ] Створити `FeedbackDetail` компонент
- [ ] Додати сторінку "My Feedback" в user area
- [ ] Показувати статус та відповіді

### Phase 4: Voting & Comments

- [ ] Створити migrations для `feedback_votes` та `feedback_comments`
- [ ] Імплементувати upvote для feature requests
- [ ] Імплементувати comments UI

### Phase 5: Similar Feedback (UI)

- [ ] Показувати similar feedback при створенні
- [ ] Дозволити прикріпитись до existing feedback замість створення duplicate

## Integration Points

### User Menu

Додати пункт "Feedback" в user dropdown menu:

```tsx
// In UserMenu component
<DropdownMenuItem onClick={() => setFeedbackModalOpen(true)}>
  <MessageSquare className="mr-2 h-4 w-4" />
  Feedback
</DropdownMenuItem>
```

### Entity Pages (Bug Report Button)

На сторінках entity є кнопка "Report Bug" яка відкриває FeedbackModal з:
- `category` = 'bug'
- `entity_context` = поточна entity

```tsx
<Button variant="ghost" onClick={() => openFeedback({ category: 'bug' })}>
  <Bug className="mr-2 h-4 w-4" />
  Report Bug
</Button>
```

### Keyboard Shortcut (Optional)

```tsx
// Global shortcut: Cmd/Ctrl + Shift + F
useHotkeys('mod+shift+f', () => setFeedbackModalOpen(true));
```

## Backend Processing (Windmill)

### 1. `feedback_ai_validation` - AI Validation Workflow

**Trigger:** Database webhook on `feedback` INSERT

**Steps:**
1. Отримати новий feedback запис
2. Надіслати в AI (Claude) для аналізу:
   - Spam detection (score 0-1)
   - Category verification (bug/feature/question)
   - Priority suggestion
   - Duplicate search query generation
3. Оновити feedback запис з AI результатами
4. Якщо spam_score > 0.8 → status = 'spam'
5. Якщо категорія не співпадає → ai_category_match = false

```typescript
// Windmill script: feedback_ai_validation
import Anthropic from "@anthropic-ai/sdk";

type FeedbackInput = {
  id: string;
  category: string;
  title: string;
  description: string;
  entity_context: any;
};

export async function main(feedback: FeedbackInput) {
  const client = new Anthropic();

  const prompt = `Analyze this user feedback:

Category (selected by user): ${feedback.category}
Title: ${feedback.title}
Description: ${feedback.description}
Context: ${JSON.stringify(feedback.entity_context)}

Respond in JSON format:
{
  "spam_score": 0.0-1.0,
  "suggested_category": "bug" | "feature" | "question",
  "category_matches": true/false,
  "priority_suggestion": "low" | "medium" | "high" | "critical",
  "reasoning": "brief explanation",
  "search_keywords": ["keyword1", "keyword2"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const result = JSON.parse(response.content[0].text);

  // Update feedback in Supabase
  await supabase
    .from('feedback')
    .update({
      ai_suggested_category: result.suggested_category,
      ai_category_match: result.category_matches,
      ai_spam_score: result.spam_score,
      ai_priority_suggestion: result.priority_suggestion,
      status: result.spam_score > 0.8 ? 'spam' : 'validated',
    })
    .eq('id', feedback.id);

  return result;
}
```

### 2. `feedback_duplicate_check` - Duplicate Detection

**Trigger:** After AI validation completes

**Steps:**
1. Використати search_keywords з AI validation
2. Пошук в existing feedback за keywords + embedding similarity
3. Якщо знайдено схожі (similarity > 0.85):
   - Додати до similar_feedback_ids
   - Якщо дуже схожий (> 0.95) → запропонувати як duplicate

```typescript
// Windmill script: feedback_duplicate_check
export async function main(
  feedback_id: string,
  search_keywords: string[]
) {
  // Search in Supabase using full-text search
  const { data: similar } = await supabase
    .from('feedback')
    .select('id, title, description')
    .neq('id', feedback_id)
    .textSearch('title', search_keywords.join(' | '))
    .limit(5);

  // TODO: Add embedding-based similarity search for better results

  if (similar && similar.length > 0) {
    await supabase
      .from('feedback')
      .update({ similar_feedback_ids: similar.map(s => s.id) })
      .eq('id', feedback_id);
  }

  return { similar_count: similar?.length || 0 };
}
```

### 3. `feedback_github_sync` - GitHub Issues Sync

**Trigger:** Manual або scheduled для validated feedback

**Steps:**
1. Створити GitHub Issue через API
2. Зберегти github_issue_url та github_issue_number
3. Додати labels на основі category та priority

```typescript
// Windmill script: feedback_github_sync
import { Octokit } from "@octokit/rest";

export async function main(feedback_id: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Get feedback from Supabase
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('id', feedback_id)
    .single();

  if (!feedback || feedback.github_issue_url) {
    return { skipped: true };
  }

  // Create GitHub issue
  const issue = await octokit.issues.create({
    owner: 'your-org',
    repo: 'breedhub',
    title: `[${feedback.category.toUpperCase()}] ${feedback.title}`,
    body: formatIssueBody(feedback),
    labels: [
      feedback.category,
      feedback.final_priority || feedback.user_priority || 'triage',
    ],
  });

  // Update feedback with GitHub info
  await supabase
    .from('feedback')
    .update({
      github_issue_url: issue.data.html_url,
      github_issue_number: issue.data.number,
      github_synced_at: new Date().toISOString(),
    })
    .eq('id', feedback_id);

  return { issue_url: issue.data.html_url };
}

function formatIssueBody(feedback: any): string {
  return `
## Description
${feedback.description}

## Context
- **Category:** ${feedback.category}
- **Priority:** ${feedback.final_priority || feedback.user_priority || 'Not set'}
- **Entity:** ${feedback.entity_context?.type} - ${feedback.entity_context?.name}
- **URL:** ${feedback.entity_context?.url}

## Device Info
\`\`\`json
${JSON.stringify(feedback.device_info, null, 2)}
\`\`\`

## Screenshots
${feedback.screenshot_urls?.map((url: string) => `![Screenshot](${url})`).join('\n') || 'No screenshots'}

---
*Submitted via BreedHub Feedback System*
*Feedback ID: ${feedback.id}*
`;
}
```

### 4. `feedback_auto_reply` - Auto-Reply for Questions

**Trigger:** After AI validation, if category = 'question'

**Steps:**
1. Пошук відповіді в FAQ/documentation
2. Якщо знайдено → створити AI comment з відповіддю
3. Змінити status на 'resolved' якщо впевненість висока

```typescript
// Windmill script: feedback_auto_reply
export async function main(feedback_id: string) {
  const { data: feedback } = await supabase
    .from('feedback')
    .select('*')
    .eq('id', feedback_id)
    .single();

  if (feedback.category !== 'question') {
    return { skipped: true, reason: 'Not a question' };
  }

  // Search FAQ/docs for answer using AI
  const answer = await searchFAQWithAI(feedback.title, feedback.description);

  if (answer && answer.confidence > 0.8) {
    // Create auto-reply comment
    await supabase.from('feedback_comments').insert({
      feedback_id,
      content: answer.text,
      is_ai_reply: true,
    });

    // Update status
    await supabase
      .from('feedback')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', feedback_id);

    return { replied: true, confidence: answer.confidence };
  }

  return { replied: false, reason: 'No confident answer found' };
}
```

### 5. `feedback_notification` - Send Notifications

**Trigger:** On status changes (database trigger)

**Steps:**
1. Визначити тип notification на основі нового статусу
2. Створити запис в `notifications` таблиці
3. Користувач отримує real-time notification через existing notification system

```typescript
// Windmill script: feedback_notification
export async function main(
  feedback_id: string,
  old_status: string,
  new_status: string
) {
  const { data: feedback } = await supabase
    .from('feedback')
    .select('user_id, title')
    .eq('id', feedback_id)
    .single();

  if (!feedback.user_id) {
    return { skipped: true, reason: 'Anonymous feedback' };
  }

  const messages: Record<string, string> = {
    'validated': 'Your feedback has been received and is being reviewed',
    'in_progress': 'We started working on your feedback',
    'resolved': 'Your feedback has been resolved',
    'closed': 'Your feedback has been closed',
  };

  const message = messages[new_status];
  if (!message) return { skipped: true };

  await supabase.from('notifications').insert({
    user_id: feedback.user_id,
    type: 'feedback_update',
    title: `Feedback: ${feedback.title}`,
    message,
    data: { feedback_id, old_status, new_status },
  });

  return { notified: true };
}
```

### Windmill Flow: Main Feedback Processing

```
┌─────────────────┐
│  New Feedback   │
│  (DB Trigger)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Validation  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────────┐
│ Spam? │ │ Duplicate     │
│ Stop  │ │ Detection     │
└───────┘ └───────┬───────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌─────────────────┐
│ Auto-Reply      │ │ Notification    │
│ (if question)   │ │ (status change) │
└─────────────────┘ └─────────────────┘
```

## Security Considerations

1. **Rate Limiting** - обмежити кількість feedbacks на user/IP
2. **Content Sanitization** - очищати HTML в description
3. **File Validation** - валідувати тип та розмір screenshots (max 5MB, images only)
4. **RLS Policies** - users бачать тільки свої feedbacks

## Future Enhancements

1. **Public Roadmap** - показувати approved features публічно
2. **Changelog Integration** - лінкувати resolved feedbacks до changelog
3. **Advanced Analytics** - trends, sentiment analysis
