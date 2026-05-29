export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_clients: {
        Row: { created_at: string; id: string };
        Insert: { created_at?: string; id?: string };
        Update: { created_at?: string; id?: string };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          images: Json | null;
          role: string;
          room_id: string;
          sort_order: number;
        };
        Insert: {
          content?: string;
          created_at?: string;
          id?: string;
          images?: Json | null;
          role: string;
          room_id: string;
          sort_order?: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          images?: Json | null;
          role?: string;
          room_id?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      chat_rooms: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      client_preferences: {
        Row: {
          active_mcp_server_id: string | null;
          active_room_id: string | null;
          client_id: string;
          updated_at: string;
        };
        Insert: {
          active_mcp_server_id?: string | null;
          active_room_id?: string | null;
          client_id: string;
          updated_at?: string;
        };
        Update: {
          active_mcp_server_id?: string | null;
          active_room_id?: string | null;
          client_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mcp_servers: {
        Row: {
          args: string | null;
          client_id: string;
          command: string | null;
          created_at: string;
          headers: string | null;
          hf_token: string | null;
          id: string;
          name: string;
          sort_order: number;
          status: string;
          transport: string;
          url: string | null;
        };
        Insert: {
          args?: string | null;
          client_id: string;
          command?: string | null;
          created_at?: string;
          headers?: string | null;
          hf_token?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          status?: string;
          transport: string;
          url?: string | null;
        };
        Update: {
          args?: string | null;
          client_id?: string;
          command?: string | null;
          created_at?: string;
          headers?: string | null;
          hf_token?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          status?: string;
          transport?: string;
          url?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
