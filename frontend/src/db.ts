import Dexie, { type Table } from 'dexie';
import type { Session } from './types';

class LivePointDB extends Dexie {
  sessions!: Table<Session>;

  constructor() {
    super('livepoint');
    this.version(1).stores({
      sessions: 'id, createdAt',
    });
  }
}

export const db = new LivePointDB();

export async function saveSession(session: Session): Promise<void> {
  await db.sessions.put(session);
}

export async function loadAllSessions(): Promise<Session[]> {
  return await db.sessions.orderBy('createdAt').reverse().toArray();
}

export async function deleteSession(id: string): Promise<void> {
  await db.sessions.delete(id);
}
