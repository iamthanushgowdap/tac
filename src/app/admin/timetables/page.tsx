
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { TimetableForm } from '@/components/timetables/timetable-form';
import { TimetableView } from '@/components/timetables/timetable-view';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, CalendarDays, Eye, Edit, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Branch, Semester, TimeTable } from '@/types';
import { defaultBranches, semesters } from '@/types';

const TIMETABLE_STORAGE_KEY_PREFIX = 'apsconnect_timetable_';
const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches';

export default function AdminTimetablePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);

  const [availableBranchesForView, setAvailableBranchesForView] = useState<Branch[]>(defaultBranches);
  const [viewBranch, setViewBranch] = useState<Branch | undefined>(undefined);
  const [viewSemester, setViewSemester] = useState<Semester | undefined>(semesters.length > 0 ? semesters[0] : undefined);
  const [currentViewTimetable, setCurrentViewTimetable] = useState<TimeTable | null>(null);
  const [viewDataLoading, setViewDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("view");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedBranches = localStorage.getItem(BRANCH_STORAGE_KEY);
      let branchesToSet = defaultBranches;
      if (storedBranches) {
        try {
          const parsed = JSON.parse(storedBranches);
          if (Array.isArray(parsed) && parsed.length > 0) {
            branchesToSet = parsed;
          }
        } catch (e) { 
          console.error("Error parsing managed branches:", e);
        }
      }
      setAvailableBranchesForView(branchesToSet);
      if (!viewBranch && branchesToSet.length > 0) {
        setViewBranch(branchesToSet[0]);
      }
    }
  }, [viewBranch]); 

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router]);


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
    if (!pageLoading && user?.role === 'admin' && activeTab === "view") { 
        loadTimetableForView();
    }
  }, [loadTimetableForView, pageLoading, user, activeTab, viewBranch, viewSemester]);
  
  const handleTimetableUpdate = () => {
    if (activeTab === "view") { 
        loadTimetableForView();
    }
  };


  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
          <CalendarDays className="mr-3 h-7 w-7" />
          Timetable Management
        </h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">
        View existing timetables or create/update new ones for different branches and semesters.
      </p>

      <Tabs defaultValue="view" className="w-full" onValueChange={setActiveTab} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="view" className="flex items-center gap-2"><Eye className="h-4 w-4"/> View Timetable</TabsTrigger>
          <TabsTrigger value="edit" className="flex items-center gap-2"><Edit className="h-4 w-4"/> Create/Update Timetable</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>View Existing Timetable</CardTitle>
              <ShadCnCardDescription>Select a branch and semester to view its current timetable.</ShadCnCardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="view-branch-select" className="block text-sm font-medium text-muted-foreground mb-1">Branch</label>
                  <Select onValueChange={(value) => setViewBranch(value as Branch)} value={viewBranch}>
                    <SelectTrigger id="view-branch-select"><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {availableBranchesForView.length > 0 ? availableBranchesForView.map(b => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      )) : <SelectItem value="-" disabled>No branches available</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="view-semester-select" className="block text-sm font-medium text-muted-foreground mb-1">Semester</label>
                  <Select onValueChange={(value) => setViewSemester(value as Semester)} value={viewSemester}>
                    <SelectTrigger id="view-semester-select"><SelectValue placeholder="Select semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <TimetableView 
                timetable={currentViewTimetable} 
                isLoading={viewDataLoading} 
                displayContext={{ branch: viewBranch, semester: viewSemester}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <TimetableForm role="admin" onTimetableUpdate={handleTimetableUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
