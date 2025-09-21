"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { FeeRecordForm } from '@/components/fees/fee-record-form';
import type { FeeRecord, UserProfile, Branch, Semester, FeeStatus } from '@/types';
import { FEE_STORAGE_KEY, defaultBranches, semesters, feeStatuses } from '@/types';
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
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ShieldCheck, CreditCard, PlusCircle, Edit, Trash2, Filter, ArrowLeft, Search as SearchIcon, CheckCircle, Clock } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { FeeStatusBadge } from '@/components/fees/fee-status-badge';

export default function AdminFeeManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allFeeRecords, setAllFeeRecords] = useState<FeeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FeeRecord[]>([]);
  const [allStudents, setAllStudents] = useState<UserProfile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FeeRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FeeRecord | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterSemester, setFilterSemester] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRecords = useCallback(() => {
    const recordsStr = localStorage.getItem(FEE_STORAGE_KEY);
    const records: FeeRecord[] = recordsStr ? JSON.parse(recordsStr) : [];
    setAllFeeRecords(records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

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
    let tempRecords = [...allFeeRecords];
    if (filterBranch !== 'all') tempRecords = tempRecords.filter(r => r.branch === filterBranch);
    if (filterSemester !== 'all') tempRecords = tempRecords.filter(r => r.semester === filterSemester);
    if (filterStatus !== 'all') tempRecords = tempRecords.filter(r => r.status === filterStatus);
    if (searchTerm) {
        const termLower = searchTerm.toLowerCase();
        tempRecords = tempRecords.filter(r => 
            r.description.toLowerCase().includes(termLower) ||
            r.studentName.toLowerCase().includes(termLower) ||
            r.studentUsn.toLowerCase().includes(termLower)
        );
    }
    setFilteredRecords(tempRecords);
  }, [allFeeRecords, filterBranch, filterSemester, filterStatus, searchTerm]);
  
  const handleFormSubmitSuccess = (record: FeeRecord) => {
    const existingIndex = allFeeRecords.findIndex(r => r.id === record.id);
    if (existingIndex > -1) {
      allFeeRecords[existingIndex] = record;
      setAllFeeRecords([...allFeeRecords]);
    } else {
      setAllFeeRecords(prev => [record, ...prev]);
    }
    localStorage.setItem(FEE_STORAGE_KEY, JSON.stringify(existingIndex > -1 ? allFeeRecords : [record, ...allFeeRecords]));
    setIsFormDialogOpen(false);
    setEditingRecord(null);
  };
  
  const confirmDelete = (record: FeeRecord) => setRecordToDelete(record);
  
  const handleDelete = () => {
    if (!recordToDelete) return;
    const updatedRecords = allFeeRecords.filter(r => r.id !== recordToDelete.id);
    setAllFeeRecords(updatedRecords);
    localStorage.setItem(FEE_STORAGE_KEY, JSON.stringify(updatedRecords));
    toast({ title: "Record Deleted", description: `Fee record for ${recordToDelete.studentName} has been deleted.` });
    setRecordToDelete(null);
  };
  
  const toggleFeeStatus = (record: FeeRecord) => {
    const newStatus: FeeStatus = record.status === 'paid' ? 'pending' : 'paid';
    const updatedRecord: FeeRecord = { 
        ...record, 
        status: newStatus,
        paidOn: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined,
    };
    const updatedRecords = allFeeRecords.map(r => r.id === record.id ? updatedRecord : r);
    setAllFeeRecords(updatedRecords);
    localStorage.setItem(FEE_STORAGE_KEY, JSON.stringify(updatedRecords));
    toast({ title: "Status Updated", description: `Fee status for ${record.studentName} set to ${newStatus}.` });
  };
  

  if (pageLoading || authLoading) return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  if (!user || user.role !== 'admin') return <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card></div>;

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><CreditCard className="mr-3 h-7 w-7" /> Fee Management</h1>
            <div className="flex items-center gap-2">
                <Button onClick={() => { setEditingRecord(null); setIsFormDialogOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> New Fee Record</Button>
                <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
            </div>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground mb-8">Create, view, and manage student fee records.</p>
        
        <Card className="shadow-lg mb-8">
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filter Records</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                    <Select value={filterBranch} onValueChange={setFilterBranch}><SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger><SelectContent><SelectItem value="all">All Branches</SelectItem>{defaultBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                    <Select value={filterSemester} onValueChange={setFilterSemester}><SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger><SelectContent><SelectItem value="all">All Semesters</SelectItem>{semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{feeStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
                    <div className="relative"><SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input type="search" placeholder="Search by student, USN, or description..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg">
            <CardHeader><CardTitle>Fee Records</CardTitle><ShadCnCardDescription>Total records: {filteredRecords.length}</ShadCnCardDescription></CardHeader>
            <CardContent><div className="overflow-x-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>USN</TableHead><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Paid On</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {filteredRecords.length > 0 ? filteredRecords.map(rec => (
                            <TableRow key={rec.id}>
                                <TableCell>{rec.studentName}</TableCell>
                                <TableCell>{rec.studentUsn}</TableCell>
                                <TableCell>{rec.description}</TableCell>
                                <TableCell>₹{rec.amount.toLocaleString()}</TableCell>
                                <TableCell>{format(new Date(rec.dueDate), "PP")}</TableCell>
                                <TableCell><FeeStatusBadge status={rec.status} /></TableCell>
                                <TableCell>{rec.paidOn ? format(new Date(rec.paidOn), "PP") : 'N/A'}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant={rec.status === 'paid' ? 'outline' : 'default'} size="sm" onClick={() => toggleFeeStatus(rec)}>
                                        {rec.status === 'paid' ? <Clock className="mr-1 h-3 w-3" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                                        {rec.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => { setEditingRecord(rec); setIsFormDialogOpen(true); }}><Edit className="mr-1 h-3 w-3" />Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => confirmDelete(rec)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
                                </TableCell>
                            </TableRow>
                        )) : <TableRow><TableCell colSpan={8} className="h-24 text-center">No fee records match the current filters.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div></CardContent>
        </Card>

        {isFormDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b"><CardTitle>{editingRecord ? "Edit Fee Record" : "Create New Fee Record"}</CardTitle></CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <FeeRecordForm onSubmitSuccess={handleFormSubmitSuccess} initialData={editingRecord || undefined} students={allStudents} />
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-background">
                    <Button variant="outline" onClick={() => { setIsFormDialogOpen(false); setEditingRecord(null); }}>Cancel</Button>
                </div>
            </Card>
          </div>
        )}
        
        <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this fee record for "{recordToDelete?.studentName}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
