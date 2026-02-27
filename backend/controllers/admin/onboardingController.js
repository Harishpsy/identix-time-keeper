const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const getOnboardingStatus = async (req, res) => {
    try {
        const [profiles] = await pool.execute(
            'SELECT onboarding_status, full_name, role FROM profiles p JOIN user_roles r ON p.id = r.user_id WHERE p.id = ?',
            [req.user.id]
        );

        if (profiles.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json(profiles[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateOnboardingProfile = async (req, res) => {
    let { phone_number, date_of_birth, gender, address } = req.body;
    const userId = req.user.id;

    // Convert empty strings to null for nullable DB fields
    phone_number = phone_number || null;
    date_of_birth = date_of_birth || null;
    gender = gender || null;
    address = address || null;

    try {
        await pool.execute(
            'UPDATE profiles SET phone_number = ?, date_of_birth = ?, gender = ?, address = ?, onboarding_status = ? WHERE id = ?',
            [phone_number, date_of_birth, gender, address, 'Pending Submission', userId]
        );

        await logAudit(userId, 'Profile details updated', userId, req.user.full_name || 'Employee');

        res.json({ success: true, message: 'Onboarding profile updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const uploadDocument = async (req, res) => {
    const { document_type } = req.body;
    const userId = req.user.id;

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = `/uploads/onboarding/${req.file.filename}`;
    const docId = uuidv4();

    try {
        // Delete existing document of the same type (replace, don't duplicate)
        const [existing] = await pool.execute(
            'SELECT file_path FROM onboarding_documents WHERE user_id = ? AND document_type = ?',
            [userId, document_type]
        );

        if (existing.length > 0) {
            // Remove the old file from disk
            const oldFilePath = path.join(__dirname, '..', existing[0].file_path);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
            // Remove the old DB record
            await pool.execute(
                'DELETE FROM onboarding_documents WHERE user_id = ? AND document_type = ?',
                [userId, document_type]
            );
        }

        await pool.execute(
            'INSERT INTO onboarding_documents (id, user_id, document_type, file_path) VALUES (?, ?, ?, ?)',
            [docId, userId, document_type, filePath]
        );

        await logAudit(userId, `Uploaded document: ${document_type}`, userId, req.user.full_name || 'Employee');

        res.json({ success: true, docId, filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const submitOnboarding = async (req, res) => {
    const userId = req.user.id;

    try {
        // Check if mandatory documents are uploaded
        const [docs] = await pool.execute('SELECT * FROM onboarding_documents WHERE user_id = ?', [userId]);
        // Note: Logic for mandatory docs can be refined based on Admin config
        if (docs.length === 0) {
            return res.status(400).json({ error: 'Please upload required documents before submitting' });
        }

        await pool.execute(
            'UPDATE profiles SET onboarding_status = ? WHERE id = ?',
            ['Under Review', userId]
        );

        await logAudit(userId, 'Onboarding submitted for review', userId, req.user.full_name || 'Employee');

        res.json({ success: true, message: 'Onboarding submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getOnboardingDashboard = async (req, res) => {
    try {
        let query = `
            SELECT p.id, p.full_name, p.email, p.phone_number, p.gender, p.onboarding_status, p.employee_id, d.name as department_name, p.created_at
            FROM profiles p
            LEFT JOIN departments d ON p.department_id = d.id
            JOIN user_roles r ON p.id = r.user_id
            WHERE r.role NOT IN ('super_admin', 'admin')
        `;
        let params = [];

        if (req.user.role === 'subadmin') {
            query += ' AND p.manager_id = ?';
            params.push(req.user.id);
        }

        const [onboardings] = await pool.execute(query, params);
        res.json(onboardings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const verifyOnboarding = async (req, res) => {
    const { userId, status, notes } = req.body; // status: 'Approved' or 'Rejected'
    const adminId = req.user.id;
    const adminName = req.user.full_name || 'Admin';

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid verification status' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const finalStatus = status === 'Approved' ? 'Active' : 'Rejected';

        await connection.execute(
            'UPDATE profiles SET onboarding_status = ?, is_active = ? WHERE id = ?',
            [finalStatus, status === 'Approved', userId]
        );

        await connection.execute(
            'INSERT INTO onboarding_audit_logs (id, user_id, action, performed_by, performed_by_name, notes) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), userId, `Onboarding ${status}`, adminId, adminName, notes]
        );

        await connection.commit();
        res.json({ success: true, message: `Onboarding ${status.toLowerCase()} successfully` });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
};

const logAudit = async (userId, action, performedBy, performedByName, notes = '') => {
    await pool.execute(
        'INSERT INTO onboarding_audit_logs (id, user_id, action, performed_by, performed_by_name, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), userId, action, performedBy, performedByName, notes]
    );
};

const getOnboardingDocuments = async (req, res) => {
    const { userId } = req.params;
    try {
        const [docs] = await pool.execute(
            'SELECT id, document_type, file_path, created_at FROM onboarding_documents WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        res.json(docs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getOnboardingStatus,
    updateOnboardingProfile,
    uploadDocument,
    submitOnboarding,
    getOnboardingDashboard,
    getOnboardingDocuments,
    verifyOnboarding
};

