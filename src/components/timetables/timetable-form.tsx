"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as ShadCnCardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import type { Branch, Semester, TimeTable, TimeTableDaySchedule, TimeTableEntry, DayOfWeek, TimeSlotDescriptor, UserProfile, Subject } from '@/types';
import { defaultBranches, semesters, daysOfWeek, timeSlotDescriptors, saturdayLastSlotIndex } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Save, CalendarDays, AlertTriangle } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';

const TIMETABLE_STORAGE_KEY_PREFIX = 'apsconnect_timetable_';
const BRANCH_STORAGE_KEY = 'apsconnect_managed_branches';

const timeTableEntrySchema = z.object({
  period: z.number(),
  subject: z.string().max(100, "Subject name too long").optional(),
});

const timeTableDayScheduleSchema = z.object({
  day: z.string(),
  entries: z.array(timeTableEntrySchema),
});

const timetableFormSchema = z.object({
  branch: z.string({ required_error: "Branch is required." }),
  semester: z.custom<Semester>(val => semesters.includes(val as Semester), { required_error: "Semester is required." }),
  schedule: z.array(timeTableDayScheduleSchema),
});

export type TimetableFormValues = z.infer<typeof timetableFormSchema>;

interface TimetableFormProps {
  role: 'admin' | 'faculty';
  facultyAssignedBranches?: Branch[];
  onTimetableUpdate?: () => void;
}

const createEmptySchedule = (): TimeTableDaySchedule[] => {
  return daysOfWeek.map(day => ({
    day,
    entries: timeSlotDescriptors.map((descriptor, periodIndex) => ({
      period: periodIndex,
      subject: descriptor.isBreak ? descriptor.label : "",
    })),
  }));
};

