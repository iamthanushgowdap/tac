"use client";

import React, { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAuth, User } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Report, REPORT_STORAGE_KEY, ReportRecipientType, Branch, Semester } from '@/types';
import { ShieldCheck, AlertTriangle, ArrowLeft, Send, MessageSquareWarning } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import Link from 'next/link';

const reportSchema = z.object({
  recipientType: z.enum(['faculty', 'admin'], { required_error: "Please select a recipient." }) as z.ZodSchema<ReportRecipientType>,
  reportContent: z.string().min(20, "Report must be at least 20 characters.").max(2000, "Report cannot exceed 2000 characters."),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function ReportConcernPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [studentContext, setStudentContext] = useState<{branch?: Branch, semester?: Semester}>({});

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      recipientType: undefined,
      reportContent: "",
    },
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'student' && user.role !== 'pending')) {
        router.push(user ? '/dashboard' : '/login');
      } else if (user.role === 'pending' && user.rejectionReason) {
        // Rejected students cannot submit reports
        router.push('/student');
      }
       else {
        setStudentContext({branch: user.branch, semester: user.semester});
        setPageLoading(false);
      }
    }
  }, [user, authLoading, router]);

  async function onSubmit(data: ReportFormValues) {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to submit a report.", variant: "destructive" });
      return;
    }
    setFormSubmitting(true);
    try {
      const newReport: Report = {
        id: crypto.randomUUID(),
        recipientType: data.recipientType,
        reportContent: data.reportContent,
        submittedAt: new Date().toISOString(),
        status: 'new',
        contextBranch: studentContext.branch,
        contextSemester: studentContext.semester,
        submittedByUid: user.uid,
        submittedByName: user.displayName || undefined,
        submittedByUsn: user.usn || undefined,
      };

      if (typeof window !== 'undefined') {
        const existingReportsStr = localStorage.getItem(REPORT_STORAGE_KEY);
        const existingReports: Report[] = existingReportsStr ? JSON.parse(existingReportsStr) : [];
        existingReports.push(newReport);
        localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(existingReports));
      }

      toast({
        title: "Report Submitted Successfully",
        description: "Your concern has been submitted. Thank you.",
        duration: 3000, // Autoclose after 3 seconds
      });
      form.reset();
      router.push('/student');
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "Submission Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setFormSubmitting(false);
    }
  }

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || (user.role !== 'student' && user.role !== 'pending') || (user.role === 'pending' && user.rejectionReason)) {
     return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">
                {user && user.role === 'pending' && user.rejectionReason 
                 ? "Your account was rejected. You cannot submit reports."
                 : "You do not have permission to access this page."}
            </p>
            <Link href={user ? "/student" : "/login"}><Button variant="outline" className="mt-6">Go Back</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </div>
      <Card className="w-full max-w-xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold tracking-tight text-primary flex items-center">
            <MessageSquareWarning className="mr-2 h-7 w-7" /> Report a Concern
          </CardTitle>
          <CardDescription>
            Submit your concerns. Your identity (Name &amp; USN) will be visible to the recipient (Faculty/Admin).
            Reports are intended to help improve our college environment. Please be respectful and constructive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="recipientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select recipient (Faculty or Admin)" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="faculty">Faculty (General - for your branch concerns)</SelectItem>
                        <SelectItem value="admin">Administration (General college-wide concerns)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Faculty reports are generally for branch-specific issues. Admin reports are for broader college matters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reportContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Concern / Issue</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Clearly describe your concern. Provide specific details where possible."
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      Min 20 characters, Max 2000 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-md text-xs text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
                <AlertTriangle className="inline h-4 w-4 mr-1 align-text-bottom"/>
                <strong>Please Note:</strong> Your name and USN will be shared with the selected recipient. This system is for constructive feedback. Misuse may lead to disciplinary action.
              </div>
              <Button type="submit" className="w-full" disabled={formSubmitting}>
                {formSubmitting ? <SimpleRotatingSpinner className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                {formSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}