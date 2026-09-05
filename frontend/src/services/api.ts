export const API_BASE_URL = 'http://localhost:5000/api';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'donor' | 'hospital' | 'admin';
  status: 'active' | 'blocked' | 'pending';
  created_at: string;
}

export interface DonorProfile {
  id: number;
  user_id: number;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  location: string;
  district: string;
  state: string;
  last_donation_date: string | null;
  availability_status: 'AVAILABLE' | 'UNAVAILABLE';
  eligibility_status: 'ELIGIBLE' | 'NOT_CURRENTLY_ELIGIBLE' | 'PENDING_VERIFICATION';
  response_rate: number;
  average_response_time: number;
}

export interface DonorBehavior {
  requests_received: number;
  requests_responded: number;
  requests_accepted: number;
  average_response_time: number;
  successful_donations: number;
}

export interface Hospital {
  id: number;
  user_id: number;
  hospital_name: string;
  location: string;
  district: string;
  registration_no: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface BloodRequest {
  id: number;
  reference_no: string;
  requester_id: number;
  hospital_name: string;
  hospital_location: string;
  hospital_district: string;
  blood_group_needed: string;
  units_required: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFICATION' | 'ACTIVE' | 'MATCHING' | 'DONOR_RESPONSES' | 'POTENTIAL_MATCHES' | 'FULFILLED' | 'CLOSED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  escalation_round: number;
  required_by: string | null;
  notes: string | null;
  created_at: string;
  stats?: {
    total_responses: number;
    accepted_count: number;
    declined_count: number;
    verified_count: number;
  };
}

export interface DonorResponseItem {
  response_id: number;
  request_id: number;
  donor_id: number;
  donor_name: string;
  donor_phone: string;
  donor_blood_group: string;
  donor_location: string;
  donor_district: string;
  response: 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  response_time_seconds: number;
  compatibility_status: string;
  ai_match_score: number;
  score_reasons: string[];
  status: string;
  responded_at?: string;
  created_at?: string;
}

export interface RankedCandidate {
  donor_id: number;
  name: string;
  blood_group: string;
  approximate_proximity: string;
  ai_match_score: number;
  score_reasons: string[];
  model_type: string;
  availability: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  request_id: number | null;
  notification_type: 'EMERGENCY_REQUEST' | 'REQUEST_UPDATE' | 'STATUS_CHANGE' | 'SYSTEM';
  title: string;
  message: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: 'UNREAD' | 'READ';
  sent_at: string;
}

export interface DemoAccount {
  id: number;
  name: string;
  email: string;
  role: 'donor' | 'hospital' | 'admin';
  bloodGroup?: string;
  location: string;
  status: string;
  defaultPassword: string;
}

// Token helper
export function getAuthToken(): string | null {
  return localStorage.getItem('lifelink_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('lifelink_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('lifelink_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<{ success: boolean; user: User; profile: any }>('/auth/me'),
  getDemoAccounts: () => request<{ success: boolean; accounts: DemoAccount[] }>('/auth/demo-accounts'),

  // Donor
  getDonorProfile: () => request<any>('/donor/profile'),
  updateDonorProfile: (body: any) => request<any>('/donor/profile', { method: 'PUT', body: JSON.stringify(body) }),
  toggleAvailability: () => request<any>('/donor/availability', { method: 'PUT' }),
  getDonorRequests: () => request<{ success: boolean; requests: any[] }>('/donor/requests'),
  respondToRequest: (requestId: number, response: 'ACCEPTED' | 'DECLINED') =>
    request<any>(`/donor/requests/${requestId}/respond`, { method: 'POST', body: JSON.stringify({ response }) }),
  getDonationHistory: () => request<any>('/donor/history'),

  // Hospital
  getHospitalProfile: () => request<any>('/hospital/profile'),
  getHospitalStats: () => request<any>('/hospital/stats'),

  // Requests
  createRequest: (body: any) => request<any>('/requests', { method: 'POST', body: JSON.stringify(body) }),
  getRequests: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<{ success: boolean; requests: BloodRequest[] }>(`/requests${query ? `?${query}` : ''}`);
  },
  getRequestById: (id: number) => request<any>(`/requests/${id}`),
  getRequestMatches: (id: number) => request<{
    success: boolean;
    request: BloodRequest;
    responses: DonorResponseItem[];
    potentialDonorsPool: RankedCandidate[];
    disclaimer: string;
  }>(`/requests/${id}/matches`),
  runMatching: (id: number) => request<any>(`/requests/${id}/match`, { method: 'POST' }),
  escalateRequest: (id: number) => request<any>(`/requests/${id}/escalate`, { method: 'POST' }),
  verifyDonorMatch: (requestId: number, responseId: number, notes?: string) =>
    request<any>(`/requests/${requestId}/verify-match`, { method: 'POST', body: JSON.stringify({ responseId, notes }) }),
  fulfillRequest: (requestId: number, verifiedDonorIds: number[], notes?: string) =>
    request<any>(`/requests/${requestId}/fulfill`, { method: 'POST', body: JSON.stringify({ verifiedDonorIds, notes }) }),
  cancelRequest: (id: number) => request<any>(`/requests/${id}/cancel`, { method: 'POST' }),

  // Admin
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return request<any>(`/admin/users${query ? `?${query}` : ''}`);
  },
  toggleUserStatus: (userId: number) => request<any>(`/admin/users/${userId}/status`, { method: 'PUT' }),
  verifyHospital: (hospitalId: number, status: 'VERIFIED' | 'REJECTED') =>
    request<any>(`/admin/hospitals/${hospitalId}/verify`, { method: 'PUT', body: JSON.stringify({ status }) }),
  approveRequest: (id: number) => request<any>(`/admin/requests/${id}/verify`, { method: 'POST' }),
  rejectRequest: (id: number, reason: string) => request<any>(`/admin/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getAdminAnalytics: () => request<any>('/admin/analytics'),
  getAuditLogs: () => request<any>('/admin/audit-logs'),
  getCompatibilityRules: () => request<any>('/admin/rules'),
  toggleCompatibilityRule: (id: number, enabled: boolean) =>
    request<any>(`/admin/rules/${id}`, { method: 'PUT', body: JSON.stringify({ enabled }) }),

  // Notifications
  getNotifications: () => request<{ success: boolean; notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request<any>('/notifications/read-all', { method: 'PUT' })
};
