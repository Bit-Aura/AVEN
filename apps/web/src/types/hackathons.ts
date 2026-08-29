export interface HackathonEvent {
  id?: string | number;
  external_id: string;
  source: string;
  title: string;
  url: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  mode?: string;
  format?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  prize_pool?: string;
  prize_pool_usd?: number;
  tags?: string[];
  skills?: string[];
  banner_url?: string;
  organizer?: string;
  status?: string;
  participant_count?: number;
}

export interface HackathonFilters {
  page?: number;
  page_size?: number;
  mode?: string;
  city?: string;
  status?: string;
  min_prize?: number;
  sort?: string;
  source?: string | string[];
}

export interface HackathonListResponse {
  events: HackathonEvent[];
  total: number;
  page: number;
  page_size: number;
}
