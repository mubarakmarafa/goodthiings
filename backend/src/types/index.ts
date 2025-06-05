export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  last_used_style: 'handdrawn' | '3d';
  generation_count: number;
  monthly_generation_limit: number;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  enhanced_prompt?: string;
  style_type: 'handdrawn' | '3d';
  image_url: string;
  thumbnail_url?: string;
  grid_position_x?: number;
  grid_position_y?: number;
  generation_status: 'pending' | 'completed' | 'failed';
  openai_request_id?: string;
  created_at: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export type StyleType = 'handdrawn' | '3d'; 