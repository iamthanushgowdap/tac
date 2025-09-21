
"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { SquidGameLoader } from "@/components/ui/loading-spinners";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect logic based on user role
        if (user.role === 'admin') {
          router.replace('/admin');
        } else if (user.role === 'faculty') {
          router.replace('/faculty');
        } else if (user.role === 'student' || user.role === 'pending' || user.role === 'alumni') {
          // Students, pending users, and alumni are redirected to the student dashboard
          router.replace('/student');
        } else {
          // Fallback for unknown roles or if no specific dashboard exists
          router.replace('/'); 
        }
      } else {
        // No user, redirect to login
        router.replace('/login');
      }
    }
  }, [user, isLoading, router]);

  // Show a loading indicator while redirecting
  if (isLoading || !user && typeof window !== 'undefined' && window.location.pathname === '/dashboard') { // Added a check to prevent flash if user is null but redirecting
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SquidGameLoader className="h-12 w-12 text-primary" />
      </div>
    );
  }

  // This content will likely not be shown due to redirects
  // but serves as a placeholder if redirect logic changes or for very brief flashes.
  return (
    <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Redirecting...</p>
        <p className="text-muted-foreground">Please wait while we redirect you to your dashboard.</p>
    </div>
  );
}
