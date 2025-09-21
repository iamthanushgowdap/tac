
// src/types/index.ts
import { z } from "zod";

export type UserRole = "student" | "admin" | "pending" | "faculty" | "alumni";

// Branch type is now string to allow admins to define custom branch names.
export type Branch = string;

// defaultBranches provides a list of common/suggested branches for forms.
export const defaultBranches: Branch[] = [
  "CSE",
  "ISE",
  "ECE",
  "ME",
  "CIVIL",
  "AI & ML",
  "OTHER",
];

export type Semester =
  | "1st Sem"
  | "2nd Sem"
  | "3rd Sem"
  | "4th Sem"
  | "5th Sem"
  | "6th Sem"
  | "7th Sem"
  | "8th Sem";
export const semesters: Semester[] = [
  "1st Sem",
  "2nd Sem",
  "3rd Sem",
  "4th Sem",
  "5th Sem",
  "6th Sem",
  "7th Sem",
  "8th Sem",
];

export type PostCategory = "event" | "news" | "link" | "note" | "schedule";
export const postCategories: PostCategory[] = [
  "event",
  "news",
  "link",
  "note",
  "schedule",
];

// Notification Preferences
export interface NotificationPreferences {
  news: boolean;
  events: boolean;
  notes: boolean;
  schedules: boolean;
  general: boolean;
  // New system-level notifications
  approval: boolean;
  assignment_deadline: boolean;
  fee_due: boolean;
  low_attendance: boolean;
}

// Resume-related types
export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
  graduationYear: string;
  score: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  duration: string;
  description: string;
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  link?: string;
}

export interface SkillEntry {
  id: string;
  name: string;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuingBody: string;
  year: string;
}

export interface AchievementEntry {
  id: string;
  description: string;
}

// This interface represents the more detailed user profile stored in localStorage.
export interface UserProfile {
  uid: string; // For students, USN. For faculty/admin, email.
  email: string;
  displayName?: string;
  role: UserRole;
  avatarDataUrl?: string;
  pronouns?: string;

  // Student-specific fields
  usn?: string;
  branch?: Branch;
  semester?: Semester;
  registrationDate: string;

  isApproved: boolean;

  approvedByUid?: string;
  approvedByDisplayName?: string;
  approvalDate?: string;

  rejectionReason?: string;
  rejectedByUid?: string;
  rejectedByDisplayName?: string;
  rejectedDate?: string;

  // Faculty-specific fields
  assignedBranches?: Branch[];
  assignedSemesters?: Semester[];
  facultyTitle?: string;
  
  // Contact & Resume fields (shared)
  phoneNumber?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
  education?: EducationEntry[];
  experience?: ExperienceEntry[];
  projects?: ProjectEntry[];
  skills?: SkillEntry[];
  certifications?: CertificationEntry[];
  achievements?: AchievementEntry[];

  // Alumni-specific fields
  placementCompany?: string;
  placementJobTitle?: string;
  referralInfo?: string;

  password?: string;
  notificationPreferences?: NotificationPreferences;
}

// Site settings managed by admin
export interface SiteSettingsData {
  collegeLogoUrl?: string;
  contactEmail?: string;
  enableStudentRegistration?: boolean;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedIn?: string;
  socialInstagram?: string;
  socialGithub?: string;
  enableAlumniTransition?: boolean; // NEW
}

export interface PostAttachment {
  name: string;
  type: string;
  size: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorAvatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  category: PostCategory;
  targetBranches: Branch[];
  attachments: PostAttachment[];
  likes?: string[];

  // Fields for calendar events
  eventDate?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  eventLocation?: string;
}

// Timetable related types
export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";
export const daysOfWeek: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface TimeSlotDescriptor {
  time: string;
  label: string;
  isBreak: boolean;
}

export const timeSlotDescriptors: TimeSlotDescriptor[] = [
  { time: "9:00 AM - 9:50 AM", label: "Period 1", isBreak: false },
  { time: "9:50 AM - 10:40 AM", label: "Period 2", isBreak: false },
  { time: "10:40 AM - 11:00 AM", label: "Short Break", isBreak: true },
  { time: "11:00 AM - 11:50 AM", label: "Period 3", isBreak: false },
  { time: "11:50 AM - 12:40 PM", label: "Period 4", isBreak: false },
  { time: "12:40 PM - 1:20 PM", label: "Lunch Break", isBreak: true },
  { time: "1:20 PM - 2:10 PM", label: "Period 5", isBreak: false },
  { time: "2:10 PM - 3:00 PM", label: "Period 6", isBreak: false },
  { time: "3:00 PM - 3:50 PM", label: "Period 7", isBreak: false },
];

export const defaultTimeSlots = timeSlotDescriptors.map((d) => d.time);
export const defaultPeriods = timeSlotDescriptors.length;
export const saturdayLastSlotIndex = timeSlotDescriptors.findIndex(
  (d) => d.label === "Period 4"
);

export interface TimeTableEntry {
  period: number;
  subject: string;
}

export interface TimeTableDaySchedule {
  day: DayOfWeek;
  entries: TimeTableEntry[];
}

