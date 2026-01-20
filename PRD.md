# CampaignOS - Product Requirements Document (PRD)

## Overview

**Product Name:** CampaignOS
**Purpose:** Multi-tenant marketing campaign management and planning platform
**Target Users:** Marketing teams, campaign managers, and executives

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon Serverless), Drizzle ORM
- **Authentication:** JWT with httpOnly cookies, bcrypt password hashing

---

## 1. User Roles & Permissions

### Roles

| Role | Description |
|------|-------------|
| **User** | Standard user - can only access own calendars and calendars shared with them |
| **Manager** | Can view and manage ALL calendars in the system |
| **Admin** | Full system access including user management |

### Permission Types

**Calendar Permissions:**
- `view` - Read-only access
- `edit` - Can create, modify, delete activities

**Campaign Permissions:**
- `view` - Read-only access to campaign activities
- `edit` - Can modify campaign content

---

## 2. Data Models

### 2.1 Users
```
- id: UUID (auto-generated)
- email: string (unique, required)
- name: string (required)
- passwordHash: string (bcrypt)
- role: enum (User, Manager, Admin) - default: User
- avatarUrl: string (optional)
- createdAt, updatedAt: timestamp
```

### 2.2 Calendars (Workspaces)
```
- id: UUID (auto-generated)
- name: string (required)
- ownerId: UUID -> Users (required)
- isTemplate: boolean - default: false
- createdAt, updatedAt: timestamp
```
**On create:** Auto-create 3 default swimlanes: "Content Marketing", "Events", "Digital Campaigns"

### 2.3 Swimlanes
```
- id: UUID (auto-generated)
- name: string (required)
- budget: decimal (optional) - for budget tracking
- calendarId: UUID -> Calendars (required, cascade delete)
- sortOrder: number - for ordering
- createdAt: timestamp
```

### 2.4 Campaigns
```
- id: UUID (auto-generated)
- name: string (required)
- calendarId: UUID -> Calendars (required, cascade delete)
- createdAt: timestamp
```

### 2.5 Activities (Core Entity)
```
Required Fields:
- id: UUID (auto-generated)
- title: string (required)
- swimlaneId: UUID -> Swimlanes (required, cascade delete)
- calendarId: UUID -> Calendars (required, cascade delete)
- startDate: string YYYY-MM-DD (required)
- endDate: string YYYY-MM-DD (required)
- status: enum (Considering, Negotiating, Committed) - default: Considering

Optional Fields:
- typeId: UUID -> ActivityTypes
- campaignId: UUID -> Campaigns
- vendorId: UUID -> Vendors
- description: text
- tags: string (comma-separated)
- cost: decimal - default: 0
- currency: enum (US$, UK£, EUR) - default: US$
- expectedSAOs: decimal - default: 0
- actualSAOs: decimal - default: 0
- region: enum (US, EMEA, ROW) - default: US
- dependencies: UUID[] (JSON array of activity IDs)
- attachments: JSON[] ({id, name, type, url})
- color: string (hex color for custom styling)
- slackChannel: string
- outline: text (multi-line notes)
- inlineComments: JSON[] ({id, content, authorName, authorId, createdAt})

Recurrence Fields:
- recurrenceFrequency: enum (none, daily, weekly, biweekly, monthly, quarterly, yearly)
- recurrenceEndDate: string YYYY-MM-DD
- recurrenceCount: number
- parentActivityId: UUID (for recurring instances)
- isRecurrenceParent: boolean

Timestamps:
- createdAt, updatedAt: timestamp
```

### 2.6 Activity Types (Global)
```
- id: UUID (auto-generated)
- name: string (required)
- createdAt: timestamp
```
**Defaults:** Webinar, Report, Event, Tool Launch, ABM

### 2.7 Vendors (Global)
```
- id: UUID (auto-generated)
- name: string (required)
- createdAt: timestamp
```
**Defaults:** Gartner, Forrester, LinkedIn

### 2.8 Calendar Permissions
```
- id: UUID (auto-generated)
- calendarId: UUID -> Calendars (cascade delete)
- userId: UUID -> Users (cascade delete)
- accessType: enum (view, edit)
```

### 2.9 Campaign Permissions
```
- id: UUID (auto-generated)
- campaignId: UUID -> Campaigns (cascade delete)
- userId: UUID -> Users (cascade delete)
- accessType: enum (view, edit)
- invitedBy: UUID -> Users
- createdAt, updatedAt: timestamp
```

### 2.10 Activity Comments
```
- id: UUID (auto-generated)
- activityId: UUID -> Activities (cascade delete)
- userId: UUID -> Users (cascade delete)
- content: text (required)
- createdAt, updatedAt: timestamp
```

