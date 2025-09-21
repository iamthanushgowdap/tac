
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, User } from "@/components/auth-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck,
  UserCircle,
  Bell,
  AlertTriangle,
  Newspaper,
  BookOpen,
  CalendarClock,
  MessageSquareWarning,
  Wrench,
  FileText,
  ArrowRight,
  Sparkles,
  BookMarked,
  UserCheck,
  CreditCard,
  Users as UsersIcon,
  Briefcase,
  BarChart,
  GraduationCap,
  HandCoins,
} from "lucide-react";
import type { Post, UserProfile, UserRole } from "@/types";
import { DownloadAppSection } from "@/components/layout/download-app-section";
import { SquidGameLoader } from "@/components/ui/loading-spinners";
import { RecentPostItem } from '@/components/dashboard/RecentPostItem';
import { ActionCard } from '@/components/dashboard/ActionCard';
import { useToast } from "@/hooks/use-toast";

const SITE_SETTINGS_STORAGE_KEY = 'apsconnect_site_settings_v1';

// StudentDashboardPage Component
export default function StudentDashboardPage() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading, updateUserContext } = useAuth();
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [alumniTransitionEnabled, setAlumniTransitionEnabled] = useState(false);
  const { toast } = useToast();
  
  const fetchStudentData = useCallback(() => {
    if (!authUser) return;

    const userProfileKey = `apsconnect_user_${authUser.uid}`;
    const profileStr = typeof window !== 'undefined' ? localStorage.getItem(userProfileKey) : null;
    let latestUser: User | null = null;
    if (profileStr) {
        const fullProfile = JSON.parse(profileStr) as UserProfile;
        const newRole = checkForAlumniStatus(fullProfile);
        if (newRole !== fullProfile.role) {
            fullProfile.role = newRole;
            localStorage.setItem(userProfileKey, JSON.stringify(fullProfile));
        }
        latestUser = {
            ...authUser,
            displayName: fullProfile.displayName,
            role: newRole,
            isApproved: fullProfile.isApproved,
            rejectionReason: fullProfile.rejectionReason,
            branch: fullProfile.branch,
            semester: fullProfile.semester,
        };
        setStudentUser(latestUser);
        if (authUser.role !== newRole || authUser.rejectionReason !== fullProfile.rejectionReason) {
            updateUserContext(latestUser);
        }
    } else {
        setStudentUser(authUser);
    }

  }, [authUser, updateUserContext]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const settingsStr = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
        if (settingsStr) {
            const settings = JSON.parse(settingsStr);
            setAlumniTransitionEnabled(settings.enableAlumniTransition === true);
        }
    }

    if (!authLoading) {
      if (authUser && (authUser.role === 'student' || authUser.role === 'pending' || authUser.role === 'alumni')) {
        fetchStudentData();
      } else if (authUser) { 
        router.push('/dashboard'); 
      } else { 
        router.push('/login');
      }
      setPageLoading(false);
    }
  }, [authUser, authLoading, router, fetchStudentData]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === `apsconnect_user_${authUser?.uid}` || event.key === 'apsconnect_posts') {
            fetchStudentData();
        }
        if (event.key === SITE_SETTINGS_STORAGE_KEY) {
             const settingsStr = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
            if (settingsStr) {
                const settings = JSON.parse(settingsStr);
                setAlumniTransitionEnabled(settings.enableAlumniTransition === true);
            }
        }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [authUser, fetchStudentData]);

  const checkForAlumniStatus = (profile: UserProfile): UserRole => {
    if (profile.role === 'alumni') return 'alumni'; // Already an alumni, no change
    if (profile.role === 'student' && profile.education && profile.education.length > 0) {
      const latestEducation = profile.education.sort((a, b) => parseInt(b.graduationYear) - parseInt(a.graduationYear))[0];
      const gradYear = parseInt(latestEducation.graduationYear);
      const currentYear = new Date().getFullYear();
      if (!isNaN(gradYear) && currentYear > gradYear) {
        return 'alumni';
      }
    }
    return profile.role;
  };

  const handleSwitchToAlumni = () => {
    if (!studentUser) return;

    const userProfileKey = `apsconnect_user_${studentUser.uid}`;
    const profileStr = localStorage.getItem(userProfileKey);
    if (profileStr) {
        const profile = JSON.parse(profileStr) as UserProfile;
        profile.role = 'alumni';
        localStorage.setItem(userProfileKey, JSON.stringify(profile));
        
        const updatedAuthUser = { ...studentUser, role: 'alumni' as UserRole };
        updateUserContext(updatedAuthUser);
        setStudentUser(updatedAuthUser);

        toast({
            title: "Profile Successfully Switched!",
            description: "You are now an Alumni. Please update your placement details in your profile settings.",
            duration: 5000,
        });
        router.push('/profile/settings');
    } else {
        toast({
            title: "Error",
            description: "Could not find your profile to update.",
            variant: "destructive",
        });
    }
  };


  const allTools = [
      { title: "My Profile", description: "View and update your personal information and password.", icon: <UserCircle className="h-10 w-10 text-accent" />, link: "/profile/settings", actionText: "Manage Profile", disabled: !!studentUser?.rejectionReason },
      { title: "My Attendance", description: "View your subject-wise and overall attendance percentage.", icon: <UserCheck className="h-10 w-10 text-accent" />, link: "/student/attendance", actionText: "View Attendance", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "My Fee Details", description: "Check your fee payment status and due dates.", icon: <CreditCard className="h-10 w-10 text-accent" />, link: "/student/fee-details", actionText: "View Fees", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "Assignments", description: "View and download assignments posted by your faculty.", icon: <BookMarked className="h-10 w-10 text-accent" />, link: "/student/assignments", actionText: "View Assignments", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "Fundraising", description: "View and contribute to active fundraising campaigns.", icon: <HandCoins />, link: "/student/fundraising", actionText: "View Campaigns", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "Skill Build Courses", description: "Enroll in new courses and enhance your skills.", icon: <Briefcase />, link: "/student/skill-build-courses", actionText: "View Courses", disabled: studentUser?.role === 'pending' },
      { title: "Alumni & Placements", description: "Connect with alumni and explore career opportunities.", icon: <Briefcase />, link: "/placements", actionText: "Browse Alumni", disabled: studentUser?.role === 'pending' },
      { title: "View Timetable", description: "Check your class and lab schedules for the current semester.", icon: <CalendarClock className="h-10 w-10 text-accent" />, link: "/student/timetable", actionText: "View Timetable", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "Study Materials", description: "Access notes, presentations, and other materials shared by faculty.", icon: <BookOpen className="h-10 w-10 text-accent" />, link: "/student/study-materials", actionText: "View Materials", disabled: studentUser?.role === 'pending' || studentUser?.role === 'alumni' },
      { title: "Clubs & Groups", description: "Access official and student groups for your class.", icon: <UsersIcon className="h-10 w-10 text-accent" />, link: "/clubs", actionText: "View Groups", disabled: studentUser?.role === 'pending' },
      { title: "Report a Concern", description: "Submit anonymous feedback or report issues to faculty/admin.", icon: <MessageSquareWarning className="h-10 w-10 text-accent" />, link: "/student/report-concern", actionText: "Submit Report", disabled: !!studentUser?.rejectionReason },
  ];

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SquidGameLoader className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!studentUser) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-2xl border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-6 border-primary text-primary hover:bg-primary/10">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPendingApproval = studentUser.role === 'pending' && !studentUser.rejectionReason;
  const isRejected = studentUser.role === 'pending' && !!studentUser.rejectionReason;
  const isApprovedStudent = studentUser.role === 'student';
  const isFinalSemesterStudent = studentUser.role === 'student' && studentUser.semester === '8th Sem';
  

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-2">
          Hello, {studentUser.displayName || studentUser.usn}!
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground">
          Welcome to your {studentUser.role === 'alumni' ? 'Alumni' : 'Student'} Dashboard. Access resources and stay updated.
        </p>
        {studentUser.branch && studentUser.role !== 'alumni' && <p className="text-sm text-muted-foreground mt-1">Branch: <span className="font-semibold">{studentUser.branch}</span></p>}
      </header>

      {isPendingApproval && (
        <Card className="mb-8 bg-yellow-50 border-2 border-yellow-400 shadow-lg dark:bg-yellow-900/30 dark:border-yellow-600 rounded-xl">
          <CardHeader className="flex flex-row items-center gap-4 pb-3 pt-5 px-5">
            <Bell className="h-8 w-8 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <CardTitle className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">Account Pending Approval</CardTitle>
              <CardDescription className="text-sm text-yellow-600 dark:text-yellow-400">
                Your registration is under review. Full access will be granted upon approval.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      {isRejected && (
        <Card className="mb-8 bg-red-50 border-2 border-red-400 shadow-lg dark:bg-red-900/30 dark:border-red-600 rounded-xl">
          <CardHeader className="flex flex-row items-center gap-4 pb-3 pt-5 px-5">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
             <div>
              <CardTitle className="text-lg font-semibold text-red-700 dark:text-red-300">Account Registration Rejected</CardTitle>
               <CardDescription className="text-sm text-red-600 dark:text-red-400">
                Reason: {studentUser.rejectionReason}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <p className="text-sm text-red-700 dark:text-red-400">
              If you believe this is an error, please contact the college administration for assistance.
            </p>
          </CardContent>
        </Card>
      )}
      
      {isFinalSemesterStudent && alumniTransitionEnabled && (
          <Card className="mb-8 bg-green-50 border-2 border-green-400 shadow-lg dark:bg-green-900/30 dark:border-green-600 rounded-xl">
              <CardHeader className="flex flex-row items-center gap-4 pb-3 pt-5 px-5">
                  <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                      <CardTitle className="text-lg font-semibold text-green-700 dark:text-green-300">Graduation Tools</CardTitle>
                      <CardDescription className="text-sm text-green-600 dark:text-green-400">
                          Have you graduated? Switch to an Alumni profile to share your placement details and experience.
                      </CardDescription>
                  </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button>
                      <GraduationCap className="mr-2 h-4 w-4"/> Switch to Alumni Profile
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Profile Switch</AlertDialogTitle>
                      <AlertDialogDescription>
                        Have you graduated? Confirming will permanently switch your profile to 'Alumni'. This will allow you to share placement details and experiences. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleSwitchToAlumni}>
                        Confirm Graduation
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
          </Card>
      )}

      <section className="mb-12">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground mb-6 text-center sm:text-left">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTools.map(tool => (
            <ActionCard
              key={tool.title}
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              link={tool.link}
              actionText={tool.actionText}
              disabled={tool.disabled}
            />
          ))}
        </div>
      </section>
      
      <DownloadAppSection />
    </div>
  );
}
