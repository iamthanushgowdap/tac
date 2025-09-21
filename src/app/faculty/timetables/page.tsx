
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { TimetableView } from '@/components/timetables/timetable-view';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, Info, CalendarDays, Eye, Edit, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Branch, Semester, TimeTable } from '@/types';
import { semesters } from '@/types';

const TIMETABLE_STORAGE_KEY_PREFIX = 'apsconnect_timetable_';

export default function FacultyTimetablePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  
  const facultyBranches = user?.assignedBranches || [];

  const [viewBranch, setViewBranch] = useState<Branch | undefined>(undefined);
  const [viewSemester, setViewSemester] = useState<Semester | undefined>(semesters.length > 0 ? semesters[0] : undefined);
  const [currentViewTimetable, setCurrentViewTimetable] = useState<TimeTable | null>(null);
  const [viewDataLoading, setViewDataLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
        return;
      }
      if (facultyBranches.length > 0 && !viewBranch) {
        setViewBranch(facultyBranches[0]);
      }
      setPageLoading(false);
    }
  }, [user, authLoading, router, facultyBranches, viewBranch]);

  const loadTimetableForView = useCallback(() => {
    if (viewBranch && viewSemester && typeof window !== 'undefined') {
      setViewDataLoading(true);
      const key = `${TIMETABLE_STORAGE_KEY_PREFIX}${viewBranch}_${viewSemester}`;
      const storedData = localStorage.getItem(key);
      if (storedData) {
        try {
          setCurrentViewTimetable(JSON.parse(storedData));
        } catch (error) {
          console.error("Error parsing timetable for view:", error);
          setCurrentViewTimetable(null);
        }
      } else {
        setCurrentViewTimetable(null);
      }
      setViewDataLoading(false);
    } else {
      setCurrentViewTimetable(null);
    }
  }, [viewBranch, viewSemester]);

  useEffect(() => {
     if (!pageLoading && user?.role === 'faculty') {
        loadTimetableForView();
     }
  }, [loadTimetableForView, pageLoading, user]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'faculty') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle></CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!facultyBranches || facultyBranches.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary text-xl sm:text-2xl flex items-center">
              <Info className="mr-2 h-6 w-6" /> No Assigned Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-md text-muted-foreground">
              You are not currently assigned to any branches. Please contact an administrator to view timetables.
            </p>
            <Link href="/faculty">
              <Button variant="outline" className="mt-6">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
          <CalendarDays className="mr-3 h-7 w-7" />
          View Timetables
        </h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">
        View class schedules for your assigned branches.
      </p>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>View Existing Timetable</CardTitle>
          <ShadCnCardDescription>Select one of your assigned branches and a semester to view its current timetable.</ShadCnCardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="view-faculty-branch-select" className="block text-sm font-medium text-muted-foreground mb-1">Branch</label>
              <Select onValueChange={(value) => setViewBranch(value as Branch)} value={viewBranch} >
                <SelectTrigger id="view-faculty-branch-select"><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {facultyBranches.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
                <label htmlFor="view-faculty-semester-select" className="block text-sm font-medium text-muted-foreground mb-1">Semester</label>
              <Select onValueChange={(value) => setViewSemester(value as Semester)} value={viewSemester}>
                <SelectTrigger id="view-faculty-semester-select"><SelectValue placeholder="Select semester" /></SelectTrigger>
                <SelectContent>
                  {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <TimetableView 
            timetable={currentViewTimetable} 
            isLoading={viewDataLoading} 
            displayContext={{ branch: viewBranch, semester: viewSemester }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
