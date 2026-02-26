import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface GuideTourProps {
    run: boolean;
    setRun: (run: boolean) => void;
}

const steps: Step[] = [
    {
        target: '[data-tour="sidebar-brand"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Welcome to Identix!</h3>
                <p className="text-sm opacity-90">This is your main dashboard logo and brand identification. Let's take a quick tour of the platform.</p>
            </div>
        ),
        placement: 'right',
        disableBeacon: true,
    },
    {
        target: '[data-tour="nav-dashboard"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Dashboard</h3>
                <p className="text-sm opacity-90">View your daily stats, quick insights, and recent activity here.</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="check-in-out"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Check-In / Out</h3>
                <p className="text-sm opacity-90">Mark your attendance and take breaks directly from the dashboard card.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="nav-employees"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Employees</h3>
                <p className="text-sm opacity-90">Manage employee profiles and team details (Admin restricted).</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="add-employee"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Add Employee</h3>
                <p className="text-sm opacity-90">Quickly add new team members to the system from here.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="employee-search"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Search & Filter</h3>
                <p className="text-sm opacity-90">Easily find employees by name or email using the search bar.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="nav-attendance"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Attendance</h3>
                <p className="text-sm opacity-90">Review your detailed attendance logs and history in this module.</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="attendance-month"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Month Selector</h3>
                <p className="text-sm opacity-90">Switch between different months to view historical attendance data.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="attendance-filter"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Quick Filters</h3>
                <p className="text-sm opacity-90">Quickly filter records for Today, Yesterday, or the Previous Day.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="attendance-export"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Export Data</h3>
                <p className="text-sm opacity-90">Download your attendance reports in PDF or CSV format.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="nav-leave_requests"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Leave Requests</h3>
                <p className="text-sm opacity-90">Apply for leaves or approve pending requests from your team.</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="apply-leave"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Apply for Leave</h3>
                <p className="text-sm opacity-90">Submit new leave or permission requests through this button.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="leave-stats"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Leave Balances</h3>
                <p className="text-sm opacity-90">Keep track of your remaining Sick, Casual, and Annual leave days.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="nav-payroll"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Payroll</h3>
                <p className="text-sm opacity-90">Manage salaries, payouts, and financial records.</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="payroll-generate"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Bulk Generation</h3>
                <p className="text-sm opacity-90">Automatically generate payroll for all employees with one click.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="payroll-add"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Manual Entry</h3>
                <p className="text-sm opacity-90">Add individual payroll records manually when needed.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="nav-holidays"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Holidays</h3>
                <p className="text-sm opacity-90">View the company holiday calendar and upcoming events.</p>
            </div>
        ),
        placement: 'right',
    },
    {
        target: '[data-tour="holiday-year"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Year Selection</h3>
                <p className="text-sm opacity-90">Check holiday lists for current, past, or future years.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="holiday-download"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Download List</h3>
                <p className="text-sm opacity-90">Get a PDF copy of the official holiday list for your records.</p>
            </div>
        ),
        placement: 'bottom',
    },
    {
        target: '[data-tour="theme-toggle"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">Theme Toggle</h3>
                <p className="text-sm opacity-90">Switch between light and dark modes according to your preference.</p>
            </div>
        ),
        placement: 'top',
    },
    {
        target: '[data-tour="user-profile"]',
        content: (
            <div className="text-left">
                <h3 className="font-bold text-lg mb-1">User Settings</h3>
                <p className="text-sm opacity-90">Access your profile or sign out from the platform here.</p>
            </div>
        ),
        placement: 'top',
    },
];

export const GuideTour: React.FC<GuideTourProps> = ({ run, setRun }) => {
    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            setRun(false);
        }
    };

    return (
        <Joyride
            key={run ? 'running' : 'stopped'}
            callback={handleJoyrideCallback}
            continuous
            hideCloseButton
            run={run}
            disableOverlay={false}
            scrollToFirstStep
            showProgress
            showSkipButton
            steps={steps}
            styles={{
                options: {
                    arrowColor: 'hsl(var(--card))',
                    backgroundColor: 'hsl(var(--card))',
                    overlayColor: 'rgba(0, 0, 0, 0.5)',
                    primaryColor: 'hsl(var(--primary))',
                    textColor: 'hsl(var(--foreground))',
                    zIndex: 99999,
                },
                tooltipContainer: {
                    textAlign: 'left',
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border) / 0.5)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                },
                buttonNext: {
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '8px 16px',
                },
                buttonBack: {
                    marginRight: '10px',
                    color: 'hsl(var(--muted-foreground))',
                },
                buttonSkip: {
                    color: 'hsl(var(--muted-foreground))',
                }
            }}
        />
    );
};
