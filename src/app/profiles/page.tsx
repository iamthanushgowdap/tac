
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, Search, ShieldCheck } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Input } from '@/components/ui/input';
import { UserProfileCard } from '@/components/users/user-profile-card';

export default function ProfilesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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
            // Only show approved students and faculty, and the admin
            if ((profile.role === 'student' && profile.isApproved) || profile.role === 'faculty' || profile.role === 'admin') {
              profiles.push(profile);
            }
          } catch(e) { console.error(`Failed to parse profile ${key}`); }
        }
      }
      setAllUsers(profiles);
      setPageLoading(false);
    }
  }, [user, authLoading, router]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    const term = searchTerm.toLowerCase();
    return allUsers.filter(p => 
      p.displayName?.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.usn?.toLowerCase().includes(term) ||
      p.branch?.toLowerCase().includes(term) ||
      p.semester?.toLowerCase().includes(term) ||
      p.role.toLowerCase().includes(term)
    );
  }, [searchTerm, allUsers]);

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
        <Card className="max-w-md mx-auto shadow-lg"><CardHeader><CardTitle className="text-destructive">Access Denied</CardTitle></CardHeader><CardContent><ShieldCheck className="h-16 w-16 text-destructive mx-auto mb-4" /><p>You must be logged in to view profiles.</p><Link href="/login"><Button variant="outline" className="mt-6">Login</Button></Link></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">User Profiles</h1>
      <p className="text-muted-foreground mb-6">Browse profiles of students and faculty.</p>
      
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search by name, email, USN, branch..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(profile => {
          // Conditionally render the Link wrapper
          if (profile.role === 'student' || profile.role === 'admin') {
            return (
              <Link key={profile.uid} href={`/profile/${profile.uid}`}>
                <UserProfileCard profile={profile} />
              </Link>
            );
          }
          // For faculty, render the card without the link
          return (
            <div key={profile.uid}>
              <UserProfileCard profile={profile} />
            </div>
          );
        })}
      </div>
       {filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground col-span-full mt-10">No profiles match your search.</p>
        )}
    </div>
  );
}