export function TimetableForm({ role, facultyAssignedBranches, onTimetableUpdate }: TimetableFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [pageIsLoading, setPageIsLoading] = useState(true);
  const [managedBranches, setManagedBranches] = useState<Branch[]>([]);
  
  const availableBranchesForForm = role === 'admin' ? managedBranches : (facultyAssignedBranches || []);

  const form = useForm<TimetableFormValues>({
    resolver: zodResolver(timetableFormSchema),
    defaultValues: {
      branch: undefined,
      semester: undefined,
      schedule: createEmptySchedule(),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "schedule",
  });

  const loadScheduleFor = (branch: string, semester: string) => {
    if (typeof window !== 'undefined') {
        const key = `${TIMETABLE_STORAGE_KEY_PREFIX}${branch}_${semester}`;
        const storedData = localStorage.getItem(key);
        let newSchedule = createEmptySchedule();

        if (storedData) {
            try {
                const timetable = JSON.parse(storedData) as Partial<TimeTable>;
                if (timetable && Array.isArray(timetable.schedule)) {
                    newSchedule = daysOfWeek.map(dayString => {
                        const existingDaySchedule = timetable.schedule!.find(ds => ds.day === dayString);
                        return {
                            day: dayString,
                            entries: timeSlotDescriptors.map((descriptor, periodIdx) => {
                                const existingEntry = existingDaySchedule?.entries.find(e => e.period === periodIdx);
                                return {
                                    period: periodIdx,
                                    subject: existingEntry?.subject || (descriptor.isBreak ? descriptor.label : ""),
                                };
                            }),
                        };
                    });
                }
            } catch (error) {
                console.error("Failed to parse schedule", error);
            }
        }
        form.setValue('schedule', newSchedule);
    }
  };

  useEffect(() => {
    setPageIsLoading(true);
    const storedBranchesStr = localStorage.getItem(BRANCH_STORAGE_KEY);
    let branchesToSet = defaultBranches;
    if (storedBranchesStr) {
        try {
            const parsed = JSON.parse(storedBranchesStr);
            if (Array.isArray(parsed) && parsed.length > 0) branchesToSet = parsed;
        } catch (e) { console.error("Error parsing managed branches:", e); }
    }
    setManagedBranches(branchesToSet);
    
    const branchesForRole = role === 'admin' ? branchesToSet : (facultyAssignedBranches || []);
    const initialBranch = branchesForRole[0];
    const initialSemester = semesters[0];
    
    form.reset({
        branch: initialBranch,
        semester: initialSemester,
        schedule: createEmptySchedule()
    });

    if (initialBranch && initialSemester) {
      loadScheduleFor(initialBranch, initialSemester);
    }
    setPageIsLoading(false);
  }, [role, facultyAssignedBranches]);

  const onSubmit = async (data: TimetableFormValues) => {
    if (!user) {
      toast({ title: "Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (!data.branch || !data.semester) {
      toast({ title: "Error", description: "Branch and Semester must be selected.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const timetableData: TimeTable = {
        id: `${data.branch}_${data.semester}`,
        branch: data.branch,
        semester: data.semester,
        schedule: data.schedule.map(daySchedule => ({
          day: daySchedule.day as DayOfWeek,
          entries: daySchedule.entries.map((entry, periodIndex) => ({
              period: entry.period,
              subject: timeSlotDescriptors[periodIndex].isBreak 
                         ? timeSlotDescriptors[periodIndex].label 
                         : entry.subject || "", 
            })),
        })),
        lastUpdatedBy: user.uid,
        lastUpdatedAt: new Date().toISOString(),
      };

      localStorage.setItem(`${TIMETABLE_STORAGE_KEY_PREFIX}${data.branch}_${data.semester}`, JSON.stringify(timetableData));

      toast({
        title: "Timetable Saved",
        description: `Timetable for ${data.branch} - ${data.semester} has been created/updated.`,
      });
      if (onTimetableUpdate) onTimetableUpdate();

    } catch (error) {
      console.error("Error saving timetable:", error);
      toast({ title: "Error Saving Timetable", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-primary flex items-center">
            <CalendarDays className="mr-3 h-6 w-6 sm:h-7 sm:w-7"/> Create/Update Timetable
        </CardTitle>
        <ShadCnCardDescription>Enter or modify the class schedule.</ShadCnCardDescription>
      </CardHeader>
      <CardContent>
        {pageIsLoading ? (
            <div className="flex justify-center items-center py-20 text-muted-foreground">
                <SimpleRotatingSpinner className="mr-2 h-5 w-5 text-primary" /> Loading timetable editor...
            </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                          field.onChange(value);
                          if(value) loadScheduleFor(value, form.getValues("semester"));
                      }}
                      value={field.value}
                      disabled={role === 'faculty' && facultyAssignedBranches?.length === 1}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableBranchesForForm.length > 0 ? availableBranchesForForm.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        )) : <SelectItem value="-" disabled>No branches available</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                          field.onChange(value);
                          if(value) loadScheduleFor(form.getValues("branch"), value);
                      }} 
                      value={field.value}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {semesters.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="overflow-x-auto">
                <Table className="min-w-full border-collapse border border-border">
                    <TableHeader>
                        <TableRow>
                        <TableHead className="border border-border p-2 font-semibold bg-muted/50 sticky left-0 z-10 w-[100px] min-w-[100px]">Day</TableHead>
                        {timeSlotDescriptors.map((descriptor, periodIndex) => (
                            <TableHead key={periodIndex} className="border border-border p-2 font-semibold bg-muted/50 text-center min-w-[200px]">
                                {descriptor.label} <br/> <span className="text-xs font-normal">({descriptor.time})</span>
                            </TableHead>
                        ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((dayField, dayIndex) => (
                        <TableRow key={dayField.id}>
                            <TableCell className="border border-border p-2 font-medium bg-muted/30 text-muted-foreground text-xs sm:text-sm sticky left-0 z-10 w-[100px] min-w-[100px]">
                                {dayField.day}
                            </TableCell>
                            {timeSlotDescriptors.map((descriptor, periodIndex) => {
                              const isSaturday = dayField.day === "Saturday";
                              const isAfterSaturdayCutoff = isSaturday && periodIndex > saturdayLastSlotIndex;
                              const isDisabled = isAfterSaturdayCutoff || descriptor.isBreak;

                              return (
                                <TableCell key={`${dayField.id}-${periodIndex}`} className="border border-border p-1 min-w-[200px] align-top">
                                  <div className="flex flex-col gap-1">
                                    <FormField
                                      control={form.control}
                                      name={`schedule.${dayIndex}.entries.${periodIndex}.subject`}
                                      render={({ field }) => (
                                            <Input 
                                                {...field}
                                                placeholder={isDisabled ? '' : 'Subject Name'}
                                                value={isDisabled ? descriptor.label : field.value || ''}
                                                className="w-full h-10 text-xs sm:text-sm p-1 sm:p-2 text-center"
                                                disabled={isDisabled}
                                                readOnly={isDisabled}
                                            />
                                      )}
                                    />
                                  </div>
                                </TableCell>
                              );
                            })}
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            
            <div className="pt-6 border-t mt-6">
              <Button type="submit" className="w-full sm:w-auto" disabled={isSaving || pageIsLoading}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Timetable
              </Button>
            </div>
          </form>
        </Form>
        )}
      </CardContent>
    </Card>
  );
}
