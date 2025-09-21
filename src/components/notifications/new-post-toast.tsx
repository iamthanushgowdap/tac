
"use client";

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { PostCategory } from '@/types';

interface NewPostToastProps {
  authorName: string;
  authorInitials: string;
  authorImage?: string;
  postCategory: PostCategory;
  postTitle: string;
  timestamp: string; // ISO string
}

export function NewPostToast({
  authorName,
  authorInitials,
  authorImage,
  postCategory,
  postTitle,
  timestamp,
}: NewPostToastProps) {
  return (
    <div className="w-full max-w-xs p-0 text-foreground bg-card rounded-lg shadow-lg dark:bg-gray-800 dark:text-gray-300" role="alert">
      <div className="flex items-center mb-3 p-4 border-b border-border dark:border-gray-700">
        <span className="text-sm font-semibold text-foreground dark:text-white">New Post Created!</span>
      </div>
      <div className="flex items-center p-4">
        <div className="relative inline-block shrink-0">
          <Avatar className="w-12 h-12 rounded-full">
            <AvatarImage src={authorImage} alt={`${authorName || 'Author'} image`} data-ai-hint="person avatar" />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 inline-flex items-center justify-center w-6 h-6 bg-accent rounded-full text-accent-foreground">
            <MessageSquare className="w-3 h-3" />
            <span className="sr-only">New post icon</span>
          </span>
        </div>
        <div className="ms-3 text-sm font-normal">
          <div className="text-sm font-semibold text-foreground dark:text-white">{authorName || "APSConnect User"}</div>
          <div className="text-sm font-normal text-muted-foreground dark:text-gray-400">
            posted a new {postCategory}: "{postTitle.length > 30 ? postTitle.substring(0, 30) + '...' : postTitle}"
          </div>
          <span className="text-xs font-medium text-accent dark:text-blue-500">
            {formatDistanceToNow(parseISO(timestamp), { addSuffix: true })}
          </span>
        </div>
      </div>
    </div>
  );
}
