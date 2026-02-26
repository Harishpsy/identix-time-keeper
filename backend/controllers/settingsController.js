// Removed global pool import

const getSettings = async (req, res) => {
    try {
        const [settings] = await req.tenantPool.execute('SELECT * FROM company_settings LIMIT 1');
        res.json(settings[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateSettings = async (req, res) => {
    const updates = req.body;
    delete updates.id;

    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const params = Object.values(updates);

    try {
        const [settings] = await req.tenantPool.execute('SELECT id FROM company_settings LIMIT 1');
        if (settings.length === 0) {
            // Should not happen as we insert default, but handle anyway
            return res.status(404).json({ error: 'Settings not found' });
        }

        params.push(settings[0].id);
        await req.tenantPool.execute(`UPDATE company_settings SET ${setClause} WHERE id = ?`, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getSettings, updateSettings };
