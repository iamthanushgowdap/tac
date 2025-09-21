
import type { User, Notification, UserProfile, Assignment, FeeRecord, AttendanceRecord } from '@/types';
import { NOTIFICATION_STORAGE_KEY, ASSIGNMENT_STORAGE_KEY, FEE_STORAGE_KEY, ATTENDANCE_STORAGE_KEY } from '@/types';
import { differenceInDays, isAfter } from 'date-fns';

const LOW_ATTENDANCE_THRESHOLD = 75; // Percentage
const DEADLINE_WARNING_DAYS = 3;

function getStoredNotifications(): Notification[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

function saveNotifications(notifications: Notification[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
}

function createNotification(
    user: User, 
    allNotifications: Notification[], 
    type: Notification['type'], 
    relatedId: string, 
    title: string, 
    message: string, 
    href: string
): Notification | null {
    const uniqueId = `${user.uid}-${type}-${relatedId}`;
    if (allNotifications.some(n => n.id === uniqueId)) {
        return null; // Notification already exists
    }
    return {
        id: uniqueId,
        userId: user.uid,
        type,
        title,
        message,
        href,
        createdAt: new Date().toISOString(),
        isRead: false,
    };
}

// 1. Registration Approval Notifications
function checkApprovalStatus(user: User, profile: UserProfile, allNotifications: Notification[]): Notification | null {
    if (!profile.isApproved && profile.rejectionReason && (user.notificationPreferences?.approval ?? true)) {
        return createNotification(user, allNotifications, 'approval', 'rejection', 'Registration Rejected', `Your registration was rejected. Reason: ${profile.rejectionReason}`, '/student');
    }
    if (profile.isApproved && profile.role === 'student' && !allNotifications.some(n => n.id === `${user.uid}-approval-approved`) && (user.notificationPreferences?.approval ?? true)) {
        return createNotification(user, allNotifications, 'approval', 'approved', 'Registration Approved!', 'Your account has been approved. You now have full access.', '/student');
    }
    return null;
}

// 2. Assignment Deadline Notifications
function checkAssignmentDeadlines(user: User, allNotifications: Notification[]): Notification[] {
    if (user.role !== 'student' || !(user.notificationPreferences?.assignment_deadline ?? true)) return [];
    
    const assignmentsStr = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    if (!assignmentsStr) return [];
    
    const allAssignments: Assignment[] = JSON.parse(assignmentsStr);
    const relevantAssignments = allAssignments.filter(a => a.branch === user.branch && a.semester === user.semester && a.dueDate);

    const newNotifications: Notification[] = [];
    relevantAssignments.forEach(assignment => {
        const daysUntilDue = differenceInDays(new Date(assignment.dueDate!), new Date());
        if (daysUntilDue >= 0 && daysUntilDue <= DEADLINE_WARNING_DAYS) {
            const notif = createNotification(user, allNotifications, 'assignment_deadline', assignment.id, `Assignment Due Soon: ${assignment.title}`, `This assignment is due in ${daysUntilDue + 1} day(s).`, '/student/assignments');
            if (notif) newNotifications.push(notif);
        }
    });
    return newNotifications;
}

// 3. Fee Due Date Notifications
function checkFeeDueDates(user: User, allNotifications: Notification[]): Notification[] {
    if (user.role !== 'student' || !(user.notificationPreferences?.fee_due ?? true)) return [];

    const feesStr = localStorage.getItem(FEE_STORAGE_KEY);
    if (!feesStr) return [];

    const allFees: FeeRecord[] = JSON.parse(feesStr);
    const studentFees = allFees.filter(f => f.studentUid === user.uid && f.status !== 'paid');

    const newNotifications: Notification[] = [];
    studentFees.forEach(fee => {
        const dueDate = new Date(fee.dueDate);
        const daysUntilDue = differenceInDays(dueDate, new Date());

        if (isAfter(new Date(), dueDate)) { // Overdue
             const notif = createNotification(user, allNotifications, 'fee_due', `overdue-${fee.id}`, `Fee Overdue: ${fee.description}`, `Your fee of ₹${fee.amount} was due on ${fee.dueDate}. Please pay it as soon as possible.`, '/student/fee-details');
             if (notif) newNotifications.push(notif);
        } else if (daysUntilDue >= 0 && daysUntilDue <= DEADLINE_WARNING_DAYS) {
            const notif = createNotification(user, allNotifications, 'fee_due', fee.id, `Fee Reminder: ${fee.description}`, `Your fee of ₹${fee.amount} is due in ${daysUntilDue + 1} day(s).`, '/student/fee-details');
            if (notif) newNotifications.push(notif);
        }
    });
    return newNotifications;
}

// 4. Low Attendance Notifications
function checkLowAttendance(user: User, allNotifications: Notification[]): Notification | null {
    if (user.role !== 'student' || !(user.notificationPreferences?.low_attendance ?? true)) return null;
    
    const attendanceStr = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!attendanceStr) return null;
    
    const allRecords: AttendanceRecord[] = JSON.parse(attendanceStr);
    const studentRecords = allRecords.filter(rec => rec.studentUid === user.uid);
    if (studentRecords.length === 0) return null;

    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const totalCount = studentRecords.length;
    const percentage = (presentCount / totalCount) * 100;
    
    if (percentage < LOW_ATTENDANCE_THRESHOLD) {
        return createNotification(user, allNotifications, 'low_attendance', 'overall-attendance-warning', 'Low Attendance Warning', `Your overall attendance is ${percentage.toFixed(1)}%, which is below the required ${LOW_ATTENDANCE_THRESHOLD}%.`, '/student/attendance');
    }
    return null;
}


// Main function to be called from AuthProvider
export function checkAndGenerateNotifications(user: User) {
    if (typeof window === 'undefined' || !user) return;
    
    const allNotifications = getStoredNotifications();
    const newNotifications: Notification[] = [];
    
    const profileStr = localStorage.getItem(`apsconnect_user_${user.uid}`);
    if (!profileStr) return;
    const profile: UserProfile = JSON.parse(profileStr);

    // Run all checks
    const approvalNotif = checkApprovalStatus(user, profile, allNotifications);
    if (approvalNotif) newNotifications.push(approvalNotif);

    const deadlineNotifs = checkAssignmentDeadlines(user, allNotifications);
    newNotifications.push(...deadlineNotifs);
    
    const feeNotifs = checkFeeDueDates(user, allNotifications);
    newNotifications.push(...feeNotifs);

    const attendanceNotif = checkLowAttendance(user, allNotifications);
    if (attendanceNotif) newNotifications.push(attendanceNotif);
    
    if (newNotifications.length > 0) {
        saveNotifications([...allNotifications, ...newNotifications]);
        // Dispatch custom event for navbar to update its count
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
    }
}
