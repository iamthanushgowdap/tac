
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter, useParams } from 'next/navigation';
import type { FundraisingCampaign, StudentFundraisingStatus, UserProfile } from '@/types';
import { FUNDRAISING_CAMPAIGN_STORAGE_KEY, STUDENT_FUNDRAISING_STATUS_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Users, Percent, Search } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';

interface StudentStatus extends StudentFundraisingStatus {
    studentName: string;
    studentUsn: string;
}

export default function FundraisingStatusPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<FundraisingCampaign | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<StudentStatus[]>([]);
  const [filteredStatuses, setFilteredStatuses] = useState<StudentStatus[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCampaignData = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Fetch campaign details
    const allCampaignsStr = localStorage.getItem(FUNDRAISING_CAMPAIGN_STORAGE_KEY);
    const allCampaigns: FundraisingCampaign[] = allCampaignsStr ? JSON.parse(allCampaignsStr) : [];
    const currentCampaign = allCampaigns.find(c => c.id === campaignId);
    
    if (!currentCampaign || (user && currentCampaign.createdByUid !== user.uid)) {
        router.push('/faculty/fundraising');
        return;
    }
    setCampaign(currentCampaign);

    // Fetch all students for the target branches
    const targetBranches = currentCampaign.targetBranches;
    const allUsers: UserProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
            const profile = JSON.parse(localStorage.getItem(key)!) as UserProfile;
            if (profile.role === 'student' && profile.isApproved && profile.branch && targetBranches.includes(profile.branch)) {
                allUsers.push(profile);
            }
        }
    }

    // Fetch student contribution statuses
    const allStatusesStr = localStorage.getItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY);
    const allStatuses: StudentFundraisingStatus[] = allStatusesStr ? JSON.parse(allStatusesStr) : [];
    const campaignStatuses = allStatuses.filter(s => s.campaignId === campaignId);

    const enrichedStatuses: StudentStatus[] = allUsers.map(student => {
        const status = campaignStatuses.find(s => s.studentUid === student.uid);
        return {
            campaignId,
            studentUid: student.uid,
            studentName: student.displayName || 'N/A',
            studentUsn: student.usn || 'N/A',
            status: status?.status || 'pending',
            remarks: status?.remarks,
            updatedAt: status?.updatedAt || new Date().toISOString(),
        };
    }).sort((a,b) => a.studentUsn.localeCompare(b.studentUsn));
    
    setStudentStatuses(enrichedStatuses);

  }, [campaignId, user, router]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push('/dashboard');
      } else {
        fetchCampaignData();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchCampaignData]);

  useEffect(() => {
      if(!searchTerm) {
          setFilteredStatuses(studentStatuses);
          return;
      }
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredStatuses(studentStatuses.filter(s => 
        s.studentName.toLowerCase().includes(lowerTerm) ||
        s.studentUsn.toLowerCase().includes(lowerTerm) ||
        s.remarks?.toLowerCase().includes(lowerTerm)
      ));

  }, [searchTerm, studentStatuses]);

  const stats = useMemo(() => {
      const totalStudents = studentStatuses.length;
      if (totalStudents === 0) return { paid: 0, notPaid: 0, pending: 0, paidPercentage: 0 };

      const paid = studentStatuses.filter(s => s.status === 'paid').length;
      const notPaid = studentStatuses.filter(s => s.status === 'not_paid').length;
      const pending = totalStudents - paid - notPaid;
      const paidPercentage = Math.round((paid / totalStudents) * 100);
      return { paid, notPaid, pending, paidPercentage };

  }, [studentStatuses]);

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }

  if (!campaign) {
    return <div className="container mx-auto p-4 text-center">Campaign not found or you do not have permission to view it.</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">{campaign.title}</h1>
          <CardDescription>Contribution Status</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle className="flex items-center gap-2"><Percent /> Campaign Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <p className="font-medium">Paid Contributions</p>
                    <p className="text-lg font-bold">{stats.paidPercentage}%</p>
                </div>
                <Progress value={stats.paidPercentage} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div><p className="text-2xl font-bold">{stats.paid}</p><p className="text-sm text-muted-foreground">Paid</p></div>
                <div><p className="text-2xl font-bold">{stats.notPaid}</p><p className="text-sm text-muted-foreground">Not Paid</p></div>
                <div><p className="text-2xl font-bold">{stats.pending}</p><p className="text-sm text-muted-foreground">Pending</p></div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users /> Student Statuses</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search students or remarks..." className="pl-8 w-full sm:w-1/2 lg:w-1/3" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>USN</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredStatuses.length > 0 ? filteredStatuses.map(s => (
                <TableRow key={s.studentUid}>
                  <TableCell>{s.studentUsn}</TableCell>
                  <TableCell>{s.studentName}</TableCell>
                  <TableCell><Badge variant={s.status === 'paid' ? 'default' : s.status === 'not_paid' ? 'destructive' : 'secondary'} className={`capitalize ${s.status==='paid' ? 'bg-green-500' : ''}`}>{s.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.remarks || '-'}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No students found for this campaign's branches.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
