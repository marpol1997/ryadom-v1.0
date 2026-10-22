/** DTO, которые уходят на клиент. Единый контракт API. */

export type Role = 'resident' | 'uk_manager' | 'moderator' | 'admin';
export type RequestStatus = 'new' | 'in_progress' | 'done' | 'rejected';
export type BuildingKind = 'house' | 'snt';

export interface Me {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  buildingId: string | null;
  avatarColor: string;
  createdAt: string;
}

export interface LastMessage {
  text: string;
  userName: string;
  createdAt: string;
}

export interface Building {
  id: string;
  type: BuildingKind;
  title: string;
  address: string;
  district: string;
  lat: number;
  lng: number;
  units: number | null;
  about: string | null;
  members: number;
  joined: boolean;
  messages: number;
  lastMessage: LastMessage | null;
}

export interface Category {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

export interface RequestComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface RequestEvent {
  status: RequestStatus;
  comment: string;
  createdAt: string;
}

export interface RequestItem {
  id: string;
  categoryId: string;
  categoryTitle: string;
  categoryIcon: string;
  title: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  status: RequestStatus;
  authorName: string;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  canManage: boolean;
  comments?: RequestComment[];
  events?: RequestEvent[];
}

export interface Specialist {
  id: string;
  name: string;
  role: string;
  title: string;
  about: string;
  phone: string | null;
  hours: string;
  rating: string;
  reviews: number;
  lat: number | null;
  lng: number | null;
  verified: boolean;
}

export interface Officer {
  id: string;
  name: string;
  rankTitle: string;
  district: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

export interface FeedItem {
  id: string;
  title: string;
  body: string;
  kind: string;
  icon: string;
  tag: string;
  tone: 'info' | 'warn' | 'danger' | string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface MeStats {
  requests: number;
  open: number;
  chats: number;
  messages: number;
}

export interface BootstrapData {
  city: { name: string; lat: number; lng: number; zoom: number };
  districts: string[];
  categories: Category[];
  buildings: Building[];
  requests: RequestItem[];
  specialists: Specialist[];
  officers: Officer[];
  feed: FeedItem[];
  me: Me | null;
  stats: MeStats | null;
}
