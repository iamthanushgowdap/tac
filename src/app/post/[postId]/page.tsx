
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, User } from '@/components/auth-provider';
import type { Post, PostAttachment, PostCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Heart,
  FileText,
  CalendarDays,
  Newspaper,
  BookOpen,
  Paperclip,
  Download,
  Edit3,
  Trash2,
  ArrowLeft,
  MapPin,
  Users,
  AlertTriangle,
  MoreHorizontal,
  CalendarPlus 
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generatePostEventICS, downloadICSFile } from '@/lib/calendar-utils';
import { AnimatedDownloadButton } from '@/components/ui/animated-download-button';

const getInitials = (name?: string | null) => {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  }
  if (name.length >= 2) return name.substring(0, 2).toUpperCase();
  if (name.length === 1) return name.substring(0, 1).toUpperCase();
  return "??";
};

const categoryIcons: Partial<Record<PostCategory, React.ElementType>> = {
  event: CalendarDays,
  news: Newspaper,
  link: Paperclip,
  note: BookOpen,
  schedule: CalendarDays,
};

const getPostIconColor = (category?: PostCategory) => {
  if (!category) return "text-gray-500 dark:text-gray-400";
  switch(category) {
    case 'event': return "text-indigo-500 dark:text-indigo-400";
    case 'news': return "text-green-500 dark:text-green-400";
    case 'link': return "text-yellow-500 dark:text-yellow-400";
    case 'note': return "text-purple-500 dark:text-purple-400";
    case 'schedule': return "text-teal-500 dark:text-teal-400";
    default: return "text-gray-500 dark:text-gray-400";
  }
};