### 2.11 Notifications
```
- id: UUID (auto-generated)
- userId: UUID -> Users (cascade delete)
- type: enum (calendar_invite, campaign_invite, comment_added, activity_created, activity_updated, permission_changed)
- title: string
- message: string
- relatedType: enum (calendar, campaign, activity, comment)
- relatedId: UUID
- read: boolean - default: false
- createdAt: timestamp
```

---

## 3. Features

### 3.1 Authentication
- User registration with email/password
- Login with JWT token (stored in httpOnly cookie)
- Logout (clear cookie)
- Get current user from token
- Password hashing with bcrypt

### 3.2 Calendar/Workspace Management
- Create new calendar (auto-creates default swimlanes)
- List calendars user can access (owned + shared + all if Manager/Admin)
- Update calendar name
- Delete calendar (cascade deletes all content)
- Switch between calendars

### 3.3 Swimlane Management
- Create swimlane with name
- Update swimlane name and budget
- Delete swimlane (cascade deletes activities)
- Reorder swimlanes (drag-and-drop)
- Budget tracking (sum of activity costs vs budget)

### 3.4 Campaign Management
- Create campaign within calendar
- Update campaign name
- Delete campaign
- Group activities by campaign

### 3.5 Activity Management
- **Create:** Quick-add from timeline click OR full modal form
- **Read:** List activities by calendar, filter by campaign/status/date
- **Update:** Edit all fields, drag to change dates/swimlane
- **Delete:** Single or bulk delete
- **Duplicate:** Copy activity with "(Copy)" suffix
- **Bulk Operations:**
  - Bulk delete
  - Bulk status change
  - Bulk swimlane change
  - Bulk campaign change
  - Bulk region change

### 3.6 Views

#### Timeline View (Primary)
- Gantt-style horizontal timeline
- Year view with month columns
- Swimlanes as rows
- Activities as colored bars
- Today line indicator
- Drag-and-drop: move activities, resize dates
- Quick-add: click on timeline to create activity
- Card profiles: Compact (32px), Detailed (68px), Print (84px)
- Zoom controls (4px to 30px per day)

#### Calendar View
- Month-based grid calendar
- Activities shown on their dates
- Click to view/edit activity

#### Table View
- Spreadsheet-style data table
- All activity fields as columns
- Sort by any column
- Bulk selection with checkboxes

### 3.7 Filtering & Search
- Search by title/description
- Filter by campaign
- Filter by status (Considering, Negotiating, Committed)
- Filter by date range
- Combined filters

### 3.8 Sharing & Collaboration

#### Calendar Sharing
- Share calendar by email address
- Set permission level (view/edit)
- Remove permissions
- View list of users with access

#### Campaign Sharing
- Share specific campaign by email
- Campaign permissions are additive to calendar permissions

#### Comments
- Add comments to activities
- View comment thread
- Edit/delete own comments

#### Notifications
- Receive notifications for:
  - Calendar invites
  - Campaign invites
  - New comments
  - Activity updates
- Mark as read (single or all)
- Delete notifications
- Unread count badge

### 3.9 Export
- Export to CSV (activity data)
- Export to PNG (timeline screenshot)
- Filter by time period (monthly, quarterly, custom dates)

### 3.10 Card Display Customization
- Built-in profiles: Compact, Detailed, Print
- Custom profile creation
- Configurable fields: title, region, status, cost, dates
- Font size: xs, sm, base, lg
- Font weight: normal, bold, black
- Uppercase option
- Card height: 32px to 84px

### 3.11 Manager Dashboard (Manager/Admin only)
- View all system calendars
- User management
- System overview

### 3.12 Keyboard Shortcuts
- `1` - Timeline view
- `2` - Calendar view
- `3` - Table view
- `N` - New activity
- `E` - Export
- `D` - Toggle dark mode
- `?` - Help
- `Escape` - Close modal

---

## 4. API Endpoints