export interface TimeTable {
  id: string;
  branch: Branch;
  semester: Semester;
  schedule: TimeTableDaySchedule[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

// Attendance related types
export type AttendanceStatus = 'present' | 'absent';

export interface AttendanceRecord {
    id: string; // unique ID for the record, e.g., `${studentUid}-${date}-${period}`
    studentUid: string;
    studentName: string;
    studentUsn: string;
    date: string; // YYYY-MM-DD
    period: number;
    subject: string;
    status: AttendanceStatus;
    markedByUid: string; // Faculty UID
    branch: Branch;
    semester: Semester;
}

export const ATTENDANCE_STORAGE_KEY = "apsconnect_attendance_records";


// Study Material related types
export interface StudyMaterialAttachment {
  name: string;
  type: string;
  size: number;
  mockFileId: string;
}

export interface StudyMaterial {
  id: string;
  branch: Branch;
  semester: Semester;
  title: string;
  description?: string;
  attachments: StudyMaterialAttachment[];
  uploadedByUid: string;
  uploadedByDisplayName: string;
  uploadedAt: string;
}

export const STUDY_MATERIAL_STORAGE_KEY = "apsconnect_study_materials";


// Assignment related types
export interface AssignmentAttachment {
  name: string;
  type: string;
  size: number;
  mockFileId: string; // Using a mock ID to simulate a stored file reference
}

export interface Assignment {
  id: string;
  branch: Branch;
  semester: Semester;
  title: string;
  description?: string;
  attachments: AssignmentAttachment[];
  dueDate?: string; // Stored as ISO string date (YYYY-MM-DD)
  postedByUid: string;
  postedByDisplayName: string;
  postedAt: string;
}

export const ASSIGNMENT_STORAGE_KEY = "apsconnect_assignments";


// Fee Management related types
export type FeeStatus = 'paid' | 'pending' | 'overdue';
export const feeStatuses: FeeStatus[] = ['paid', 'pending', 'overdue'];

export interface FeeRecord {
  id: string;
  studentUid: string;
  studentName: string;
  studentUsn: string;
  branch: Branch;
  semester: Semester;
  description: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: FeeStatus;
  paidOn?: string; // YYYY-MM-DD
  createdAt: string; // ISO String
  createdByUid: string;
}

export const FEE_STORAGE_KEY = "apsconnect_fee_records";

// Subject Management related types
export interface Subject {
  id: string; // Composite key: `${branch}_${semester}_${code}`
  name: string;
  code: string;
  branch: Branch;
  semester: Semester;
  assignedFacultyUids: string[];
}

export const SUBJECT_STORAGE_KEY = "apsconnect_subjects";


// Search related types
export type SearchResultItem =
  | ({ type: "post" } & Post)
  | ({ type: "user" } & UserProfile)
  | ({ type: "timetable" } & TimeTable)
  | ({ type: "studymaterial" } & StudyMaterial);

export interface SearchResults {
  posts: Post[];
  users: UserProfile[];
  timetables: TimeTable[];
  studyMaterials: StudyMaterial[];
}

// Anonymous Reporting System Types
export type ReportRecipientType = "faculty" | "admin";
export type ReportStatus = "new" | "viewed" | "resolved" | "archived";

export interface Report {
  id: string;
  recipientType: ReportRecipientType;
  reportContent: string;
  submittedAt: string;
  status: ReportStatus;

  contextBranch?: Branch;
  contextSemester?: Semester;

  submittedByUid: string;
  submittedByName?: string;
  submittedByUsn?: string;

  viewedAt?: string;
  resolvedAt?: string;
  resolvedByUid?: string;
  resolutionNotes?: string;
}

export const REPORT_STORAGE_KEY = "apsconnect_reports";

// Clubs (Groups) related types
export type GroupType = 'official' | 'student';

export interface Group {
    id: string; // e.g., 'CSE_3rd-Sem_official' or 'ISE_5th-Sem_student'
    name: string;
    type: GroupType;
    branch: Branch;
    semester: Semester;
    description: string;
}

export interface GroupMessage {
    id: string; // UUID
    groupId: string;
    authorUid: string;
    authorName: string;
    authorAvatarUrl?: string;
    content: string;
    timestamp: string; // ISO String
}

export const GROUP_MESSAGES_STORAGE_KEY = 'apsconnect_group_messages';

// Skill Build Courses
export interface SkillBuildCourse {
  id: string;
  title: string;
  description: string;
  websiteUrl?: string;
  facultyId: string;
  facultyName: string;
  createdAt: string;
  enrolledStudentUids: string[];
}
export const SKILL_BUILD_STORAGE_KEY = 'apsconnect_skill_build_courses';

// Fundraising types
export interface FundraisingCampaign {
  id: string;
  title: string;
  description: string;
  qrCodeDataUrl: string; // Store QR code as a data URL
  contactDetails: string; // Simple text field for contact info
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  targetBranches: Branch[];
  createdByUid: string; // Faculty who created it
  createdAt: string;
}

export type StudentPaymentStatus = 'paid' | 'not_paid' | 'pending';

export interface StudentFundraisingStatus {
  campaignId: string;
  studentUid: string;
  status: StudentPaymentStatus;
  remarks?: string;
  updatedAt: string;
}

export const FUNDRAISING_CAMPAIGN_STORAGE_KEY = "apsconnect_fundraising_campaigns";
export const STUDENT_FUNDRAISING_STATUS_STORAGE_KEY = "apsconnect_student_fundraising_status";


// In-App Notifications
export type NotificationType =
  | 'approval'
  | 'assignment_deadline'
  | 'fee_due'
  | 'low_attendance';

export interface Notification {
  id: string; // Unique ID, e.g., `${userId}-${type}-${relatedId}`
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string; // Link to the relevant page
  createdAt: string; // ISO String
  isRead: boolean;
}

export const NOTIFICATION_STORAGE_KEY = 'apsconnect_notifications';
