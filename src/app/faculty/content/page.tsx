"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SimpleRotatingSpinner } from "@/components/ui/loading-spinners";

export default function FacultyViewContentPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user && user.role === "faculty") {
        setPageLoading(false);
      } else {
        router.push(user ? "/dashboard" : "/login");
      }
    }
  }, [user, authLoading, router]);

  if (pageLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SimpleRotatingSpinner />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user || user.role !== "faculty") {
    return (
      <Card className="max-w-md mx-auto mt-10 text-center">
        <CardHeader>
          <CardTitle className="flex justify-center items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            You do not have permission to view this page.
          </p>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Faculty: Content Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          Relevant posts for your assigned branches are displayed on the main
          feed.
        </p>
        <p className="mb-6">
          You can also create new posts for your students.
        </p>
        <Link href="/faculty/feed">
          <Button>View Activity Feed</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