### Authentication
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login
GET  /api/auth/me          - Get current user
DELETE /api/auth/me        - Logout
```

### Calendars
```
GET    /api/calendars         - List accessible calendars
POST   /api/calendars         - Create calendar
GET    /api/calendars/[id]    - Get calendar with activities, swimlanes, campaigns
PUT    /api/calendars/[id]    - Update calendar
DELETE /api/calendars/[id]    - Delete calendar
```

### Activities
```
GET    /api/activities        - List activities (filter by calendarId)
POST   /api/activities        - Create activity
GET    /api/activities/[id]   - Get activity details
PUT    /api/activities/[id]   - Update activity
DELETE /api/activities/[id]   - Delete activity
POST   /api/activities/bulk   - Bulk operations
```

### Swimlanes
```
GET    /api/swimlanes         - List swimlanes
POST   /api/swimlanes         - Create swimlane
PUT    /api/swimlanes         - Update swimlane
DELETE /api/swimlanes?id=     - Delete swimlane
```

### Campaigns
```
GET    /api/campaigns         - List campaigns
POST   /api/campaigns         - Create campaign
PUT    /api/campaigns         - Update campaign
DELETE /api/campaigns?id=     - Delete campaign
```

### Activity Types
```
GET    /api/activity-types    - List types
POST   /api/activity-types    - Create type
PUT    /api/activity-types    - Update type
DELETE /api/activity-types?id= - Delete type
```

### Vendors
```
GET    /api/vendors           - List vendors
POST   /api/vendors           - Create vendor
PUT    /api/vendors           - Update vendor
DELETE /api/vendors?id=       - Delete vendor
```

### Comments
```
GET    /api/activity-comments?activityId=  - Get comments
POST   /api/activity-comments              - Add comment
PUT    /api/activity-comments              - Update comment
DELETE /api/activity-comments?id=          - Delete comment
```

### Permissions
```
GET    /api/calendar-permissions?calendarId=  - List permissions
POST   /api/calendar-permissions              - Add permission
DELETE /api/calendar-permissions?id=          - Remove permission

GET    /api/campaign-permissions?campaignId=  - List permissions
POST   /api/campaign-permissions              - Add permission
DELETE /api/campaign-permissions?id=          - Remove permission
```

### Notifications
```
GET    /api/notifications?limit=&unreadOnly=  - Get notifications
PUT    /api/notifications                     - Mark as read
DELETE /api/notifications?id=                 - Delete notification
```

### Users
```
GET    /api/users             - List all users (Manager/Admin only)
PUT    /api/users             - Update user role (Admin only)
PUT    /api/users/profile     - Update own profile
```

### Health Check
```
GET    /api/health            - Database connectivity check
```

---

## 5. UI Components

### Layout
- **Header** - Logo, view tabs, export, dark mode toggle, create button, user menu
- **FilterControls** - Search, campaign filter, status filter, date range
- **Main Content Area** - Timeline/Calendar/Table view

### Modals
- **ActivityModal** - Create/edit activity with all fields
- **CalendarSettingsModal** - Manage calendar permissions
- **CampaignShareModal** - Share campaign with users
- **ExportModal** - Export settings
- **WorkspaceSwitcher** - Switch/create calendars
- **ManagerDashboard** - Admin panel
- **UserProfileModal** - User profile
- **KeyboardShortcutsHelp** - Keyboard shortcuts reference

### Timeline Components
- **ActivityBar** - Individual activity on timeline
- **SwimlaneRow** - Horizontal lane with activities
- **MonthHeader** - Month columns
- **TodayLine** - Current date indicator
- **CardStylePanel** - Display customization

---

## 6. Validation Rules

### Activity Creation
- Title: Required, non-empty
- SwimlaneId: Required, must exist in calendar
- CalendarId: Required, must exist
- StartDate: Required, YYYY-MM-DD format
- EndDate: Required, YYYY-MM-DD format, >= startDate
- TypeId, CampaignId, VendorId: If provided, must be valid UUIDs

### Date Format
- All dates: YYYY-MM-DD (ISO format)

### Authorization
- All API calls require authentication (except auth endpoints)
- Calendar operations require ownership or permission
- Activity operations require calendar edit permission
- Manager/Admin can access all calendars

---

## 7. Environment Variables

```
DATABASE_URL=        # Neon PostgreSQL connection string
AUTH_SECRET=         # JWT signing secret (random string)
E2E_TEST_SECRET=     # For E2E testing (optional)
```

---

## 8. Error Handling

All API errors return JSON:
```json
{
  "error": "Human-readable error message"
}
```

Status codes:
- 200: Success
- 201: Created
- 400: Bad request (validation error)
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error

---

## 9. Future Enhancements (Not Implemented)

- Calendar templates (duplicate calendar structure)
- Real-time collaboration (WebSocket)
- Advanced analytics dashboard
- Mobile app
- Recurring activity instance management
- Activity history/audit log UI
- Undo/redo functionality

---

## 10. Color Scheme

### Status Colors
- **Considering:** Blue (#3B82F6)
- **Negotiating:** Amber (#F59E0B)
- **Committed:** Green (#10B981)

### Swimlane Colors (Auto-assigned)
- Sky, Amber, Rose, Violet, Emerald, Orange, Cyan, Pink, Lime, Indigo

### Theme
- Light mode: White background, gray borders
- Dark mode: Dark blue background (#0B0E14), subtle borders
