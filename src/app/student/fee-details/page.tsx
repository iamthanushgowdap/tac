"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { FeeRecord } from '@/types';
import { FEE_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, CreditCard, Info, AlertTriangle, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { FeeStatusBadge } from '@/components/fees/fee-status-badge';

export default function StudentFeeDetailsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [pageLoading, setPageLoading] = useState(true);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);

  const fetchFeeRecords = useCallback(() => {
    if (!user) return;
    const storedRecordsStr = localStorage.getItem(FEE_STORAGE_KEY);
    const allRecords: FeeRecord[] = storedRecordsStr ? JSON.parse(storedRecordsStr) : [];
    const studentRecords = allRecords.filter(rec => rec.studentUid === user.uid);
    setFeeRecords(studentRecords.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()));
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user && (user.role === 'student' || user.role === 'pending')) {
        fetchFeeRecords();
        setPageLoading(false);
      } else {
        router.push(user ? '/dashboard' : '/login');
      }
    }
  }, [user, authLoading, router, fetchFeeRecords]);

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
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
        <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg border-yellow-400"><CardHeader><CardTitle className="text-yellow-600 flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Your account is pending approval. Fee details will be available once approved.</p><Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link></CardContent></Card></div>
    );
  }

  const totalDue = feeRecords.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><CreditCard className="mr-3 h-7 w-7" /> My Fee Details</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-muted-foreground mb-8">View your payment history, due dates, and pending fees.</p>
      
      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            Total Amount Due: <span className="font-bold text-destructive">₹{totalDue.toLocaleString()}</span>
          </p>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Fee Records</CardTitle>
          <CardDescription>A complete list of all your fee records.</CardDescription>
        </CardHeader>
        <CardContent>
          {feeRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
                <Info className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                No fee records have been assigned to you yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead>Paid On</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {feeRecords.map(rec => (
                            <TableRow key={rec.id}>
                                <TableCell>{rec.description}</TableCell>
                                <TableCell>₹{rec.amount.toLocaleString()}</TableCell>
                                <TableCell>{format(new Date(rec.dueDate), "PP")}</TableCell>
                                <TableCell><FeeStatusBadge status={rec.status} /></TableCell>
                                <TableCell>{rec.paidOn ? format(new Date(rec.paidOn), "PP") : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
