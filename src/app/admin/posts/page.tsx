"use client";

import React, { useEffect, useState } from 'react'; 
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';


export default function AdminViewPostsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === 'admin') {
        setPageLoading(false);
      } else {
        router.push(user ? '/dashboard' : '/login');
      }
    }
  }, [user, authLoading, router]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Admin: All Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This is the admin view for all posts. Currently, all posts are visible on the main <Link href="/feed" className="text-primary hover:underline">Activity Feed</Link>.
          </p>
          <p className="text-muted-foreground">
            Future enhancements could include specific admin actions here like bulk operations, detailed analytics, or content moderation tools.
          </p>
            <Link href="/feed">
              <Button className="mt-4">View Activity Feed</Button>
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}
