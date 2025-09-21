"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, User } from "@/components/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import ManageStudentsTab from "@/components/admin/ManageStudentsTab"; // Reusing the component from its new location
import { SimpleRotatingSpinner } from "@/components/ui/loading-spinners";

export default function FacultyUserManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [actor, setActor] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === 'faculty') {
        setIsAuthorized(true);
        setActor(user);
      } else if (user) {
        router.push('/dashboard'); 
      } else {
        router.push('/login');
      }
      setPageLoading(false);
    }
  }, [user, authLoading, router]);

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!isAuthorized || !actor) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-6">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const assignedBranchesText = actor.assignedBranches && actor.assignedBranches.length > 0 
    ? actor.assignedBranches.join(', ') 
    : 'N/A';
  
  const assignedSemestersText = actor.assignedSemesters && actor.assignedSemesters.length > 0
    ? actor.assignedSemesters.join(', ')
    : 'N/A';

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Students</CardTitle>
          <CardDescription>View, approve, and manage student accounts for your assigned branches: {assignedBranchesText} and semesters: {assignedSemestersText}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ManageStudentsTab actor={actor} />
        </CardContent>
      </Card>
    </div>
  );
}
