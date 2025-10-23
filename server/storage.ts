// FI Planner uses client-side calculations only
// No backend storage needed - all data is in-memory on the client

export interface IStorage {
  // Placeholder for future backend features if needed
}

export class MemStorage implements IStorage {
  constructor() {
    // No storage needed for client-side calculator
  }
}

export const storage = new MemStorage();
