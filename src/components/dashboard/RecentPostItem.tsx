"use client";

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Newspaper,
  Paperclip,
  BookOpen,
  FileText,
  ArrowRight
} from 'lucide-react';
import type { Post } from '@/types';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface RecentPostItemProps {
  post: Post;
}

export function RecentPostItem({ post }: RecentPostItemProps) {
  const categoryIcons: Partial<Record<Post['category'], React.ElementType>> = {
    event: CalendarDays,
    news: Newspaper,
    link: Paperclip,
    note: BookOpen,
    schedule: CalendarDays,
  };

  const IconComponent = post?.category && categoryIcons[post.category] ? categoryIcons[post.category] : FileText;

  return (
    <Card className="shadow-md hover:shadow-xl transition-all duration-300 ease-in-out flex flex-col h-full bg-background border border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-5 px-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <IconComponent className="h-6 w-6 text-primary" />
            <CardTitle className="text-lg font-semibold text-primary leading-tight line-clamp-2">
              {post.title}
            </CardTitle>
          </div>
          <Badge
            variant={post.category === "event" || post.category === "schedule" ? "default" : "secondary"}
            className="text-xs ml-2 px-2 py-1 rounded-full"
          >
            {post.category ? post.category.charAt(0).toUpperCase() + post.category.slice(1) : "Other"}
          </Badge>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          By {post.authorName || "Unknown"} — {post.createdAt ? formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true }) : "some time ago"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 py-4 flex-grow">
        <p className="text-sm text-foreground line-clamp-3 whitespace-pre-wrap leading-relaxed">
          {post.content || "No content available."}
        </p>
      </CardContent>
      <CardFooter className="pt-3 px-6 pb-5 border-t border-border/50">
        <Link href={`/post/${post.id}`} className="w-full">
          <Button variant="ghost" size="sm" className="w-full justify-between text-primary hover:bg-primary/10 group">
            View Full Post <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
