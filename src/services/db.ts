import { LocalDBService } from './localDb';

// Local SQL Server is authoritative; never fall back to fabricated users or browser data.
export const db = new LocalDBService();
