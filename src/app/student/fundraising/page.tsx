
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, User } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { FundraisingCampaign, StudentFundraisingStatus, Branch } from '@/types';
import { FUNDRAISING_CAMPAIGN_STORAGE_KEY, STUDENT_FUNDRAISING_STATUS_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { ShieldCheck, HandCoins, Info, AlertTriangle, ArrowLeft, QrCode } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore, isAfter } from 'date-fns';

export default function StudentFundraisingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [studentStatuses, setStudentStatuses] = useState<Record<string, StudentFundraisingStatus>>({});
  const [pageLoading, setPageLoading] = useState(true);
  
  const [selectedCampaign, setSelectedCampaign] = useState<FundraisingCampaign | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'paid' | 'not_paid' | 'pending'>('pending');
  const [currentRemarks, setCurrentRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchCampaignsAndStatus = useCallback(() => {
    if (!user || !user.branch) return;
    
    // Fetch campaigns
    const allCampaignsStr = localStorage.getItem(FUNDRAISING_CAMPAIGN_STORAGE_KEY);
    const allCampaigns: FundraisingCampaign[] = allCampaignsStr ? JSON.parse(allCampaignsStr) : [];
    const relevantCampaigns = allCampaigns.filter(c => c.targetBranches.includes(user.branch!));
    setCampaigns(relevantCampaigns.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()));

    // Fetch student statuses
    const allStatusesStr = localStorage.getItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY);
    const allStatuses: StudentFundraisingStatus[] = allStatusesStr ? JSON.parse(allStatusesStr) : [];
    const myStatuses = allStatuses.filter(s => s.studentUid === user.uid);
    const statusesMap = myStatuses.reduce((acc, status) => {
      acc[status.campaignId] = status;
      return acc;
    }, {} as Record<string, StudentFundraisingStatus>);
    setStudentStatuses(statusesMap);

  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'student' && user.role !== 'pending')) {
        router.push(user ? '/dashboard' : '/login');
      } else if (user.role === 'pending' && user.rejectionReason) {
        router.push('/student');
      } else {
        fetchCampaignsAndStatus();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchCampaignsAndStatus]);

  const openStatusModal = (campaign: FundraisingCampaign) => {
    setSelectedCampaign(campaign);
    const myStatus = studentStatuses[campaign.id];
    setCurrentStatus(myStatus?.status || 'pending');
    setCurrentRemarks(myStatus?.remarks || '');
  };

  const handleStatusUpdate = () => {
    if (!selectedCampaign || !user) return;
    setIsSaving(true);
    
    const newStatus: StudentFundraisingStatus = {
        campaignId: selectedCampaign.id,
        studentUid: user.uid,
        status: currentStatus,
        remarks: currentRemarks,
        updatedAt: new Date().toISOString(),
    };

    const allStatusesStr = localStorage.getItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY);
    let allStatuses: StudentFundraisingStatus[] = allStatusesStr ? JSON.parse(allStatusesStr) : [];
    
    const existingIndex = allStatuses.findIndex(s => s.campaignId === selectedCampaign.id && s.studentUid === user.uid);
    if(existingIndex > -1) {
        allStatuses[existingIndex] = newStatus;
    } else {
        allStatuses.push(newStatus);
    }
    
    localStorage.setItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY, JSON.stringify(allStatuses));
    
    setStudentStatuses(prev => ({...prev, [selectedCampaign.id]: newStatus}));
    
    toast({ title: "Status Updated", description: `Your contribution status for "${selectedCampaign.title}" has been updated.` });
    setIsSaving(false);
    setSelectedCampaign(null);
  };
  
  const getCampaignStatus = (campaign: FundraisingCampaign): 'active' | 'upcoming' | 'ended' => {
      const now = new Date();
      if(isBefore(now, new Date(campaign.startDate))) return 'upcoming';
      if(isBefore(now, new Date(campaign.endDate))) return 'active';
      return 'ended';
  }

  if (pageLoading || authLoading) {
    return <div className="container mx-auto p-4 flex justify-center items-center min-h-screen"><SimpleRotatingSpinner className="h-12 w-12 text-primary" /></div>;
  }
  
  if (!user || (user.role !== 'student' && user.role !== 'pending')) {
    return <div className="container mx-auto px-4 py-8 text-center"><Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card></div>;
  }

  if (user.role === 'pending' && user.rejectionReason) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-yellow-400">
                <CardHeader><CardTitle className="text-yellow-600 flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Rejected</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Your account registration was rejected. You cannot access this feature.</p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (user.role === 'pending' && !user.rejectionReason) {
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <Card className="max-w-md mx-auto shadow-lg border-yellow-400">
                <CardHeader><CardTitle className="text-yellow-600 flex items-center justify-center"><AlertTriangle className="mr-2 h-6 w-6" />Account Pending</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Your account is pending approval. Fundraising campaigns will be available once approved.</p>
                    <Link href="/student"><Button variant="outline" className="mt-6">Back to Dashboard</Button></Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><HandCoins className="mr-3 h-7 w-7" /> Fundraising Campaigns</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      
      {campaigns.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground"><Info className="mx-auto h-12 w-12 mb-4" /><p>There are no active fundraising campaigns for your branch right now.</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {campaigns.map(campaign => {
            const status = getCampaignStatus(campaign);
            const myStatus = studentStatuses[campaign.id]?.status || 'pending';
            return (
              <Card key={campaign.id} className="shadow-lg flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{campaign.title}</CardTitle>
                    <Badge variant={status === 'active' ? 'default' : status === 'upcoming' ? 'secondary' : 'destructive'} className="capitalize">{status}</Badge>
                  </div>
                  <ShadCnCardDescription>{campaign.description}</ShadCnCardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-3">
                  <div className="text-sm"><span className='font-semibold'>Duration:</span> {format(new Date(campaign.startDate), 'PP')} - {format(new Date(campaign.endDate), 'PP')}</div>
                  <div className="text-sm"><span className='font-semibold'>Contact:</span> {campaign.contactDetails}</div>
                   <div className="text-sm"><span className='font-semibold'>Your Status:</span> 
                     <Badge variant={myStatus === 'paid' ? 'default' : 'outline'} className={`ml-2 capitalize ${myStatus==='paid' ? 'bg-green-500 hover:bg-green-600' : ''}`}>{myStatus.replace('_', ' ')}</Badge>
                   </div>
                </CardContent>
                <CardFooter className="flex justify-end border-t pt-4 gap-2">
                    <Dialog><DialogTrigger asChild><Button variant="secondary"><QrCode className="mr-2 h-4 w-4" />View QR Code</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Payment QR Code</DialogTitle><DialogDescription>Scan the code below to make your contribution for "{campaign.title}".</DialogDescription></DialogHeader><img src={campaign.qrCodeDataUrl} alt="QR Code" className="rounded-lg mx-auto" /></DialogContent></Dialog>
                    <Button onClick={() => openStatusModal(campaign)} disabled={status === 'ended'}>Update My Status</Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCampaign && (
        <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Contribution Status</DialogTitle>
              <DialogDescription>For campaign: "{selectedCampaign.title}"</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>My Payment Status</Label>
                <RadioGroup value={currentStatus} onValueChange={(value: 'paid' | 'not_paid' | 'pending') => setCurrentStatus(value)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="paid" id="paid" /><Label htmlFor="paid">Paid</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="not_paid" id="not_paid" /><Label htmlFor="not_paid">Not Paid</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks (Optional)</Label>
                  <Textarea id="remarks" value={currentRemarks} onChange={e => setCurrentRemarks(e.target.value)} placeholder="e.g., Paid via cash to coordinator." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleStatusUpdate} disabled={isSaving}>{isSaving ? <SimpleRotatingSpinner /> : "Save Status"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
