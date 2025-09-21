
"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ForgotPasswordPage() {
  const [showContactAdminDialog, setShowContactAdminDialog] = useState(false);

  const handleForgotPasswordClick = () => {
    setShowContactAdminDialog(true);
  };

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] sm:min-h-[calc(100vh-10rem)] items-center justify-center py-8 sm:py-12 px-4">
      <Card className="w-full max-w-sm sm:max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-primary">Forgot Password</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Need to reset your password? Please follow the instructions below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 sm:space-y-6 text-center">
            <p className="text-muted-foreground text-sm sm:text-base">
              For password resets, please contact your college administration. They will assist you in regaining access to your account.
            </p>
            <AlertDialog open={showContactAdminDialog} onOpenChange={setShowContactAdminDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  className="w-full text-sm sm:text-base" 
                  onClick={handleForgotPasswordClick}
                  suppressHydrationWarning
                >
                  Password Reset Information
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Contact Administration</AlertDialogTitle>
                  <AlertDialogDescription>
                    To reset your password, please get in touch with the college administration office. They will guide you through the process.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setShowContactAdminDialog(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
