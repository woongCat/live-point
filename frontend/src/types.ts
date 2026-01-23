export interface Point {
  id: string;
  timestamp: Date;
  sourceText: string;
  point: string;
}

export interface Session {
  id: string;
  createdAt: Date;
  title: string;
  transcript: string;
  points: Point[];
}

export interface WebSocketMessage {
  type: 'transcript' | 'point_chunk' | 'point_complete' | 'pause' | 'reset';
  text?: string;
  source?: string;
  point?: string;
}
