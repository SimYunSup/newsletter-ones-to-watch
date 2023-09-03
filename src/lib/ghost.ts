import GhostContentAPI from '@tryghost/content-api';
// @ts-ignore
import GhostAdminAPI from '@tryghost/admin-api';
// Create API instance with site credentials
export const ghostClient = new GhostContentAPI({
    url: import.meta.env.GHOST_SITE_URL, // This is the default URL if your site is running on a local environment
    key: import.meta.env.CONTENT_API_KEY,
    version: 'v5.0',
});
export const ghostAdminClient = new GhostAdminAPI({
    url: import.meta.env.GHOST_SITE_URL, // This is the default URL if your site is running on a local environment
    key: import.meta.env.ADMIN_API_KEY,
    version: 'v5.0',
});