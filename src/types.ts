export interface ChatAttachment {
  content: string; // Base64 Data URL
  mimeType: string;
  fileName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachment?: ChatAttachment;
  isError?: boolean;
  type?: 'code' | 'message';
}

export interface ExampleTemplate {
  name: string;
  code: string;
  description: string;
  type: string;
}

export interface GenAIResponse {
  type: 'code' | 'message';
  content: string;
}

export enum AppMode {
  EDITOR = 'EDITOR',
  CHAT = 'CHAT',
}

export type ViewState = 'split' | 'code' | 'preview';

export type DiagramType = 'auto' | 'graph' | 'sequence' | 'class' | 'state' | 'gantt' | 'mindmap' | 'er' | 'pie' | 'journey';
