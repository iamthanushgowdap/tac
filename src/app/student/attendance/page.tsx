
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { AttendanceRecord, Branch, Semester } from '@/types';
import { ATTENDANCE_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Info, AlertTriangle, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SubjectAttendance {
  subject: string;
  present: number;
  total: number;
  percentage: number;
}

export default function StudentAttendancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  
  const [studentDetails, setStudentDetails] = useState<{ branch?: Branch, semester?: Semester, isProfileComplete: boolean }>({ isProfileComplete: false });
  const [subjectWiseAttendance, setSubjectWiseAttendance] = useState<SubjectAttendance[]>([]);

  const calculateAttendance = useCallback(() => {
    if (!user || !user.branch || !user.semester || typeof window === 'undefined') return;
    
    const storedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    const allRecords: AttendanceRecord[] = storedAttendance ? JSON.parse(storedAttendance) : [];
    const studentRecords = allRecords.filter(rec => rec.studentUid === user.uid);

    const subjectMap: { [key: string]: { present: number; total: number } } = {};
    studentRecords.forEach(record => {
      if (!subjectMap[record.subject]) {
        subjectMap[record.subject] = { present: 0, total: 0 };
      }
      subjectMap[record.subject].total++;
      if (record.status === 'present') {
        subjectMap[record.subject].present++;
      }
    });

    const calculatedData = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      present: data.present,
      total: data.total,
      percentage: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));
    setSubjectWiseAttendance(calculatedData);
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user && (user.role === 'student' || user.role === 'pending')) {
        const isProfileCompleteForAttendance = !!(user.branch && user.semester);
        setStudentDetails({
          branch: user.branch,
          semester: user.semester,
          isProfileComplete: isProfileCompleteForAttendance,
        });
        if (isProfileCompleteForAttendance) {
          calculateAttendance();
        }
        setPageLoading(false);
      } else {
        router.push(user ? '/dashboard' : '/login');
      }
    }
  }, [user, authLoading, router, calculateAttendance]);
  
  useEffect(() => {
    // This effect listens for changes in local storage from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ATTENDANCE_STORAGE_KEY && user) {
        calculateAttendance();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, calculateAttendance]);


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
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  if (user.role === 'pending' && !user.rejectionReason) {
    return (
        <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg border-yellow-400"><CardHeader><CardTitle className="text-yellow-600 flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Your account is pending approval. Attendance data will be available once approved.</p><Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link></CardContent></Card></div>
    );
  }

  if (!studentDetails.isProfileComplete && user.role === 'student') { 
    return (
        <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg border-orange-400"><CardHeader><CardTitle className="text-orange-600 flex items-center justify-center"><Info className="mr-2 h-6 w-6" />Profile Incomplete</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Your profile is incomplete. Please contact administration to update your details. Attendance cannot be displayed.</p><Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link></CardContent></Card></div>
    );
  }
  
  const overallPresent = subjectWiseAttendance.reduce((sum, sub) => sum + sub.present, 0);
  const overallTotal = subjectWiseAttendance.reduce((sum, sub) => sum + sub.total, 0);
  const overallPercentage = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><UserCheck className="mr-3 h-7 w-7" /> My Attendance</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-muted-foreground mb-8">View your overall and subject-wise attendance.</p>
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Overall Attendance</CardTitle>
          <CardDescription>{overallPresent} / {overallTotal} classes attended</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={overallPercentage} className="h-4" indicatorClassName={getProgressColor(overallPercentage)} />
          <p className="text-right text-lg font-bold mt-2">{overallPercentage}%</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Subject-wise Attendance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectWiseAttendance.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No attendance has been marked for you yet.</p>
          ) : (
            <>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectWiseAttendance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" angle={-45} textAnchor="end" height={100} interval={0} />
                    <YAxis domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}/>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                    <Legend />
                    <Bar dataKey="percentage" name="Attendance %" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-8 space-y-4">
                {subjectWiseAttendance.map(sub => (
                  <div key={sub.subject}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium">{sub.subject}</p>
                      <p className="text-sm text-muted-foreground">{sub.present}/{sub.total} classes</p>
                    </div>
                    <Progress value={sub.percentage} indicatorClassName={getProgressColor(sub.percentage)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
