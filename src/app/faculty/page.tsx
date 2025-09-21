
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCircle, ShieldCheck, FileText, FilePlus2, ArrowRight, Newspaper, CalendarClock, BookOpen, ListChecks, Wrench, Sparkles, BookMarked, UserCheck, CreditCard, BrainCircuit, Handshake, Briefcase, BarChart, HandCoins } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { useAuth, User } from "@/components/auth-provider";
import { DownloadAppSection } from "@/components/layout/download-app-section";
import { SimpleRotatingSpinner } from "@/components/ui/loading-spinners";

export default function FacultyDashboardPage() {
  const router = useRouter();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [facultyUser, setFacultyUser] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (authUser && authUser.role === 'faculty') {
        setFacultyUser(authUser);
      } else if (authUser && authUser.role !== 'faculty') {
        router.push('/dashboard'); 
      } else {
        router.push('/login'); 
      }
      setPageLoading(false);
    }
  }, [authUser, authLoading, router]);

  const allTools = [
    { title: "Manage Students", description: "View, approve, and manage student accounts within your assigned branches.", icon: <Users />, link: "/faculty/user-management", actionText: "Manage Students" },
    { title: "Mark Attendance", description: "Take daily attendance for your assigned subjects and classes.", icon: <UserCheck />, link: "/faculty/attendance", actionText: "Take Attendance" },
    { title: "Track Fee Status", description: "View fee payment status for students in your assigned branches.", icon: <CreditCard />, link: "/faculty/fee-management", actionText: "Track Fees" },
    { title: "Assignments", description: "Create, edit, and manage assignments for your classes.", icon: <BookMarked />, link: "/faculty/assignments", actionText: "Manage Assignments" },
    { title: "Fundraising", description: "Create and manage fundraising campaigns for your students.", icon: <HandCoins />, link: "/faculty/fundraising", actionText: "Manage Campaigns" },
    { title: "Skill Build Courses", description: "Upload and manage skill-building courses for students.", icon: <Briefcase />, link: "/faculty/skill-build-courses", actionText: "Manage Courses" },
    { title: "View Timetables", description: "View class schedules for your assigned branches.", icon: <CalendarClock />, link: "/faculty/timetables", actionText: "View Timetables" },
    { title: "Study Materials", description: "Upload and manage study materials for your branches.", icon: <BookOpen />, link: "/faculty/study-materials", actionText: "Manage Materials" },
    { title: "View Student Reports", description: "Review student-submitted concerns for your branches.", icon: <ListChecks />, link: "/faculty/reports", actionText: "View Reports" },
    { title: "My Profile", description: "View and edit your faculty profile details.", icon: <UserCircle />, link: "/profile/settings", actionText: "View Profile" },
  ];
  
  const filteredTools = useMemo(() => {
      if (!searchQuery) return allTools;
      const lowercasedQuery = searchQuery.toLowerCase();
      return allTools.filter(tool =>
          tool.title.toLowerCase().includes(lowercasedQuery)
      );
  }, [searchQuery, allTools]);


  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!facultyUser) {
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
  
  const assignedBranchesText = facultyUser.assignedBranches && facultyUser.assignedBranches.length > 0 
    ? facultyUser.assignedBranches.join(', ') 
    : 'Not Assigned';

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <header className="text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary mb-2">
          Faculty Dashboard
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground">
          Welcome, {facultyUser.displayName || facultyUser.email}! Manage your students and resources.
        </p>
        <p className="text-sm text-muted-foreground mt-1">Assigned Branches: <span className="font-semibold">{assignedBranchesText}</span></p>
      </header>

       

      <Card className="shadow-xl rounded-xl border border-border/70">
        <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Key Actions</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTools.map(tool => (
                <StyledActionCard
                  key={tool.title}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  link={tool.link}
                  actionText={tool.actionText}
                />
              ))}
            </div>
        </CardContent>
      </Card>
      <DownloadAppSection />
    </div>
  );
}

interface StyledActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode; 
  link: string;
  actionText: string;
  disabled?: boolean;
}

function StyledActionCard({ title, description, icon, link, actionText, disabled = false }: StyledActionCardProps) {
  return (
    <Card className={`shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col rounded-xl border ${disabled ? 'opacity-60 bg-muted/30 dark:bg-muted/10 pointer-events-none' : 'bg-card border-border/70 hover:border-primary/50'}`}>
      <CardHeader className="pb-4 pt-5 px-5">
        <div className="flex items-start space-x-4">
          <div className={`p-3 rounded-full ${disabled ? 'bg-muted dark:bg-muted/30' : 'bg-accent/10 dark:bg-accent/20'}`}>
            {React.cloneElement(icon as React.ReactElement, { className: `h-10 w-10 ${disabled ? 'text-muted-foreground' : 'text-accent'}`})}
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl font-semibold text-foreground">{title}</CardTitle>
            <CardDescription className="text-sm mt-1 text-muted-foreground">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end mt-auto px-5 pb-5">
        <Link href={disabled ? "#" : link} className={`w-full ${disabled ? 'pointer-events-none' : ''}`}>
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base py-3 rounded-lg" disabled={disabled}>
            {actionText} <ArrowRight className="ml-2 h-4 w-4"/>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
