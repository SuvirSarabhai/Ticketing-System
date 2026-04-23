# Support Ticketing System - User Guide

## 🎯 Overview

A comprehensive multi-department support ticketing system with AI-assisted form filling, urgency-based prioritization, rule-based assignment, and a clear MVP-to-V2 upgrade path.

## 🔐 Demo Accounts

All accounts use password: **password123**

- **Admin**: admin@acme.com
- **Agent**: agent@acme.com  
- **User**: user@acme.com

## 📋 MVP Features Implemented

### ✅ STEP 1 — LOGIN
- Email + password authentication
- Forgot password / reset flow (UI complete)
- Admin-invite only registration framework

### ✅ STEP 2 — DASHBOARD
- Comprehensive ticket list with status filters
- Statistics overview (open, in progress, resolved, closed)
- Search functionality across ticket numbers, titles, and descriptions
- Filter by status and urgency
- Role-based views:
  - **Users** see only their tickets
  - **Agents** see assigned tickets + unassigned tickets
  - **Admins** see all tickets

### ✅ STEP 3 — CONTEXT SELECTION
- Company selection (auto-filled if single org)
- Domain (Industry) selection
- Category (Department) selection
- Subcategory (Issue Type) selection with cascading filters

### ✅ STEP 4 — SET URGENCY
- 3-level urgency picker: Low / Medium / High
- Visual urgency indicators with descriptions
- Stored and used by assignment logic and SLA thresholds
- Fully mutable (can be escalated later)

### ✅ STEP 5 — ISSUE DESCRIPTION + AI FORM SUGGESTION
- **Description appears FIRST** (before the form)
- User types free-text issue description
- AI reads description + subcategory context
- AI auto-fills dynamic form fields based on input
- Suggestions displayed with **purple highlight and "AI Suggested" badge**
- All fields remain editable
- Visual distinction between user input and AI suggestions

**AI Capabilities:**
- Extracts version numbers, asset tags, employee IDs
- Identifies OS, device models, locations
- Detects issue types from keywords
- Pre-fills appropriate form fields

### ✅ STEP 6 — DYNAMIC FORM
- Form fields generated based on selected subcategory
- Examples:
  - **Software Bug** → version number, OS, steps to reproduce
  - **Payroll Issue** → employee ID, pay period, amount affected
  - **Hardware** → asset tag, location, device model
  - **Network** → location, device type, connection type
  - **Leave Request** → employee ID, leave type, dates
  - **Building Maintenance** → building, floor/room, issue type
- AI suggestions pre-fill fields
- User can review and correct before submitting

### ✅ STEP 7 — TICKET CREATION
- Ticket stored with all context, urgency, description, form data
- Unique ticket number generated (TKT-XXXX)
- Initial status = Open
- Timestamps tracked

### ✅ STEP 8 — ASSIGNMENT
**Two modes available:**

1. **Manual Assignment**
   - Admins/agents can manually assign tickets
   - Dropdown shows all available agents
   - Can reassign or unassign tickets

2. **Automatic Assignment**
   - Rule-based engine using urgency + category + subcategory
   - Configurable in Admin panel
   - Priority-based rule matching
   - Auto-assigns on ticket creation if rules match

### ✅ STEP 9 — WORKFLOW (IN PROGRESS)
- **Status transitions**: Open → Assigned → In Progress → Resolved → Closed
- **Agent ↔ User communication**:
  - Threaded comments with timestamps
  - User avatars and role badges
  - Real-time activity log
- All activity logged and visible
- Status can be updated by agents

### ✅ STEP 10 — RESOLUTION
- Agent marks ticket as Resolved
- Resolution time automatically calculated
- User receives prompt to confirm resolution
- **Configurable auto-close windows** per urgency level:
  - High urgency: 24 hours (configurable)
  - Medium urgency: 48 hours (configurable)
  - Low urgency: 72 hours (configurable)

### ✅ STEP 11 — TICKET CLOSED
- Final status stored
- Resolution time recorded
- Basic analytics available:
  - Resolution time tracking
  - Category/subcategory distribution
  - Status overview

