import { TSGhostContentAPI } from '@ts-ghost/content-api';
// Create API instance with site credentials
export const ghostClient = new TSGhostContentAPI(
    import.meta.env.GHOST_SITE_URL,
    import.meta.env.CONTENT_API_KEY,
    'v5.0',
);