export interface DashboardStats {
  concepts: number;
  payloads: number;
  secretLinks: number;
  teams: number;
}

export interface ActivityItem {
  type: 'concept' | 'payload';
  action: 'created' | 'updated';
  id: string;
  title: string;
  timestamp: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  teams: { id: string; name: string }[];
}
