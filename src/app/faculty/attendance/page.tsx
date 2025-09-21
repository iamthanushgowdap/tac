
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { UserProfile, Branch, Semester, Subject, AttendanceRecord, AttendanceStatus } from '@/types';
import { ATTENDANCE_STORAGE_KEY, SUBJECT_STORAGE_KEY, timeSlotDescriptors } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Info, ArrowLeft, Calendar, Save } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type StudentAttendanceStatus = {
  student: UserProfile;
  status: AttendanceStatus | 'unmarked';
};

export default function FacultyAttendancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [pageLoading, setPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>(undefined);
  
  const [classStudents, setClassStudents] = useState<StudentAttendanceStatus[]>([]);
  
  const facultyAssignedBranches = useMemo(() => user?.assignedBranches || [], [user]);

  const fetchFacultySubjects = useCallback(() => {
    if (typeof window !== 'undefined' && user) {
      const allSubjectsStr = localStorage.getItem(SUBJECT_STORAGE_KEY);
      const allSubjects: Subject[] = allSubjectsStr ? JSON.parse(allSubjectsStr) : [];
      const assignedSubjects = allSubjects.filter(s => s.assignedFacultyUids.includes(user.uid));
      setFacultySubjects(assignedSubjects);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchFacultySubjects();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchFacultySubjects]);

  const loadStudentsForClass = useCallback(() => {
    if (!selectedSubjectId || selectedPeriod === undefined) {
      setClassStudents([]);
      return;
    }

    const subject = facultySubjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    const students: UserProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
            try {
              const profile = JSON.parse(localStorage.getItem(key)!);
              if (profile.role === 'student' && profile.branch === subject.branch && profile.semester === subject.semester && profile.isApproved) {
                  students.push(profile);
              }
            } catch(e) {/* ignore */}
        }
    }

    students.sort((a, b) => (a.usn || "").localeCompare(b.usn || ""));
    
    const storedAttendance: AttendanceRecord[] = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]') as AttendanceRecord[];
    const studentStatuses: StudentAttendanceStatus[] = students.map(student => {
        const record = storedAttendance.find(rec => 
            rec.studentUid === student.uid && 
            isSameDay(new Date(rec.date), new Date()) && 
            rec.period === selectedPeriod
        );
        return { student, status: record?.status || 'unmarked' };
    });
    setClassStudents(studentStatuses);
  }, [selectedSubjectId, selectedPeriod, facultySubjects]);
  
  useEffect(() => {
    loadStudentsForClass();
  }, [loadStudentsForClass]);

  const handleStatusChange = (studentUid: string, newStatus: AttendanceStatus) => {
    setClassStudents(prev => prev.map(s => s.student.uid === studentUid ? {...s, status: newStatus} : s));
  };
  
  const handleMarkAll = (status: AttendanceStatus) => {
    setClassStudents(prev => prev.map(s => ({...s, status})));
  }

  const saveAttendance = () => {
    const subject = facultySubjects.find(s => s.id === selectedSubjectId);
    if (!subject || selectedPeriod === undefined || !user) return;
    setIsSaving(true);
    
    const storedAttendance = JSON.parse(localStorage.getItem(ATTENDANCE_STORAGE_KEY) || '[]') as AttendanceRecord[];
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    
    const updatedAttendance = [...storedAttendance];

    classStudents.forEach(({student, status}) => {
        if(status === 'unmarked') return;

        const recordId = `${student.uid}-${dateStr}-${selectedPeriod}`;
        const existingRecordIndex = updatedAttendance.findIndex(rec => rec.id === recordId);
        
        const newRecord: AttendanceRecord = {
            id: recordId,
            studentUid: student.uid,
            studentName: student.displayName || 'N/A',
            studentUsn: student.usn || 'N/A',
            date: dateStr,
            period: selectedPeriod,
            subject: subject.name,
            status: status,
            markedByUid: user.uid,
            branch: subject.branch,
            semester: subject.semester,
        };

        if (existingRecordIndex > -1) {
            updatedAttendance[existingRecordIndex] = newRecord;
        } else {
            updatedAttendance.push(newRecord);
        }
    });

    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(updatedAttendance));
    setIsSaving(false);
    toast({ title: 'Attendance Saved', description: `Attendance for ${subject.name} has been updated.`});
  };


  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || user.role !== 'faculty') {
    return <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card></div>;
  }

  if (facultyAssignedBranches.length === 0) {
    return <div className="container mx-auto px-4 py-8"><Card className="max-w-lg mx-auto shadow-lg"><CardHeader><CardTitle className="text-primary flex items-center"><Info className="mr-2 h-6 w-6" /> No Assigned Branches</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">You are not assigned to any branches. Please contact an administrator to mark attendance.</p><Link href="/faculty"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link></CardContent></Card></div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><UserCheck className="mr-3 h-7 w-7" /> Mark Attendance</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-muted-foreground mb-8">Select a subject and period to mark student attendance for today, {format(new Date(), "PPP")}.</p>
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Select onValueChange={setSelectedSubjectId} value={selectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select a subject you teach" /></SelectTrigger>
                <SelectContent>
                    {facultySubjects.length > 0 ? facultySubjects.map(s => 
                        <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.branch} - {s.semester})
                        </SelectItem>)
                    : <SelectItem value="-" disabled>No subjects assigned to you.</SelectItem>}
                </SelectContent>
            </Select>
            <Select onValueChange={(v) => setSelectedPeriod(Number(v))} value={selectedPeriod?.toString()} disabled={!selectedSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select a period" /></SelectTrigger>
                <SelectContent>
                    {timeSlotDescriptors.map((slot, index) => 
                        !slot.isBreak && <SelectItem key={index} value={index.toString()}>{slot.label} ({slot.time})</SelectItem>
                    )}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {selectedSubjectId && selectedPeriod !== undefined && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Student List for {facultySubjects.find(s => s.id === selectedSubjectId)?.name}</CardTitle>
            <CardDescription>{facultySubjects.find(s => s.id === selectedSubjectId)?.branch} - {facultySubjects.find(s => s.id === selectedSubjectId)?.semester} | Period: {selectedPeriod + 1}</CardDescription>
            <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('present')}>Mark All Present</Button>
                <Button size="sm" variant="outline" onClick={() => handleMarkAll('absent')}>Mark All Absent</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>USN</TableHead><TableHead>Name</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {classStudents.length > 0 ? classStudents.map(({ student, status }) => (
                  <TableRow key={student.uid}>
                    <TableCell>{student.usn}</TableCell>
                    <TableCell>{student.displayName}</TableCell>
                    <TableCell className="flex justify-center items-center gap-4">
                        <Button onClick={() => handleStatusChange(student.uid, 'present')} variant={status === 'present' ? 'default' : 'outline'} size="sm">Present</Button>
                        <Button onClick={() => handleStatusChange(student.uid, 'absent')} variant={status === 'absent' ? 'destructive' : 'outline'} size="sm">Absent</Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={3} className="text-center h-24">No approved students found for this class.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-6 flex justify-end">
              <Button onClick={saveAttendance} disabled={isSaving || classStudents.length === 0}>
                {isSaving ? <SimpleRotatingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4"/>}
                Save Attendance
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    