## 🎨 User Interface Highlights

### Dashboard Features
- **Statistics Cards**: Quick overview of ticket counts
- **Advanced Filters**: Status, urgency, and full-text search
- **Responsive Table**: Shows all relevant ticket information
- **Role-based Controls**: Different actions for users vs agents

### Ticket Creation Wizard
- **5-step process** with progress indicator
- **Context selection** with cascading dropdowns
- **Visual urgency selection** with descriptive cards
- **AI-powered suggestions** with clear visual distinction
- **Review step** before submission

### Ticket Detail Page
- **Two-column layout**: Content + Sidebar
- **Activity feed** with comments and timestamps
- **Agent actions** (assign, update status, resolve)
- **User confirmation** for resolved tickets
- **Complete ticket metadata** display

### Admin Panel
- **Assignment Rules**: Configure automatic assignment
- **Auto-Close Settings**: Per-urgency timeframes
- **User Management**: View all users and roles
- **Tabbed interface** for easy navigation

## 🔧 Technical Implementation

### State Management
- **AuthContext**: User authentication and sessions
- **TicketContext**: Ticket CRUD operations and business logic
- **LocalStorage**: Persistent state across sessions

### AI Form Filling
- Pattern matching for common data types
- Keyword extraction from descriptions
- Context-aware suggestions based on subcategory
- Located in `/src/app/utils/ai-suggestions.ts`

### Assignment Rules Engine
- Priority-based rule matching
- Supports category, subcategory, and urgency criteria
- "Any" wildcard support for flexible rules

## 🚀 V2 Upgrade Path

**Features ready for V2 expansion:**

1. **Real Backend Integration**
   - Replace localStorage with Supabase/database
   - Add real-time subscriptions
   - File attachment storage

2. **Enhanced AI**
   - Replace mock AI with real LLM integration
   - Sentiment analysis for urgency detection
   - Auto-categorization

3. **SLA Monitoring**
   - Proactive breach alerts
   - SLA dashboards
   - Performance metrics

4. **Advanced Analytics**
   - Resolution time trends
   - Agent performance metrics
   - Category-wise analysis
   - Custom reports

5. **User Invitations**
   - Email-based invite system
   - Role assignment workflow
   - Onboarding flow

6. **Attachments**
   - File upload support
   - Image previews
   - Document management

7. **Notifications**
   - Email notifications
   - In-app notifications
   - Real-time updates

8. **Advanced Workflows**
   - Custom status workflows
   - Approval chains
   - Escalation paths

## 💡 Usage Tips

1. **Creating Your First Ticket**
   - Log in as user@acme.com
   - Click "New Ticket"
   - Fill in context, urgency, and description
   - Watch AI suggestions populate the form
   - Review and submit

2. **Managing Tickets as Agent**
   - Log in as agent@acme.com
   - View assigned tickets on dashboard
   - Click ticket to add comments
   - Update status and assign to yourself

3. **Configuring Assignment Rules**
   - Log in as admin@acme.com
   - Go to Admin → Assignment Rules
   - Add rules with priority ordering
   - Save configuration

4. **Testing AI Suggestions**
   Try these descriptions to see AI in action:
   - "The app version 2.1.5 crashes on Windows when I log in"
   - "My laptop LAP-0042 has a broken keyboard in Building A Floor 3"
   - "WiFi is slow in Meeting Room B on my laptop"
   - "Missing overtime payment of $500 for employee EMP-2891"

## 📊 Data Model

- **6 Categories** across 4 domains
- **6 Subcategories** with dynamic forms
- **5 Users** (1 admin, 2 agents, 2 regular users)
- **4 Sample tickets** showing different states
- **Configurable assignment rules**
- **Configurable auto-close timeframes**

## 🎯 Key Differentiators

1. **AI Form Assistance**: Reduces data entry errors
2. **Urgency-First Design**: Critical tickets get priority
3. **Rule-Based Assignment**: Automatic routing to right agents
4. **Visual Distinction**: AI suggestions clearly marked
5. **Role-Based Access**: Proper security and workflows
6. **Configurable SLAs**: Flexible auto-close windows
