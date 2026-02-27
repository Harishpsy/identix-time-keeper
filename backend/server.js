const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const profileRoutes = require('./routes/profileRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const rolePermissionsRoutes = require('./routes/rolePermissionsRoutes');
const loanRoutes = require('./routes/loanRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');

const app = express();
app.set('trust proxy', true);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/role-permissions', rolePermissionsRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.get('/', (req, res) => {
    res.send('IdentixHR Time Keeper API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
