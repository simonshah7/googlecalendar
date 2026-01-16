
export enum UserRole {
  USER = "User",
  MANAGER = "Manager",
  ADMIN = "Admin"
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Calendar {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  isTemplate: boolean;
}

export interface CalendarPermission {
  calendarId: string;
  userId: string;
  accessType: 'view' | 'edit' | 'copy';
}

export interface Campaign {
  id: string;
  name: string;
  calendarId: string; // Linked to calendar container
}

export interface Swimlane {
  id: string;
  name: string;
  budget?: number;
  calendarId: string; // Linked to calendar container
}

export interface ActivityType {
  id: string;
  name: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export enum CampaignStatus {
  Considering = "Considering",
  Negotiating = "Negotiating",
  Committed = "Committed",
}

export enum Currency {
  USD = "US$",
  GBP = "UK£",
  EUR = "EUR",
}

export enum Region {
  US = "US",
  EMEA = "EMEA",
  ROW = "ROW",
}

export interface Attachment {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'sheet' | 'image' | 'link';
  url: string;
}

export interface Activity {
  id: string;
  title: string;
  typeId: string;
  campaignId: string;
  swimlaneId: string;
  calendarId: string; // Linked to calendar container
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  description: string;
  tags: string;
  cost: number;
  currency: Currency;
  vendorId: string;
  expectedSAOs: number;
  actualSAOs: number;
  region: Region;
  dependencies?: string[];
  attachments?: Attachment[];
  color?: string; 
}
