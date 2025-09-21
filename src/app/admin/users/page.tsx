"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, User } from "@/components/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, Briefcase, ArrowLeft } from "lucide-react";
import ManageStudentsTab from "@/components/admin/ManageStudentsTab";
import ManageFacultyTab from "@/app/admin/users/manage-faculty-tab";
import { SimpleRotatingSpinner } from "@/components/ui/loading-spinners";

export default function UserManagementPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [actor, setActor] = useState<User | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (user && (user.role === 'admin' || user.role === 'faculty')) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center">
            {actor.role === 'admin' ? <Users className="mr-3 h-7 w-7" /> : <Users className="mr-3 h-7 w-7" />}
            User Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
            {actor.role === 'admin' 
                ? "View, approve, and manage student and faculty accounts."
                : "View and manage student accounts for your assigned branches."}
            </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <Tabs defaultValue={actor.role === 'admin' ? "students" : "students"} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 max-w-md">
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Manage Students
          </TabsTrigger>
          {actor.role === 'admin' && (
            <TabsTrigger value="faculty" className="flex items-center gap-2">
             <Briefcase className="h-4 w-4" /> Manage Faculty
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="students" className="mt-6">
          <ManageStudentsTab actor={actor} />
        </TabsContent>
        {actor.role === 'admin' && (
          <TabsContent value="faculty" className="mt-6">
            <ManageFacultyTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

    
