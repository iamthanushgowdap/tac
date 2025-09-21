
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { AssignmentForm } from '@/components/assignments/assignment-form';
import type { Assignment, Branch, Semester } from '@/types';
import { ASSIGNMENT_STORAGE_KEY, semesters } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ShieldCheck, BookMarked, PlusCircle, Edit3, Trash2, Download, Search, Info, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function FacultyAssignmentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  
  const memoizedFacultyAssignedBranches = useMemo(() => user?.assignedBranches || [], [user?.assignedBranches]);
  
  const [filterBranch, setFilterBranch] = useState<string>(memoizedFacultyAssignedBranches.length > 0 ? memoizedFacultyAssignedBranches[0] : 'all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAssignments = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedAssignments = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
      let assignments: Assignment[] = storedAssignments ? JSON.parse(storedAssignments) : [];
      if (memoizedFacultyAssignedBranches.length > 0) {
        assignments = assignments.filter(a => memoizedFacultyAssignedBranches.includes(a.branch));
      } else {
        assignments = []; 
      }
      setAllAssignments(assignments.sort((a,b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()));
    }
  }, [memoizedFacultyAssignedBranches]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
      } else {
         if (memoizedFacultyAssignedBranches.length > 0 && filterBranch === 'all') {
            setFilterBranch(memoizedFacultyAssignedBranches[0]);
        }
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, memoizedFacultyAssignedBranches, filterBranch]);

  useEffect(() => {
    if (!pageLoading && user && user.role === 'faculty') {
        fetchAssignments();
    }
  }, [fetchAssignments, pageLoading, user]);
  
  useEffect(() => {
    let currentAssignments = [...allAssignments];
    if (filterBranch !== 'all') {
      currentAssignments = currentAssignments.filter(m => m.branch === filterBranch);
    }
    if (filterSemester !== 'all') {
      currentAssignments = currentAssignments.filter(m => m.semester === filterSemester);
    }
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
  }, [allAssignments, filterBranch, filterSemester, searchTerm]);

  const handleFormSubmitSuccess = (assignment: Assignment) => {
    if (typeof window !== 'undefined') {
        const globalAssignmentsStr = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
        let globalAssignments: Assignment[] = globalAssignmentsStr ? JSON.parse(globalAssignmentsStr) : [];
        const globalIndex = globalAssignments.findIndex(m => m.id === assignment.id);
        if (globalIndex > -1) {
            globalAssignments[globalIndex] = assignment;
        } else {
            globalAssignments.push(assignment);
        }
        localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(globalAssignments));
    }
    fetchAssignments(); // Re-fetch to update the local list
    setIsFormDialogOpen(false);
    setEditingAssignment(null);
  };

  const openEditDialog = (assignment: Assignment) => {
    if (assignment.postedByUid === user?.uid || memoizedFacultyAssignedBranches.includes(assignment.branch)) {
        setEditingAssignment(assignment);
        setIsFormDialogOpen(true);
    } else {
        toast({ title: "Unauthorized", description: "You can only edit assignments for your assigned branches or those you posted.", variant: "destructive"});
    }
  };

  const openCreateDialog = () => {
    setEditingAssignment(null);
    setIsFormDialogOpen(true);
  };

  const confirmDeleteAssignment = (assignment: Assignment) => {
     if (assignment.postedByUid === user?.uid || memoizedFacultyAssignedBranches.includes(assignment.branch)) {
        setAssignmentToDelete(assignment);
    } else {
        toast({ title: "Unauthorized", description: "You can only delete assignments for your assigned branches or those you posted.", variant: "destructive"});
    }
  };

  const handleDeleteAssignment = () => {
    if (!assignmentToDelete) return;
    
    if (typeof window !== 'undefined') {
        const globalAssignmentsStr = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
        let globalAssignments: Assignment[] = globalAssignmentsStr ? JSON.parse(globalAssignmentsStr) : [];
        globalAssignments = globalAssignments.filter(m => m.id !== assignmentToDelete.id);
        localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(globalAssignments));
    }

    fetchAssignments(); // Re-fetch to update local state
    toast({ title: "Success", description: `Assignment "${assignmentToDelete.title}" deleted.`, duration: 3000 });
    setAssignmentToDelete(null);
  };
  
  const handleDownloadAttachment = (attachment: Assignment['attachments'][0]) => {
    toast({ title: "Download Started (Mock)", description: `Downloading ${attachment.name}... This is a mock.`, duration: 3000 });
    const blob = new Blob(["Mock file content for " + attachment.name], { type: attachment.type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };


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
  
  if (memoizedFacultyAssignedBranches.length === 0) {
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
              You are not currently assigned to any branches. Please contact an administrator to manage assignments.
            </p>
            <Link href="/faculty"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
            <BookMarked className="mr-3 h-7 w-7" /> Assignment Management
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Assignment
            </Button>
             <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </div>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">Create, view, and manage assignments for your assigned branches.</p>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Filter &amp; Search Assignments</CardTitle>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger><SelectValue placeholder="Filter by Branch" /></SelectTrigger>
              <SelectContent>
                {memoizedFacultyAssignedBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger><SelectValue placeholder="Filter by Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search assignments..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search assignments"
                />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Assignment List</CardTitle>
          <ShadCnCardDescription>
            Total assignments matching filters: {filteredAssignments.length}
          </ShadCnCardDescription>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
                {searchTerm || filterSemester !== 'all' 
                ? "No assignments match your current filters." 
                : "No assignments posted for your assigned branches yet. Click 'Create New Assignment' to start."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Posted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map(assignment => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.title}</TableCell>
                      <TableCell><Badge variant="outline">{assignment.branch}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{assignment.semester}</Badge></TableCell>
                      <TableCell>{assignment.dueDate ? format(new Date(assignment.dueDate), "PPP") : 'N/A'}</TableCell>
                       <TableCell>
                        {assignment.attachments.map((att, idx) => (
                          <div key={idx} className="text-xs truncate max-w-[150px]" title={att.name}>
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleDownloadAttachment(att)} aria-label={`Download attachment ${att.name}`}>
                                <Download className="mr-1 h-3 w-3"/> {att.name}
                            </Button>
                             ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>{assignment.postedByDisplayName}</TableCell>
                      <TableCell>{format(new Date(assignment.postedAt), "PPp")}</TableCell>
                      <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(assignment)} aria-label={`Edit assignment ${assignment.title}`}>
                              <Edit3 className="h-3 w-3 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => confirmDeleteAssignment(assignment)} aria-label={`Delete assignment ${assignment.title}`}>
                              <Trash2 className="h-3 w-3 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isFormDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b">
                    <CardTitle>{editingAssignment ? "Edit Assignment" : "Create New Assignment"}</CardTitle>
                    <ShadCnCardDescription>{editingAssignment ? "Update the details of this assignment." : "Provide details and upload files for the new assignment."}</ShadCnCardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <AssignmentForm
                        onSubmitSuccess={handleFormSubmitSuccess}
                        initialData={editingAssignment || undefined}
                        availableBranches={memoizedFacultyAssignedBranches}
                        isLoading={formSubmitting}
                        setIsLoading={setFormSubmitting}
                    />
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-background">
                    <Button variant="outline" onClick={() => {setIsFormDialogOpen(false); setEditingAssignment(null);}} disabled={formSubmitting}>
                        Cancel
                    </Button>
                </div>
            </Card>
          </div>
      )}

      <AlertDialog open={!!assignmentToDelete} onOpenChange={() => setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the assignment "{assignmentToDelete?.title}"? 
              This action cannot be undone and all associated files will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="bg-destructive hover:bg-destructive/90">
                Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
