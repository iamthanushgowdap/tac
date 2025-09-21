"use client";

import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import type { FeeRecord, UserProfile, FeeStatus } from '@/types';
import { feeStatuses } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const feeRecordFormSchema = z.object({
  studentUid: z.string({ required_error: "Please select a student." }),
  description: z.string().min(5, "Description must be at least 5 characters.").max(150, "Description too long."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  dueDate: z.date({ required_error: "Due date is required." }),
  status: z.enum(feeStatuses, { required_error: "Status is required." }),
});

export type FeeRecordFormValues = z.infer<typeof feeRecordFormSchema>;

interface FeeRecordFormProps {
  onSubmitSuccess: (newRecord: FeeRecord) => void;
  initialData?: FeeRecord;
  students: UserProfile[];
}

export function FeeRecordForm({ onSubmitSuccess, initialData, students }: FeeRecordFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FeeRecordFormValues>({
    resolver: zodResolver(feeRecordFormSchema),
    defaultValues: {
      studentUid: initialData?.studentUid || undefined,
      description: initialData?.description || "",
      amount: initialData?.amount || 0,
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : new Date(),
      status: initialData?.status || 'pending',
    },
  });
  
  const onSubmit = async (data: FeeRecordFormValues) => {
    if (!user) {
      toast({ title: "Authentication Error", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const selectedStudent = students.find(s => s.uid === data.studentUid);
    if (!selectedStudent) {
        toast({ title: "Student Not Found", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const newRecord: FeeRecord = {
      id: initialData?.id || crypto.randomUUID(),
      studentUid: selectedStudent.uid,
      studentName: selectedStudent.displayName || 'N/A',
      studentUsn: selectedStudent.usn || 'N/A',
      branch: selectedStudent.branch!,
      semester: selectedStudent.semester!,
      description: data.description,
      amount: data.amount,
      dueDate: data.dueDate.toISOString().split('T')[0],
      status: data.status,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      createdByUid: user.uid,
      paidOn: data.status === 'paid' ? (initialData?.paidOn || new Date().toISOString().split('T')[0]) : undefined,
    };
    
    await new Promise(resolve => setTimeout(resolve, 500));
    onSubmitSuccess(newRecord);
    toast({ title: initialData ? "Record Updated" : "Record Created", description: `Fee record for ${selectedStudent.displayName} has been processed.` });
    setIsLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="studentUid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !!initialData}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger></FormControl>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.uid} value={s.uid}>{s.displayName} ({s.usn})</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="e.g., Semester Tuition Fee" {...field} disabled={isLoading} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (INR)</FormLabel>
              <FormControl><Input type="number" placeholder="50000" {...field} disabled={isLoading} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isLoading}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>
                  {feeStatuses.filter(s => s !== 'overdue').map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Status will automatically become 'overdue' if not paid by the due date.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Record' : 'Create Record'}
        </Button>
      </form>
    </Form>
  );
}
