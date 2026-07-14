/**
 * Data-access layer barrel — CONTRACT (frozen during delegation waves).
 * Feature code imports from '@/lib/data' only; it never queries supabase
 * directly and never imports the domain files or _helpers directly.
 */
export * from './consents';
export * from './core';
export * from './events';
export * from './households';
export * from './messaging';
export * from './roles';
export * from './roster-import';
export * from './sensitive';
