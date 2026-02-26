-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_mins INT NOT NULL DEFAULT 15,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) PRIMARY KEY,
    biometric_id VARCHAR(50) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department_id CHAR(36),
    shift_id CHAR(36),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    date_of_joining DATE,
    theme ENUM('light', 'dark') DEFAULT 'light',
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (shift_id) REFERENCES shifts(id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL,
    UNIQUE (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('super_admin', 'admin', 'subadmin', 'employee') NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    UNIQUE (role, module_key)
);

-- Create attendance_raw table
CREATE TABLE IF NOT EXISTS attendance_raw (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    timestamp DATETIME NOT NULL,
    device_id VARCHAR(255),
    punch_type VARCHAR(50) DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create daily_summaries table
CREATE TABLE IF NOT EXISTS daily_summaries (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    first_in DATETIME,
    last_out DATETIME,
    total_duration_minutes INT DEFAULT NULL,
    late_minutes INT DEFAULT 0,
    status ENUM('present', 'late', 'absent', 'half_day', 'on_leave') NOT NULL DEFAULT 'absent',
    is_manual_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create leave_requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    to_date DATE,
    type ENUM('sick', 'casual', 'annual', 'permission', 'other', 'half_day') NOT NULL DEFAULT 'casual',
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_by CHAR(36),
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create leave_balances table
CREATE TABLE IF NOT EXISTS leave_balances (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    year INT NOT NULL,
    sick_total INT NOT NULL DEFAULT 12,
    sick_used INT NOT NULL DEFAULT 0,
    casual_total INT NOT NULL DEFAULT 12,
    casual_used INT NOT NULL DEFAULT 0,
    annual_total INT NOT NULL DEFAULT 15,
    annual_used INT NOT NULL DEFAULT 0,
    permission_total INT NOT NULL DEFAULT 2,
    permission_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (user_id, year),
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id CHAR(36) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL DEFAULT '',
    company_address TEXT,
    logo_url TEXT,
    default_sick_leaves INT NOT NULL DEFAULT 12,
    default_casual_leaves INT NOT NULL DEFAULT 12,
    default_annual_leaves INT NOT NULL DEFAULT 15,
    sidebar_order TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id CHAR(36) PRIMARY KEY,
    year INT NOT NULL,
    details TEXT,
    pdf_content LONGBLOB,
    pdf_name VARCHAR(255),
    pdf_mime VARCHAR(100),
    UNIQUE (year)
);

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) DEFAULT 0.00,
    term_months INT NOT NULL,
    monthly_installment DECIMAL(10, 2) NOT NULL,
    total_repayable DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
    purpose TEXT,
    repayment_start_date DATE,
    approved_by CHAR(36),
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create loan_repayments table
CREATE TABLE IF NOT EXISTS loan_repayments (
    id CHAR(36) PRIMARY KEY,
    loan_id CHAR(36) NOT NULL,
    payroll_id CHAR(36),
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    method ENUM('payroll_deduction', 'manual') DEFAULT 'payroll_deduction',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- Create payroll table
CREATE TABLE IF NOT EXISTS payroll (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    month VARCHAR(7) NOT NULL, -- YYYY-MM
    basic_salary DECIMAL(10, 2) DEFAULT 0,
    hra DECIMAL(10, 2) DEFAULT 0,
    dearness_allowance DECIMAL(10, 2) DEFAULT 0,
    conveyance_allowance DECIMAL(10, 2) DEFAULT 0,
    medical_allowance DECIMAL(10, 2) DEFAULT 0,
    special_allowance DECIMAL(10, 2) DEFAULT 0,
    overtime DECIMAL(10, 2) DEFAULT 0,
    bonus DECIMAL(10, 2) DEFAULT 0,
    other_earnings DECIMAL(10, 2) DEFAULT 0,
    epf_employee DECIMAL(10, 2) DEFAULT 0,
    esi_employee DECIMAL(10, 2) DEFAULT 0,
    professional_tax DECIMAL(10, 2) DEFAULT 0,
    tds DECIMAL(10, 2) DEFAULT 0,
    loan_recovery DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    gross_earnings DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) DEFAULT 0,
    net_salary DECIMAL(10, 2) DEFAULT 0,
    paid_days INT DEFAULT 0,
    lop_days INT DEFAULT 0,
    released BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, month),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
