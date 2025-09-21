
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { Assignment, Branch, Semester } from '@/types';
import { ASSIGNMENT_STORAGE_KEY } from '@/types';
import { AssignmentItem } from '@/components/assignments/assignment-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, BookMarked, Info, AlertTriangle, Search, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Input } from '@/components/ui/input';

export default function StudentAssignmentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [studentDetails, setStudentDetails] = useState<{
    branch?: Branch, 
    semester?: Semester, 
    isProfileComplete: boolean
  }>({ isProfileComplete: false });

  const fetchAndFilterAssignments = useCallback(() => {
    if (!user || !studentDetails.branch || !studentDetails.semester) {
        setFilteredAssignments([]);
        return;
    }
    if (typeof window !== 'undefined') {
      const storedAssignments = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
      let assignments: Assignment[] = storedAssignments ? JSON.parse(storedAssignments) : [];
      
      assignments = assignments.filter(a => 
        a.branch === studentDetails.branch && a.semester === studentDetails.semester
      );
      setAllAssignments(assignments.sort((a,b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()));
    }
  }, [user, studentDetails.branch, studentDetails.semester]);

  useEffect(() => {
    if (!authLoading && user) {
      const isProfileCompleteForAssignments = !!(user.branch && user.semester);
      setStudentDetails({
        branch: user.branch,
        semester: user.semester,
        isProfileComplete: isProfileCompleteForAssignments
      });
      
      if (user.role !== 'student' && user.role !== 'pending') {
        router.push('/dashboard');
      } else if (isProfileCompleteForAssignments) {
        fetchAndFilterAssignments();
      }
      setPageLoading(false);
    } else if (!authLoading && !user) {
      router.push('/login');
      setPageLoading(false);
    }
  }, [user, authLoading, router, fetchAndFilterAssignments]);

  useEffect(() => {
    let currentAssignments = [...allAssignments];
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      currentAssignments = currentAssignments.filter(m => 
        m.title.toLowerCase().includes(termLower) ||
        m.description?.toLowerCase().includes(termLower) ||
        m.postedByDisplayName.toLowerCase().includes(termLower) ||
        m.attachments.some(att => att.name.toLowerCase().includes(termLower))
      );
    }
    setFilteredAssignments(currentAssignments);
  }, [allAssignments, searchTerm]);

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
                        Your account is pending approval. Assignments will be available once your account is approved.
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
                        Your profile information (branch or semester) is incomplete. Please contact administration to update your details. Assignments cannot be displayed.
                    </p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
            <BookMarked className="mr-3 h-7 w-7" /> Assignments
        </h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">
        Assignments for your branch: <strong>{studentDetails.branch}</strong>, semester: <strong>{studentDetails.semester}</strong>.
      </p>
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5"/> Search Assignments</CardTitle>
        </CardHeader>
        <CardContent>
           <Input
            type="search"
            placeholder="Search assignments..."
            className="w-full sm:max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search assignments"
            />
        </CardContent>
      </Card>

      {filteredAssignments.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="py-10 text-center">
            <BookMarked className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">
              {searchTerm ? "No assignments match your search." : "No assignments posted for your class yet."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Please check back later.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map(assignment => (
            <AssignmentItem key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}