export default function IndividualPostPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTargetPostId, setDeleteTargetPostId] = useState<string | null>(null);


  const postId = params?.postId as string;

  const fetchPost = useCallback(() => {
    if (!postId) {
      setError("Post ID is missing.");
      setIsLoading(false);
      return;
    }
    if (typeof window !== 'undefined') {
      const postsStr = localStorage.getItem('apsconnect_posts');
      if (postsStr) {
        const allPosts: Post[] = JSON.parse(postsStr);
        const foundPost = allPosts.find(p => p.id === postId);
        if (foundPost) {
          let canView = false;
          if (!foundPost.targetBranches || foundPost.targetBranches.length === 0) {
            canView = true; 
          } else if (user) {
            if (user.role === 'admin') {
              canView = true;
            } else if (user.role === 'student' && user.branch && foundPost.targetBranches.includes(user.branch)) {
              canView = true;
            } else if (user.role === 'faculty' && user.assignedBranches && user.assignedBranches.some(b => foundPost.targetBranches.includes(b))) {
              canView = true;
            }
          }

          if(canView) {
            setPost(foundPost);
          } else {
            setError("You do not have permission to view this post or it doesn't exist.");
          }
        } else {
          setError("Post not found.");
        }
      } else {
        setError("No posts available.");
      }
    }
    setIsLoading(false);
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLikePost = () => {
    if (!user || !post) {
      toast({ title: "Login Required", description: "Please login to like posts.", variant: "destructive", duration: 3000 });
      return;
    }
    setPost(prevPost => {
      if (!prevPost) return null;
      const currentLikes = prevPost.likes || [];
      const userLiked = currentLikes.includes(user.uid);
      const newLikes = userLiked
        ? currentLikes.filter(uid => uid !== user.uid)
        : [...currentLikes, user.uid];
      const updatedPost = { ...prevPost, likes: newLikes };

      if (typeof window !== 'undefined') {
        const allPostsStr = localStorage.getItem('apsconnect_posts');
        let allPostsStored: Post[] = allPostsStr ? JSON.parse(allPostsStr) : [];
        const postIndex = allPostsStored.findIndex(storedPost => storedPost.id === postId);
        if (postIndex > -1) {
          allPostsStored[postIndex] = updatedPost;
          localStorage.setItem('apsconnect_posts', JSON.stringify(allPostsStored));
        }
      }
      return updatedPost;
    });
  };

  const confirmDeletePost = () => {
    if (post) setDeleteTargetPostId(post.id);
  };

  const handleDeletePost = () => {
    if (!deleteTargetPostId || !user || !post) return;

    if (!(user.role === 'admin' || (user.role === 'faculty' && post.authorId === user.uid))) {
        toast({title: "Unauthorized", description: "You cannot delete this post.", variant: "destructive", duration: 3000});
        setDeleteTargetPostId(null);
        return;
    }

    if (typeof window !== 'undefined') {
        let allPostsStr = localStorage.getItem('apsconnect_posts');
        let allPostsStored: Post[] = allPostsStr ? JSON.parse(allPostsStr) : [];
        allPostsStored = allPostsStored.filter(p => p.id !== deleteTargetPostId);
        localStorage.setItem('apsconnect_posts', JSON.stringify(allPostsStored));
        
        toast({title: "Post Deleted", description: `"${post.title}" has been deleted.`, duration: 3000});
        router.push('/feed'); 
    }
    setDeleteTargetPostId(null);
  };

  const handleEditPost = () => {
    if (!post || !user) return;
    if (user.role === 'admin') {
      router.push(`/admin/posts/edit/${post.id}`);
    } else if (user.role === 'faculty' && post.authorId === user.uid) {
      router.push(`/faculty/content/edit/${post.id}`);
    }
  };

  const handleDownloadAttachment = (attachment: PostAttachment) => {
    toast({ title: "Download Started (Mock)", description: `Downloading ${attachment.name}... This is a mock.`, duration: 3000 });
    const blob = new Blob(["Mock file content for " + attachment.name], { type: attachment.type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleAddToCalendar = () => {
    if (!post) return;
    if (post.category === 'event' || post.category === 'schedule') {
      if (!post.eventDate || !post.eventStartTime || !post.eventEndTime) {
        toast({ title: "Cannot Add to Calendar", description: "This event is missing necessary date/time details.", variant: "destructive", duration: 4000});
        return;
      }
      const icsContent = generatePostEventICS(post);
      downloadICSFile(`${post.title.replace(/\s+/g, '_')}.ics`, icsContent);
      toast({ title: "Event Added to Calendar", description: "Check your downloads for the .ics file.", duration: 3000 });
    } else {
      const icsContent = generatePostEventICS(post); 
      downloadICSFile(`${post.title.replace(/\s+/g, '_')}_reminder.ics`, icsContent);
      toast({ title: "Reminder Added to Calendar", description: "A reminder for this post has been generated. Check your downloads.", duration: 3000 });
    }
  };


  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-warning text-xl sm:text-2xl">Error Loading Post</CardTitle></CardHeader>
          <CardContent>
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-warning mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">{error}</p>
            <Link href="/feed">
              <Button variant="outline" className="mt-6">Back to Feed</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Post not found or you do not have permission to view it.</p>
         <Link href="/feed">
            <Button variant="outline" className="mt-4">Back to Feed</Button>
         </Link>
      </div>
    );
  }

  const IconComponent = categoryIcons[post.category] || FileText;
  const canEdit = user && (user.role === 'admin' || (user.role === 'faculty' && post.authorId === user.uid));
  const canDelete = user && (user.role === 'admin' || (user.role === 'faculty' && post.authorId === user.uid));
  const isCalendarRelevant = post.category === 'event' || post.category === 'schedule' || (post.eventDate && post.eventStartTime && post.eventEndTime);


  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="mb-6" aria-label="Go back to previous page">
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="shadow-xl rounded-lg overflow-hidden">
            <CardHeader className="border-b bg-card p-6">
                <div className="flex items-center space-x-4 mb-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={post.authorAvatarUrl || `https://picsum.photos/seed/${post.authorId}/48/48`} alt={post.authorName} data-ai-hint="person avatar"/>
                        <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-2xl font-bold text-primary">{post.title}</CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                            Posted by {post.authorName} ({post.authorRole})
                            <span className="mx-1.5">&bull;</span>
                            {formatDistanceToNow(parseISO(post.createdAt), { addSuffix: true })}
                        </CardDescription>
                    </div>
                </div>
                 <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                    <Badge variant={post.category === "event" || post.category === "schedule" ? "default" : "secondary"} className="capitalize flex items-center gap-1.5">
                        <IconComponent className={`h-4 w-4 ${getPostIconColor(post.category)}`} />
                        {post.category}
                    </Badge>
                    {post.targetBranches && post.targetBranches.length > 0 ? (
                        <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> For: {post.targetBranches.join(', ')}</span>
                    ) : (
                        <span className="flex items-center gap-1"><Users className="h-4 w-4" /> For: All Branches</span>
                    )}
                    {isCalendarRelevant && (post.eventDate || post.category === 'event' || post.category === 'schedule') && (
                      <Button variant="outline" size="sm" onClick={handleAddToCalendar} className="ml-auto" aria-label="Add to calendar">
                        <CalendarPlus className="mr-2 h-4 w-4" /> Add to Calendar
                      </Button>
                    )}
                </div>
                 {isCalendarRelevant && post.eventDate && (
                   <div className="mt-2 text-sm text-muted-foreground">
                     <p><strong>Date:</strong> {new Date(post.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     {post.eventStartTime && <p><strong>Time:</strong> {post.eventStartTime} {post.eventEndTime ? ` - ${post.eventEndTime}` : ''}</p>}
                     {post.eventLocation && <p><strong>Location:</strong> {post.eventLocation}</p>}
                   </div>
                 )}
            </CardHeader>
            <CardContent className="p-6">
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                    <p>{post.content}</p>
                </div>

                {post.attachments && post.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-semibold text-foreground mb-3">Attachments:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {post.attachments.map((att, index) => (
                        <AnimatedDownloadButton
                            key={index}
                            onClick={() => handleDownloadAttachment(att)}
                            fileName={att.name}
                            fileSize={att.size}
                        />
                    ))}
                    </div>
                </div>
                )}
            </CardContent>
            <CardFooter className="p-6 border-t flex justify-between items-center">
                <Button variant="ghost" onClick={handleLikePost} className="group" aria-label={post.likes?.includes(user?.uid || '') ? `Unlike post: ${post.title}` : `Like post: ${post.title}`}>
                    <Heart className={`h-5 w-5 mr-2 ${post.likes?.includes(user?.uid || '') ? 'fill-red-500 text-red-500' : 'text-muted-foreground group-hover:fill-red-500/30 group-hover:text-red-500'}`} />
                    <span className="text-sm text-muted-foreground group-hover:text-red-500">{post.likes?.length || 0} {post.likes?.length === 1 ? 'Like' : 'Likes'}</span>
                </Button>
                
                {(canEdit || canDelete) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`More actions for post: ${post.title}`}>
                            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Post Actions</DropdownMenuLabel>
                        {canEdit && <DropdownMenuItem onClick={handleEditPost}><Edit3 className="mr-2 h-4 w-4" />Edit Post</DropdownMenuItem>}
                        {canDelete && <DropdownMenuItem onClick={confirmDeletePost} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete Post</DropdownMenuItem>}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardFooter>
        </Card>

        <AlertDialog open={!!deleteTargetPostId} onOpenChange={() => setDeleteTargetPostId(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteTargetPostId(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
