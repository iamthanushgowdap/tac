
"use client";

import React from 'react';
import type { TimeTable, Branch, Semester, DayOfWeek, TimeTableDaySchedule, TimeSlotDescriptor } from '@/types';
import { daysOfWeek, timeSlotDescriptors, saturdayLastSlotIndex } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, AlertTriangle, CalendarPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { generateTimetableICS, downloadICSFile } from '@/lib/calendar-utils';
import { useToast } from '@/hooks/use-toast';

interface TimetableViewProps {
  timetable: TimeTable | null;
  isLoading: boolean;
  studentBranch?: Branch; // Optional, for student view context
  studentSemester?: Semester; // Optional, for student view context
  displayContext?: { // For admin/faculty view context
    branch?: Branch; 
    semester?: Semester;
  };
}

export function TimetableView({ timetable, isLoading, studentBranch, studentSemester, displayContext }: TimetableViewProps) {
  const { toast } = useToast();
  
  const handleExportToCalendar = () => {
    if (timetable) {
      try {
        const icsContent = generateTimetableICS(timetable, timeSlotDescriptors);
        downloadICSFile(`${timetable.branch}_${timetable.semester}_Timetable.ics`, icsContent);
        toast({
          title: "Timetable Exported",
          description: "The .ics file has been downloaded. You can import it into your calendar app.",
          duration: 5000,
        });
      } catch (error) {
        console.error("Error generating timetable ICS:", error);
        toast({
          title: "Export Failed",
          description: "Could not generate the calendar file. Please try again.",
          variant: "destructive",
          duration: 3000
        });
      }
    }
  };


  if (isLoading) {
    return (
      <Card className="w-full shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-primary">Loading Timetable...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center py-20">
           <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
        </CardContent>
      </Card>
    );
  }

  const branchToDisplay = displayContext?.branch || studentBranch;
  const semesterToDisplay = displayContext?.semester || studentSemester;

  if (!timetable || !Array.isArray(timetable.schedule) || timetable.schedule.length === 0) {
    return (
      <Card className="w-full shadow-xl mt-4">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-primary flex items-center">
            <AlertTriangle className="mr-3 h-6 w-6 text-orange-500"/> Timetable Not Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {branchToDisplay && semesterToDisplay 
              ? `The timetable for ${branchToDisplay} - ${semesterToDisplay} has not been created or is currently empty.`
              : "The requested timetable has not been created or is empty."}
            {' '}Please check back later or contact the relevant department/administration if you are a student.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const orderedSchedule = daysOfWeek.map(dayString => {
    const daySchedule = timetable.schedule.find(ds => ds.day === dayString);
    if (daySchedule && Array.isArray(daySchedule.entries)) {
      const orderedEntries = timeSlotDescriptors.map((descriptor, periodIdx) => { 
        const entry = daySchedule.entries.find(e => e.period === periodIdx);
        return entry || { period: periodIdx, subject: descriptor.isBreak ? descriptor.label : "-" }; 
      });
      return { ...daySchedule, entries: orderedEntries };
    }
    return {
      day: dayString as DayOfWeek,
      entries: timeSlotDescriptors.map((descriptor, periodIdx) => ({ 
        period: periodIdx, 
        subject: descriptor.isBreak ? descriptor.label : "-" 
      })),
    };
  });


  return (
    <Card className="w-full shadow-xl mt-4">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-primary flex items-center">
                    <CalendarDays className="mr-3 h-6 w-6 sm:h-7 sm:w-7"/> Timetable Details
                </CardTitle>
                <CardDescription>
                Viewing timetable for Branch: <strong>{timetable.branch}</strong>, Semester: <strong>{timetable.semester}</strong>.
                </CardDescription>
            </div>
            <Button onClick={handleExportToCalendar} variant="outline" size="sm" className="mt-2 sm:mt-0">
                <CalendarPlus className="mr-2 h-4 w-4" /> Export to Calendar
            </Button>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1 mt-1 sm:mt-0">
            Last Updated: {new Date(timetable.lastUpdatedAt).toLocaleString()} by User ID: {timetable.lastUpdatedBy}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <Table className="min-w-full border-collapse border border-border">
          <TableHeader>
            <TableRow>
              <TableHead className="border border-border p-2 font-semibold bg-muted/50 sticky left-0 z-10 w-[100px] min-w-[100px]">Day</TableHead>
              {timeSlotDescriptors.map((descriptor, periodIndex) => (
                <TableHead key={periodIndex} className="border border-border p-2 font-semibold bg-muted/50 text-center min-w-[150px]">
                    {descriptor.label} <br/> <span className="text-xs font-normal">({descriptor.time})</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedSchedule.map(daySchedule => (
              <TableRow key={daySchedule.day}>
                <TableCell className="border border-border p-2 font-medium bg-muted/30 text-muted-foreground text-xs sm:text-sm sticky left-0 z-10 w-[100px] min-w-[100px]">
                  {daySchedule.day}
                </TableCell>
                {daySchedule.entries.map((entry, periodIndex) => { 
                  const entrySubject = entry.subject;
                  const isSaturday = daySchedule.day === "Saturday";
                  const isAfterSaturdayCutoff = isSaturday && periodIndex > saturdayLastSlotIndex;
                  const currentDescriptor = timeSlotDescriptors[periodIndex]; 
                  
                  return (
                    <TableCell key={`${daySchedule.day}-${periodIndex}`} className="border border-border p-2 text-center text-xs sm:text-sm min-w-[150px]">
                      {isAfterSaturdayCutoff ? "-" : (currentDescriptor.isBreak ? currentDescriptor.label : (entrySubject || "-"))}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
