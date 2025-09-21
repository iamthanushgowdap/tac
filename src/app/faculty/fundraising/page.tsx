
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, User } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { FundraisingForm } from '@/components/fundraising/fundraising-form';
import type { FundraisingCampaign, UserProfile, Branch } from '@/types';
import { FUNDRAISING_CAMPAIGN_STORAGE_KEY, STUDENT_FUNDRAISING_STATUS_STORAGE_KEY } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription, CardFooter } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ShieldCheck, HandCoins, PlusCircle, Edit, Trash2, Users, ArrowLeft, Eye } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { useToast } from '@/hooks/use-toast';
import { format, isBefore } from 'date-fns';

export default function FacultyFundraisingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [myCampaigns, setMyCampaigns] = useState<FundraisingCampaign[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<FundraisingCampaign | null>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<FundraisingCampaign | null>(null);

  const fetchCampaigns = useCallback(() => {
    if (!user) return;
    const allCampaignsStr = localStorage.getItem(FUNDRAISING_CAMPAIGN_STORAGE_KEY);
    const allCampaigns: FundraisingCampaign[] = allCampaignsStr ? JSON.parse(allCampaignsStr) : [];
    const facultyCampaigns = allCampaigns.filter(c => c.createdByUid === user.uid);
    setMyCampaigns(facultyCampaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
      } else {
        fetchCampaigns();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchCampaigns]);

  const handleFormSubmitSuccess = () => {
    fetchCampaigns();
    setIsFormOpen(false);
    setEditingCampaign(null);
  };

  const openCreateDialog = () => {
    setEditingCampaign(null);
    setIsFormOpen(true);
  };
  
  const openEditDialog = (campaign: FundraisingCampaign) => {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };
  
  const confirmDelete = (campaign: FundraisingCampaign) => {
    setCampaignToDelete(campaign);
  };

  const handleDelete = () => {
    if (!courseToDelete) return;
    const allCampaignsStr = localStorage.getItem(FUNDRAISING_CAMPAIGN_STORAGE_KEY);
    let allCampaigns: FundraisingCampaign[] = allCampaignsStr ? JSON.parse(allCampaignsStr) : [];
    const updatedCampaigns = allCampaigns.filter(c => c.id !== courseToDelete.id);
    localStorage.setItem(FUNDRAISING_CAMPAIGN_STORAGE_KEY, JSON.stringify(updatedCampaigns));
    
    // Also remove student statuses related to this campaign
    const allStatusesStr = localStorage.getItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY);
    let allStatuses = allStatusesStr ? JSON.parse(allStatusesStr) : [];
    allStatuses = allStatuses.filter(s => s.campaignId !== courseToDelete.id);
    localStorage.setItem(STUDENT_FUNDRAISING_STATUS_STORAGE_KEY, JSON.stringify(allStatuses));

    fetchCampaigns();
    toast({ title: "Campaign Deleted", description: `"${courseToDelete.title}" and all related student data have been deleted.` });
    setCampaignToDelete(null);
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
  
  if (!user || user.role !== 'faculty') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
          <HandCoins className="mr-3 h-7 w-7" /> Fundraising Management
        </h1>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog}><PlusCircle className="mr-2 h-4 w-4" /> New Campaign</Button>
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
        </div>
      </div>
      
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <CardHeader className="border-b"><CardTitle>{editingCampaign ? "Edit Campaign" : "Create New Campaign"}</CardTitle></CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-6">
                    <FundraisingForm onSubmitSuccess={handleFormSubmitSuccess} initialData={editingCampaign || undefined} facultyUser={user} />
                </CardContent>
                <div className="border-t p-4 flex justify-end sticky bottom-0 bg-background">
                    <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingCampaign(null); }}>Cancel</Button>
                </div>
            </Card>
        </div>
      )}

      {myCampaigns.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <p>You haven't created any fundraising campaigns yet.</p>
            <Button className="mt-4" onClick={openCreateDialog}>Create Your First Campaign</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myCampaigns.map(campaign => {
            const status = getCampaignStatus(campaign);
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
                  <div className="text-sm"><span className='font-semibold'>For Branches:</span> {campaign.targetBranches.join(', ')}</div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground">Created: {format(new Date(campaign.createdAt), "PP")}</span>
                  <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/faculty/fundraising/${campaign.id}`)}><Eye className="mr-1 h-3 w-3" />View Status</Button>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(campaign)}><Edit className="mr-1 h-3 w-3" />Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(campaign)}><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
      
      <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Deletion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the campaign "{campaignToDelete?.title}"? This action cannot be undone and will remove all student contribution statuses.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Confirm Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
