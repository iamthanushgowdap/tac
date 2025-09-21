
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, Branch, Semester, defaultBranches, semesters } from '@/types'; // Make sure Semester is imported
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Edit3, Trash2, ShieldAlert, Search, VenetianMask } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User } from '@/components/auth-provider';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';


const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "Passwords don't match",
  path: ["confirmNewPassword"],
});
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;


interface ManageStudentsTabProps {
  actor: User; 
}

export default function ManageStudentsTab({ actor }: ManageStudentsTabProps) {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | 'revoke' | 'changePassword' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'approved', 'pending', 'rejected'
  const { toast } = useToast();

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });


  const fetchStudents = useCallback(() => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      const users: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apsconnect_user_')) {
          try {
            const user = JSON.parse(localStorage.getItem(key) || '{}') as UserProfile;
            if (user.role === 'student' || user.role === 'pending') {
              if (actor.role === 'admin') {
                users.push(user);
              } else if (actor.role === 'faculty' && user.branch && user.semester) {
                // Faculty can access a student if EITHER their assigned semester matches the student's semester OR the faculty has no specific semesters assigned (meaning they manage all semesters for their branch)
                const facultyCanAccessBranch = actor.assignedBranches?.includes(user.branch);
                const facultyCanAccessSemester = !actor.assignedSemesters || actor.assignedSemesters.length === 0 || actor.assignedSemesters?.includes(user.semester);
                
                if (facultyCanAccessBranch && facultyCanAccessSemester) {
                  users.push(user);
                }
              }
            }
          } catch (error) {
            console.error("Failed to parse user from localStorage:", key, error);
          }
        }
      }
      setStudents(users.sort((a,b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()));
    }
    setIsLoading(false);
  }, [actor]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleAction = () => {
    if (!selectedStudent || !dialogAction) return;

    if ((dialogAction === 'reject' || dialogAction === 'revoke') && !rejectionReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a reason for this action.", variant: "destructive", duration: 3000 });
      return;
    }
    
    if (typeof window !== 'undefined') {
        const studentKey = `apsconnect_user_${selectedStudent.uid}`;
        const studentProfileStr = localStorage.getItem(studentKey);
        if (studentProfileStr) {
            const studentProfile = JSON.parse(studentProfileStr) as UserProfile;
            let updatedProfile = { ...studentProfile };
            let toastMessage = "";

            switch (dialogAction) {
                case 'approve':
                    updatedProfile = { 
                        ...studentProfile, 
                        isApproved: true, 
                        role: 'student', 
                        rejectionReason: undefined, // Clear rejection reason on approval
                        approvedByUid: actor.uid,
                        approvedByDisplayName: actor.displayName || actor.email || 'System',
                        approvalDate: new Date().toISOString(),
                        rejectedByUid: undefined, // Clear rejection details
                        rejectedByDisplayName: undefined,
                        rejectedDate: undefined,
                    };
                    toastMessage = `${selectedStudent.displayName || selectedStudent.usn}'s registration approved.`;
                    break;
                case 'reject': // This case applies when rejecting a PENDING student
                     updatedProfile = { 
                        ...studentProfile, 
                        isApproved: false, 
                        role: 'pending', 
                        rejectionReason: rejectionReason,
                        rejectedByUid: actor.uid,
                        rejectedByDisplayName: actor.displayName || actor.email || 'System',
                        rejectedDate: new Date().toISOString(),
                        approvedByUid: undefined, // Clear approval details if any existed
                        approvedByDisplayName: undefined,
                        approvalDate: undefined,
                     };
                    toastMessage = `${selectedStudent.displayName || selectedStudent.usn}'s registration rejected. Reason: ${rejectionReason}`;
                    break;
                case 'revoke': // This case applies when an APPROVED student's access is revoked (effectively rejecting them)
                    updatedProfile = {
                        ...studentProfile,
                        isApproved: false,
                        role: 'pending',
                        rejectionReason: rejectionReason || "Access Revoked by " + (actor.displayName || actor.role), 
                        rejectedByUid: actor.uid,
                        rejectedByDisplayName: actor.displayName || actor.email || 'System',
                        rejectedDate: new Date().toISOString(),
                        approvedByUid: undefined, 
                        approvedByDisplayName: undefined,
                        approvalDate: undefined,
                    };
                    toastMessage = `Access revoked for ${selectedStudent.displayName || selectedStudent.usn}. Reason: ${rejectionReason}`;
                    break;
            }

            localStorage.setItem(studentKey, JSON.stringify(updatedProfile));
            const mockUserStr = localStorage.getItem('mockUser');
            if (mockUserStr) {
                const mockUser = JSON.parse(mockUserStr) as User;
                if (mockUser.uid === updatedProfile.uid) {
                    const updatedMockUser: User = {
                        ...mockUser,
                        role: updatedProfile.role,
                        rejectionReason: updatedProfile.rejectionReason,
                    };
                    localStorage.setItem('mockUser', JSON.stringify(updatedMockUser));
                }
            }

            toast({ title: "Action Successful", description: toastMessage, duration: 3000 });
            fetchStudents(); 
        } else {
            toast({ title: "Error", description: "Student profile not found.", variant: "destructive" });
        }
    }

    setDialogAction(null);
    setSelectedStudent(null);
    setRejectionReason('');
  };

  const handleChangePassword = (values: PasswordChangeFormValues) => {
    if (!selectedStudent) return;
    const studentKey = `apsconnect_user_${selectedStudent.uid}`;
    const studentProfileStr = localStorage.getItem(studentKey);
    if (studentProfileStr) {
      const studentProfile = JSON.parse(studentProfileStr) as UserProfile;
      const updatedProfile = { ...studentProfile, password: values.newPassword };
      localStorage.setItem(studentKey, JSON.stringify(updatedProfile));
      toast({ title: "Password Changed", description: `Password for ${selectedStudent.displayName || selectedStudent.usn} has been updated.`, duration: 3000 });
      fetchStudents();
    } else {
      toast({ title: "Error", description: "Student profile not found.", variant: "destructive" });
    }
    setDialogAction(null);
    setSelectedStudent(null);
    passwordForm.reset();
  };
  

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      student.displayName?.toLowerCase().includes(searchLower) ||
      student.email.toLowerCase().includes(searchLower) ||
      student.usn?.toLowerCase().includes(searchLower) ||
      student.branch?.toLowerCase().includes(searchLower) ||
      student.semester?.toLowerCase().includes(searchLower) ||
      student.rejectionReason?.toLowerCase().includes(searchLower)
    );
    const matchesBranch = filterBranch === 'all' || student.branch === filterBranch;
    const matchesSemester = filterSemester === 'all' || student.semester === filterSemester;
    const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'approved' && student.isApproved && student.role === 'student') ||
        (filterStatus === 'pending' && !student.isApproved && student.role === 'pending' && !student.rejectionReason) ||
        (filterStatus === 'rejected' && !student.isApproved && student.role === 'pending' && !!student.rejectionReason);

    return matchesSearch && matchesBranch && matchesSemester && matchesStatus;
  });

  const uniqueBranches = defaultBranches; 
  const uniqueSemesters = semesters;

  if (isLoading) {
    return <div className="flex justify-center items-center py-10"><SimpleRotatingSpinner className="h-8 w-8 text-primary" /> <span className="ml-2">Loading students...</span></div>;
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Students</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <Input
              type="search"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
             <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger><SelectValue placeholder="Filter by Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {uniqueBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterSemester} onValueChange={setFilterSemester}>
              <SelectTrigger><SelectValue placeholder="Filter by Semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {uniqueSemesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <ShadCnCardDescription>Total students matching filters: {filteredStudents.length}</ShadCnCardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-muted-foreground">No students match the current filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>USN</TableHead>
                  <TableHead>Registered At</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => (
                  <TableRow key={student.uid}>
                    <TableCell>{student.displayName || 'N/A'}</TableCell>
                    <TableCell>{student.usn || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {student.registrationDate ? format(new Date(student.registrationDate), "PPpp") : 'N/A'}
                    </TableCell>
                    <TableCell><Badge variant="outline">{student.branch || 'N/A'}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{student.semester || 'N/A'}</Badge></TableCell>
                    <TableCell>
                      {student.isApproved ? <Badge variant="default" className="bg-black text-white hover:bg-black/80">Approved</Badge> : 
                       student.rejectionReason ? <Badge variant="destructive">Rejected</Badge> :
                       <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {!student.isApproved && !student.rejectionReason && ( // PENDING approval
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground/80" onClick={() => { setSelectedStudent(student); setDialogAction('approve'); }}>
                                    <CheckCircle2 className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Approve Student</p></TooltipContent>
                        </Tooltip>
                      )}
                       {!student.isApproved && !student.rejectionReason && ( // PENDING approval
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => { setSelectedStudent(student); setDialogAction('reject'); setRejectionReason(''); }}>
                                    <XCircle className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Reject Student</p></TooltipContent>
                        </Tooltip>
                       )}
                      {student.isApproved && ( // APPROVED student
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700" onClick={() => { setSelectedStudent(student); setDialogAction('revoke'); setRejectionReason(''); }}>
                                    <ShieldAlert className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Revoke Approval / Reject</p></TooltipContent>
                        </Tooltip>
                      )}
                       {student.rejectionReason && ( // REJECTED student
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-foreground hover:text-foreground/80" onClick={() => { setSelectedStudent(student); setDialogAction('approve'); }}>
                                    <CheckCircle2 className="h-5 w-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Re-Approve (Clear Rejection)</p></TooltipContent>
                        </Tooltip>
                       )}
                       <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700" onClick={() => { setSelectedStudent(student); setDialogAction('changePassword'); passwordForm.reset(); }}>
                                <VenetianMask className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Change Password</p></TooltipContent>
                       </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedStudent && (dialogAction === 'approve' || dialogAction === 'reject' || dialogAction === 'revoke')} onOpenChange={(isOpen) => {
        if (!isOpen) { 
            setDialogAction(null);
            setSelectedStudent(null);
            setRejectionReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction ? `Confirm Action: ${dialogAction.charAt(0).toUpperCase()}${dialogAction.substring(1)} Student` : 'Confirm Action'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'approve' && `Are you sure you want to approve ${selectedStudent?.displayName || selectedStudent?.usn}?`}
              {dialogAction === 'reject' && `Please provide a reason for rejecting ${selectedStudent?.displayName || selectedStudent?.usn}.`}
              {dialogAction === 'revoke' && `Are you sure you want to revoke access for ${selectedStudent?.displayName || selectedStudent?.usn}? You must provide a reason.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {(dialogAction === 'reject' || dialogAction === 'revoke') && (
            <div className="py-2">
              <Label htmlFor="rejectionReason" className="text-sm font-medium">Reason {dialogAction === 'reject' || dialogAction === 'revoke' ? '(Required)' : '(Optional)'}</Label>
              <Textarea 
                id="rejectionReason" 
                value={rejectionReason} 
                onChange={(e) => setRejectionReason(e.target.value)} 
                placeholder={dialogAction === 'reject' ? "Enter reason for rejection..." : "Enter reason for revoking..."} 
                className="mt-1"
                rows={3}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setDialogAction(null); setSelectedStudent(null); setRejectionReason('');}}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleAction} 
                className={dialogAction === 'reject' || dialogAction === 'revoke' ? "bg-destructive hover:bg-destructive/90" : ""}
                disabled={(dialogAction === 'reject' || dialogAction === 'revoke') && !rejectionReason.trim()}
            >
              Confirm {dialogAction ? `${dialogAction.charAt(0).toUpperCase()}${dialogAction.substring(1)}` : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <AlertDialog open={!!selectedStudent && dialogAction === 'changePassword'} onOpenChange={(isOpen) => {
            if (!isOpen && dialogAction === 'changePassword') {
                setDialogAction(null);
                setSelectedStudent(null);
                passwordForm.reset();
            }
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Change Password for {selectedStudent?.displayName || selectedStudent?.usn}</AlertDialogTitle>
                    <AlertDialogDescription>Enter and confirm the new password for the student.</AlertDialogDescription>
                </AlertDialogHeader>
                <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-4 py-2">
                        <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={passwordForm.control}
                            name="confirmNewPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirm New Password</FormLabel>
                                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => {setDialogAction(null); setSelectedStudent(null); passwordForm.reset();}}>Cancel</AlertDialogCancel>
                            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                                {passwordForm.formState.isSubmitting && <SimpleRotatingSpinner className="mr-2 h-4 w-4"/>}
                                Change Password
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </Form>
            </AlertDialogContent>
        </AlertDialog>
    </div>
    </TooltipProvider>
  );
}


