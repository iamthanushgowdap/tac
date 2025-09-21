
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { AttendanceRecord, Branch, Semester, UserProfile } from '@/types';
import { ATTENDANCE_STORAGE_KEY, defaultBranches, semesters } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Filter, ArrowLeft, Search as SearchIcon } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { addDays, format, isWithinInterval, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

export default function AdminAttendanceAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);

  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    setDateRange({ from: addDays(new Date(), -7), to: new Date() });
  }, []);

  const fetchRecords = useCallback(() => {
    if (typeof window !== 'undefined') {
      const recordsStr = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      const records: AttendanceRecord[] = recordsStr ? JSON.parse(recordsStr) : [];
      setAllRecords(records);
      
      const studentsArr: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
          try {
            const profile = JSON.parse(localStorage.getItem(key)!) as UserProfile;
            if(profile.role === 'student' || (profile.role === 'pending' && profile.isApproved)) {
              studentsArr.push(profile);
            }
          } catch(e) {}
        }
      }
      setAllStudents(studentsArr);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchRecords();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchRecords]);

  useEffect(() => {
    let tempRecords = [...allRecords];
    if (selectedBranch !== 'all') {
      tempRecords = tempRecords.filter(r => r.branch === selectedBranch);
    }
    if (selectedSemester !== 'all') {
      tempRecords = tempRecords.filter(r => r.semester === selectedSemester);
    }
    if (selectedStudent !== 'all') {
      tempRecords = tempRecords.filter(r => r.studentUid === selectedStudent);
    }
    if (dateRange?.from && dateRange?.to) {
      tempRecords = tempRecords.filter(r => isWithinInterval(startOfDay(new Date(r.date)), { start: startOfDay(dateRange.from!), end: startOfDay(dateRange.to!) }));
    }
    setFilteredRecords(tempRecords);
  }, [allRecords, selectedBranch, selectedSemester, selectedStudent, dateRange]);
  
  const chartData = useMemo(() => {
    const dailyData: { [date: string]: { present: number, absent: number } } = {};
    filteredRecords.forEach(record => {
        if (!dailyData[record.date]) {
            dailyData[record.date] = { present: 0, absent: 0 };
        }
        if (record.status === 'present') dailyData[record.date].present++;
        else dailyData[record.date].absent++;
    });

    return Object.entries(dailyData).map(([date, counts]) => ({
      date: format(new Date(date), 'MMM d'),
      Present: counts.present,
      Absent: counts.absent,
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRecords]);

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card></div>
    );
  }

  const studentsForFilter = selectedBranch === 'all' && selectedSemester === 'all'
    ? allStudents
    : allStudents.filter(s => 
        (selectedBranch === 'all' || s.branch === selectedBranch) &&
        (selectedSemester === 'all' || s.semester === selectedSemester)
      );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><UserCheck className="mr-3 h-7 w-7" /> Attendance Analytics</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-muted-foreground mb-8">Analyze student attendance records with filters and charts.</p>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter Data</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}><SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{defaultBranches.map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}><SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger><SelectContent><SelectItem value="all">All Semesters</SelectItem>{semesters.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}><SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger><SelectContent><SelectItem value="all">All Students</SelectItem>{studentsForFilter.map(s=><SelectItem key={s.uid} value={s.uid}>{s.displayName} ({s.usn})</SelectItem>)}</SelectContent></Select>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardHeader>
      </Card>
      
      <Card className="shadow-lg mb-8">
          <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Number of present vs. absent markings over the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
              {chartData.length > 0 ? (
                 <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Legend />
                            <Line type="monotone" dataKey="Present" stroke="hsl(var(--chart-1))" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="Absent" stroke="hsl(var(--chart-2))" />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
              ) : <p className="text-muted-foreground text-center py-10">No data available for the selected filters to display a chart.</p>}
          </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Detailed Records</CardTitle>
          <CardDescription>Showing {filteredRecords.length} records matching the current filters.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>USN</TableHead><TableHead>Date</TableHead><TableHead>Subject</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead>Marked By</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredRecords.length > 0 ? filteredRecords.map(rec => (
                  <TableRow key={rec.id}>
                    <TableCell>{rec.studentName}</TableCell>
                    <TableCell>{rec.studentUsn}</TableCell>
                    <TableCell>{format(new Date(rec.date), 'PPP')}</TableCell>
                    <TableCell>{rec.subject}</TableCell>
                    <TableCell>{rec.period}</TableCell>
                    <TableCell><Badge variant={rec.status === 'present' ? 'default' : 'destructive'} className="capitalize">{rec.status}</Badge></TableCell>
                    <TableCell>{allStudents.find(s=>s.uid === rec.markedByUid)?.displayName || rec.markedByUid}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={7} className="text-center h-24">No records found for the selected filters.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
