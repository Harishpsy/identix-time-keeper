const { masterPool, getTenantPool } = require('../config/db');

/**
 * Middleware to resolve the tenant for each request.
 */
const tenantMiddleware = async (req, res, next) => {
    // 1. Identify tenant slug from Host header (subdomain) or custom header
    const host = req.headers.host || '';
    const xTenantSlug = req.headers['x-tenant-slug'];

    let slug = '';

    if (xTenantSlug) {
        slug = xTenantSlug;
        console.log(`[TenantMiddleware] Resolved slug from X-Tenant-Slug header: ${slug}`);
    } else {
        const parts = host.split('.');
        if (parts.length >= 3) {
            slug = parts[0];
            console.log(`[TenantMiddleware] Resolved slug from subdomain: ${slug}`);
        }
    }

    // Default/Legacy fallback if no slug is provided
    if (!slug || slug === 'www' || slug === 'localhost') {
        req.tenantSlug = 'legacy';
        req.tenantPool = require('../config/db').pool;
        return next();
    }

    try {
        // 2. Look up the tenant's database in the master pool
        const [tenants] = await masterPool.execute(
            'SELECT db_name FROM tenants WHERE slug = ? AND is_active = true',
            [slug]
        );

        if (tenants.length === 0) {
            return res.status(404).json({ error: `Tenant '${slug}' not found or inactive` });
        }

        const dbName = tenants[0].db_name;

        // 3. Attach the specific tenant pool to the request
        req.tenantSlug = slug;
        req.tenantPool = getTenantPool(dbName);

        next();
    } catch (err) {
        console.error('Tenant Resolution Error:', err);
        res.status(500).json({ error: 'Internal server error during tenant resolution' });
    }
};

module.exports = tenantMiddleware;
