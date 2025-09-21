
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, User } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, Users, Info, Shield, ArrowLeft, ArrowRight, MessageSquare } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { getMyGroups } from '@/lib/groups-utils';
import type { Group } from '@/types';

export default function ClubsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (user) {
      const groups = await getMyGroups(user);
      setMyGroups(groups);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        fetchGroups();
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router, fetchGroups]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You do not have permission to view this page.</p><Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link></CardContent></Card>
      </div>
    );
  }

  const officialGroups = myGroups.filter(g => g.type === 'official');
  const studentGroups = myGroups.filter(g => g.type === 'student');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center"><Users className="mr-3 h-7 w-7" /> Clubs & Groups</h1>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      <p className="text-muted-foreground mb-8">Access your class and official communication groups.</p>
      
      {myGroups.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Info className="mx-auto h-12 w-12 mb-4" />
            <p>You are not a member of any groups yet.</p>
            <p className="text-sm mt-1">For students, groups are assigned based on your branch and semester after your registration is approved.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary"/> Official Groups</CardTitle>
              <CardDescription>Announcements and official communication from faculty and administration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {officialGroups.length > 0 ? officialGroups.map(group => (
                <GroupItem key={group.id} group={group} />
              )) : <p className="text-sm text-muted-foreground">No official groups found.</p>}
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-accent"/> Student Groups</CardTitle>
              <CardDescription>Peer-to-peer discussion groups for your class.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               {studentGroups.length > 0 ? studentGroups.map(group => (
                <GroupItem key={group.id} group={group} />
              )) : <p className="text-sm text-muted-foreground">No student groups found.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function GroupItem({ group }: { group: Group }) {
  return (
    <Link href={`/clubs/${group.id}`} className="block">
      <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <div className="flex justify-between items-center">
            <div>
                <h3 className="font-semibold">{group.name}</h3>
                <p className="text-xs text-muted-foreground">{group.description}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}
