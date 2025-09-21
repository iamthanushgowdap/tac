"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { Report, ReportStatus } from '@/types';
import { REPORT_STORAGE_KEY } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ShieldCheck, ListChecks, Eye, CheckCircle, Archive, Filter, ArrowLeft, Search as SearchIcon, Trash2 } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

const reportStatuses: ReportStatus[] = ['new', 'viewed', 'resolved', 'archived'];

export default function AdminReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [allReports, setAllReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dialogAction, setDialogAction] = useState<'resolve' | 'archive' | 'delete' | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  const [filterStatus, setFilterStatus] = useState<ReportStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReports = useCallback(() => {
    if (typeof window !== 'undefined') {
      const storedReports = localStorage.getItem(REPORT_STORAGE_KEY);
      const reports: Report[] = storedReports ? JSON.parse(storedReports) : [];
      setAllReports(reports.sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchReports();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchReports]);
  
  useEffect(() => {
    let currentReports = [...allReports];
    if (filterStatus !== 'all') {
      currentReports = currentReports.filter(r => r.status === filterStatus);
    }
    if (searchTerm) {
      const termLower = searchTerm.toLowerCase();
      currentReports = currentReports.filter(r => 
        r.reportContent.toLowerCase().includes(termLower) ||
        r.id.toLowerCase().includes(termLower) ||
        r.submittedByName?.toLowerCase().includes(termLower) ||
        r.submittedByUsn?.toLowerCase().includes(termLower) ||
        r.contextBranch?.toLowerCase().includes(termLower) ||
        r.contextSemester?.toLowerCase().includes(termLower) ||
        r.resolutionNotes?.toLowerCase().includes(termLower)
      );
    }
    setFilteredReports(currentReports);
  }, [allReports, filterStatus, searchTerm]);

  const updateReportStatus = (reportId: string, newStatus: ReportStatus, notes?: string) => {
    const updatedReports = allReports.map(report => {
      if (report.id === reportId) {
        const updatedReportData: Report = { ...report, status: newStatus };
        if (newStatus === 'viewed' && !report.viewedAt) updatedReportData.viewedAt = new Date().toISOString();
        if (newStatus === 'resolved') {
          updatedReportData.resolvedAt = new Date().toISOString();
          updatedReportData.resolvedByUid = user?.uid;
          updatedReportData.resolutionNotes = notes || report.resolutionNotes;
        }
        return updatedReportData;
      }
      return report;
    });
    setAllReports(updatedReports);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(updatedReports));
    }
    toast({ title: "Report Updated", description: `Report ${reportId.substring(0,8)} status changed to ${newStatus}.`, duration: 3000 });
  };

  const handleDeleteReport = (reportId: string) => {
    const updatedReports = allReports.filter(report => report.id !== reportId);
    setAllReports(updatedReports);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(updatedReports));
    }
    toast({ title: "Report Deleted", description: `Report ${reportId.substring(0,8)} has been deleted.`, duration: 3000 });
  };

  const handleDialogAction = () => {
    if (!selectedReport || !dialogAction) return;

    if (dialogAction === 'resolve' && !resolutionNotes.trim()) {
        toast({ title: "Notes Required", description: "Please provide resolution notes.", variant: "destructive", duration: 3000});
        return;
    }
    if (dialogAction === 'delete') {
        handleDeleteReport(selectedReport.id);
    } else {
        updateReportStatus(selectedReport.id, dialogAction === 'resolve' ? 'resolved' : 'archived', resolutionNotes);
    }
    setSelectedReport(null);
    setDialogAction(null);
    setResolutionNotes('');
  };

  const openActionDialog = (report: Report, action: 'resolve' | 'archive' | 'delete') => {
    setSelectedReport(report);
    setDialogAction(action);
    setResolutionNotes(report.resolutionNotes || '');
     if (action === 'archive' && report.status !== 'resolved') {
      toast({ title: "Action Not Allowed", description: "Only resolved reports can be archived.", variant: "destructive", duration: 3000});
      setSelectedReport(null);
      setDialogAction(null);
      return;
    }
    if (report.status === 'new' && action !== 'delete') { // Mark as viewed when opening action dialog, unless it's delete
      updateReportStatus(report.id, 'viewed');
    }
  };

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><ListChecks className="mr-3 h-7 w-7" /> Submitted Concerns / Reports</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-sm sm:text-base text-muted-foreground mb-8">Review and manage student-submitted concerns.</p>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Filter Reports</CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as ReportStatus | 'all')}>
              <SelectTrigger><SelectValue placeholder="Filter by Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {reportStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search reports..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Report List</CardTitle>
          <ShadCnCardDescription>Total reports: {filteredReports.length}</ShadCnCardDescription>
        </CardHeader>
        <CardContent>
          {filteredReports.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No reports match the current filters, or no reports submitted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>USN</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="min-w-[300px] w-[40%]">Content</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map(report => (
                    <TableRow key={report.id} className={report.status === 'new' ? 'bg-primary/5 dark:bg-primary/10' : ''}>
                      <TableCell className="font-mono text-xs">{report.id.substring(0,8)}...</TableCell>
                      <TableCell>{format(new Date(report.submittedAt), "PPp")}</TableCell>
                      <TableCell>{report.submittedByName || <span className="italic text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell>{report.submittedByUsn || <span className="italic text-muted-foreground">N/A</span>}</TableCell>
                      <TableCell className="capitalize">{report.recipientType}</TableCell>
                      <TableCell className="text-xs">
                        {report.contextBranch && <div>Branch: {report.contextBranch}</div>}
                        {report.contextSemester && <div>Sem: {report.contextSemester}</div>}
                        {!report.contextBranch && !report.contextSemester && <span className="text-muted-foreground italic">N/A</span>}
                      </TableCell>
                      <TableCell><Badge variant={report.status === 'new' ? 'default' : report.status === 'resolved' ? 'outline' : report.status === 'archived' ? 'secondary': 'destructive'} className={`capitalize ${report.status === 'new' ? 'bg-accent text-accent-foreground' : report.status === 'viewed' ? 'bg-blue-500 text-white' : ''}`}>{report.status}</Badge></TableCell>
                      <TableCell className="text-xs max-w-md whitespace-pre-wrap break-words">{report.reportContent}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {report.status === 'new' && <Button variant="outline" size="sm" onClick={() => updateReportStatus(report.id, 'viewed')}><Eye className="mr-1 h-3 w-3"/>Mark Viewed</Button>}
                        {report.status !== 'resolved' && report.status !== 'archived' && <Button variant="default" size="sm" onClick={() => openActionDialog(report, 'resolve')}><CheckCircle className="mr-1 h-3 w-3"/>Resolve</Button>}
                        {report.status === 'resolved' && <Button variant="secondary" size="sm" onClick={() => openActionDialog(report, 'archive')}><Archive className="mr-1 h-3 w-3"/>Archive</Button>}
                         <Button variant="destructive" size="sm" onClick={() => openActionDialog(report, 'delete')}><Trash2 className="mr-1 h-3 w-3"/>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedReport && (dialogAction === 'resolve' || dialogAction === 'archive' || dialogAction === 'delete')} onOpenChange={() => {setSelectedReport(null); setDialogAction(null); setResolutionNotes('');}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm: {dialogAction === 'resolve' ? 'Resolve Report' : dialogAction === 'archive' ? 'Archive Report' : 'Delete Report'}</AlertDialogTitle>
            <AlertDialogDescription>
              For report ID: {selectedReport?.id.substring(0,8)}...
              {dialogAction === 'resolve' && " Please provide notes on how this concern was addressed. This will mark the report as resolved."}
              {dialogAction === 'archive' && " This will archive the resolved report. It will no longer appear in the main list unless 'Archived' status is filtered."}
              {dialogAction === 'delete' && " Are you sure you want to delete this report? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {dialogAction === 'resolve' && (
            <div className="py-2 space-y-1">
              <Label htmlFor="resolutionNotes" className="text-sm font-medium">Resolution Notes (Required)</Label>
              <Textarea id="resolutionNotes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Describe actions taken or outcome..." rows={4}/>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDialogAction} 
                disabled={dialogAction==='resolve' && !resolutionNotes.trim()} 
                className={dialogAction === 'archive' ? "bg-gray-500 hover:bg-gray-600" : dialogAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ""}>
              {dialogAction === 'resolve' ? 'Mark Resolved' : dialogAction === 'archive' ? 'Confirm Archive' : 'Confirm Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}