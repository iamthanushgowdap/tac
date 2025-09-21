
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Search, ShieldCheck, Briefcase, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Input } from '@/components/ui/input';
import { UserProfileCard } from '@/components/users/user-profile-card';

export default function PlacementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allAlumni, setAllAlumni] = useState<UserProfile[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
        return;
      }
      
      const profiles: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('apsconnect_user_')) {
          try {
            const profile = JSON.parse(localStorage.getItem(key)!);
            if (profile.role === 'alumni') {
              profiles.push(profile);
            }
          } catch(e) { console.error(`Failed to parse profile ${key}`); }
        }
      }
      setAllAlumni(profiles.sort((a, b) => (a.displayName || "").localeCompare(b.displayName || "")));
      setPageLoading(false);
    }
  }, [user, authLoading, router]);

  const filteredAlumni = useMemo(() => {
    if (!searchTerm) return allAlumni;
    const term = searchTerm.toLowerCase();
    return allAlumni.filter(p => 
      p.displayName?.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.placementCompany?.toLowerCase().includes(term) ||
      p.placementJobTitle?.toLowerCase().includes(term) ||
      p.skills?.some(s => s.name.toLowerCase().includes(term))
    );
  }, [searchTerm, allAlumni]);

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
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You must be logged in to view this page.</p><Link href="/login"><Button variant="outline" className="mt-6">Login</Button></Link></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3"><Briefcase /> Alumni & Placements</h1>
          <p className="text-muted-foreground mt-1">Browse alumni profiles and discover career opportunities.</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back"><ArrowLeft className="h-5 w-5" /></Button>
      </div>
      
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search by name, company, skills..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

       {filteredAlumni.length === 0 ? (
        <Card className="mt-8">
            <CardContent className="p-10 text-center text-muted-foreground">
                <p>{searchTerm ? "No alumni match your search." : "No alumni profiles are available yet."}</p>
            </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAlumni.map(profile => (
                <Link key={profile.uid} href={`/profile/${profile.uid}`}>
                    <UserProfileCard profile={profile} />
                </Link>
            ))}
        </div>
       )}
    </div>
  );
}
