
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider'; 
import { useRouter } from 'next/navigation';
import type { TimeTable, Branch, Semester } from '@/types';
import { TimetableView } from '@/components/timetables/timetable-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, Info, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';

const TIMETABLE_STORAGE_KEY_PREFIX = 'apsconnect_timetable_';

export default function StudentTimetablePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [timetable, setTimetable] = useState<TimeTable | null>(null);
  const [studentDetails, setStudentDetails] = useState<{branch?: Branch, semester?: Semester, isProfileComplete: boolean}>({ isProfileComplete: false });

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'student' && user.role !== 'pending')) {
        router.push(user ? '/dashboard' : '/login');
        return;
      }

      const isProfileCompleteForTimetable = !!(user.branch && user.semester);
      setStudentDetails({ 
        branch: user.branch, 
        semester: user.semester,
        isProfileComplete: isProfileCompleteForTimetable
      });

      if (user.role === 'pending' && !user.rejectionReason) {
        setPageLoading(false);
        return; 
      }
      
      if (user.role === 'student' && isProfileCompleteForTimetable && user.branch && user.semester) {
        if (typeof window !== 'undefined') {
          const key = `${TIMETABLE_STORAGE_KEY_PREFIX}${user.branch}_${user.semester}`;
          const storedData = localStorage.getItem(key);
          if (storedData) {
            try {
              setTimetable(JSON.parse(storedData));
            } catch (error) {
              console.error("Error parsing timetable for student:", error);
              setTimetable(null);
            }
          } else {
            setTimetable(null); 
          }
        }
      }
      setPageLoading(false);
    }
  }, [user, authLoading, router]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'student' && user.role !== 'pending')) {
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
  
  if (user.role === 'pending' && !user.rejectionReason) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-yellow-400">
                <CardHeader><CardTitle className="text-yellow-600 text-xl sm:text-2xl flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-md sm:text-lg text-muted-foreground">
                        Your account is pending approval. The timetable will be available once your account is approved.
                    </p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!studentDetails.isProfileComplete && user.role === 'student') { 
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-orange-400">
                <CardHeader><CardTitle className="text-orange-600 text-xl sm:text-2xl flex items-center justify-center"><Info className="mr-2 h-6 w-6" />Profile Incomplete</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-md sm:text-lg text-muted-foreground">
                        Your profile information (branch or semester) is incomplete. Please contact administration to update your details. The timetable cannot be displayed.
                    </p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <TimetableView 
        timetable={timetable} 
        isLoading={pageLoading} 
        studentBranch={studentDetails.branch}
        studentSemester={studentDetails.semester}
      />
    </div>
  );
}
