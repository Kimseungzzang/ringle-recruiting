// Mirrors the backend DTO shapes (app/dtos/*_dto.rb) field-for-field so mock
// data and real API responses can be swapped in without a mapping layer.

export type PermissionName = "study" | "converse" | "analyze";

export interface Membership {
  id: number;
  name: string;
  permissions: PermissionName[];
  duration_days: number;
  price: number;
}

export interface MemberMembership {
  membership: Membership;
  created_at: string;
  expires_at: string;
  active: boolean;
}

export interface Member {
  id: number;
  login_id: string;
  username: string;
}

export interface MemberDetail extends Member {
  role: "user" | "admin";
  membership: MemberMembership | null;
}

export type LocaleName = "ko" | "eng";

export interface Topic {
  id: number;
  title: string;
  title_en: string;
}

export interface TopicParagraph {
  id: number;
  position: number;
  translations: Partial<Record<LocaleName, string>>;
}

export interface TopicDetail extends Topic {
  paragraphs: TopicParagraph[];
}

export interface RealtimeSession {
  client_secret: string;
  expires_at: string;
}

export interface Translation {
  translation: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  translation?: string;
  audioUrl?: string;
}
