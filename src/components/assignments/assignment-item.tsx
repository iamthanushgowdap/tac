
"use client";

import React from 'react';
import type { Assignment, AssignmentAttachment } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookMarked, Calendar, Download } from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AnimatedDownloadButton } from '@/components/ui/animated-download-button';

interface AssignmentItemProps {
  assignment: Assignment;
}

export function AssignmentItem({ assignment }: AssignmentItemProps) {
  const { toast } = useToast();

  const handleDownload = (attachment: AssignmentAttachment) => {
    toast({ title: "Download Started (Mock)", description: `Downloading ${attachment.name}... This is a mock.`, duration: 3000 });
    const blob = new Blob([`Mock file content for ${attachment.name}`], { type: attachment.type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const isPastDue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden">
      <CardHeader className="pb-3 pt-5 px-5 border-b">
        <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
                 <BookMarked className="h-6 w-6 text-primary" />
            </div>
            <div>
                <CardTitle className="text-lg font-semibold text-primary leading-tight">{assignment.title}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Posted by {assignment.postedByDisplayName}
                </CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-4">
        {assignment.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{assignment.description}</p>
        )}
         {assignment.dueDate && (
          <div className={`flex items-center text-sm mb-4 ${isPastDue ? 'text-destructive' : 'text-foreground'}`}>
            <Calendar className="h-4 w-4 mr-2" />
            <span>Due: {format(new Date(assignment.dueDate), "PPP")}</span>
            {isPastDue && <Badge variant="destructive" className="ml-2">Past Due</Badge>}
          </div>
        )}
        {assignment.attachments.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-1.5">Files:</h4>
            <div className="space-y-1.5">
              {assignment.attachments.map((att) => (
                <AnimatedDownloadButton
                  key={att.mockFileId}
                  onClick={() => handleDownload(att)}
                  fileName={att.name}
                  fileSize={att.size}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground px-5 py-3 border-t bg-muted/30">
        Posted {formatDistanceToNow(parseISO(assignment.postedAt), { addSuffix: true })}
      </CardFooter>
    </Card>
  );
}
