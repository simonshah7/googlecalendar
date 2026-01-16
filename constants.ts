
import { Activity, Campaign, ActivityType, CampaignStatus, Swimlane, Vendor, Currency, Region } from './types';

// Add missing calendarId to satisfy Campaign interface
export const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 'btbl', name: 'Beyond the BlackLine', calendarId: 'cal1' },
  { id: 'em', name: 'Efficiency Mirage', calendarId: 'cal1' },
  { id: 'hc', name: 'Hidden Costs', calendarId: 'cal1' },
  { id: 'coc', name: 'Close on Command', calendarId: 'cal1' },
];

// Add missing calendarId to satisfy Swimlane interface
export const INITIAL_SWIMLANES: Swimlane[] = [
  { id: 'content', name: 'Content & Launches', budget: 40000, calendarId: 'cal1' },
  { id: 'events', name: 'Events & Webinars', budget: 15000, calendarId: 'cal1' },
  { id: 'abm', name: 'ABM Campaigns', budget: 50000, calendarId: 'cal1' },
];

export const INITIAL_ACTIVITY_TYPES: ActivityType[] = [
  { id: 'webinar', name: 'Webinar' },
  { id: 'report', name: 'Report' },
  { id: 'event', name: 'Event' },
  { id: 'tool-launch', name: 'Tool Launch' },
  { id: 'abm', name: 'ABM' },
];

export const INITIAL_VENDORS: Vendor[] = [
  { id: 'gartner', name: 'Gartner' },
  { id: 'forrester', name: 'Forrester' },
  { id: 'linkedin', name: 'LinkedIn' },
];


// Add missing calendarId to satisfy Activity interface
export const INITIAL_ACTIVITIES: Activity[] = [
  {
    "id": "1",
    "title": "Beyond the BlackLine Research Launch",
    "typeId": "report",
    "campaignId": "btbl",
    "swimlaneId": "content",
    "calendarId": "cal1",
    "startDate": "2025-03-01",
    "endDate": "2025-03-15",
    "status": CampaignStatus.Negotiating,
    "description": "Research report launch showcasing inefficiencies in the close.",
    "tags": "research, awareness, R2R",
    "cost": 15000.00,
    "currency": Currency.USD,
    "vendorId": "forrester",
    "expectedSAOs": 25.0,
    "actualSAOs": 0.0,
    "region": Region.US,
    "dependencies": [],
    "color": "#99f6e4"
  },
  {
    "id": "2",
    "title": "Hidden Costs Webinar Series",
    "typeId": "webinar",
    "campaignId": "hc",
    "swimlaneId": "events",
    "calendarId": "cal1",
    "startDate": "2025-04-10",
    "endDate": "2025-04-10",
    "status": CampaignStatus.Considering,
    "description": "Interactive session exploring cost of manual close processes.",
    "tags": "webinar, leadgen",
    "cost": 5000.00,
    "currency": Currency.USD,
    "vendorId": "linkedin",
    "expectedSAOs": 50.0,
    "actualSAOs": 0.0,
    "region": Region.EMEA,
    "dependencies": ["1"],
    "color": "#e9d5ff"
  },
  {
    "id": "3",
    "title": "Efficiency Mirage ABM Launch",
    "typeId": "abm",
    "campaignId": "em",
    "swimlaneId": "abm",
    "calendarId": "cal1",
    "startDate": "2025-06-01",
    "endDate": "2025-07-15",
    "status": CampaignStatus.Committed,
    "description": "Targeted ABM activation highlighting fragmented close processes.",
    "tags": "abm, personalization",
    "cost": 25000.00,
    "currency": Currency.EUR,
    "vendorId": "gartner",
    "expectedSAOs": 10.5,
    "actualSAOs": 0.0,
    "region": Region.ROW,
    "dependencies": [],
    "color": "#fed7aa"
  },
  {
    "id": "4",
    "title": "Close on Command Tool Launch",
    "typeId": "tool-launch",
    "campaignId": "coc",
    "swimlaneId": "content",
    "calendarId": "cal1",
    "startDate": "2025-06-20",
    "endDate": "2025-06-30",
    "status": CampaignStatus.Committed,
    "description": "Launch of our new automated reconciliation tool.",
    "tags": "tool, product launch, automation",
    "cost": 0.00,
    "currency": Currency.USD,
    "vendorId": "linkedin",
    "expectedSAOs": 0.0,
    "actualSAOs": 0.0,
    "region": Region.US,
    "dependencies": ["1"],
    "color": "#99f6e4"
  }
];

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  [CampaignStatus.Considering]: 'bg-blue-100 border-blue-500 text-blue-800',
  [CampaignStatus.Negotiating]: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  [CampaignStatus.Committed]: 'bg-green-100 border-green-500 text-green-800',
};

export const SWIMLANE_COLORS: string[] = [
  'bg-teal-100 border-teal-500 text-teal-800',
  'bg-purple-100 border-purple-500 text-purple-800',
  'bg-pink-100 border-pink-500 text-pink-800',
  'bg-orange-100 border-orange-500 text-orange-800',
  'bg-cyan-100 border-cyan-500 text-cyan-800',
];

export const LIGHT_SWIMLANE_COLORS: string[] = [
  'bg-teal-200 border-teal-400 text-teal-800',
  'bg-purple-200 border-purple-400 text-purple-800',
  'bg-pink-200 border-pink-400 text-pink-800',
  'bg-orange-200 border-orange-400 text-orange-800',
  'bg-cyan-200 border-cyan-400 text-cyan-800',
];
