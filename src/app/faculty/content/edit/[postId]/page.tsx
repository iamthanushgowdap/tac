"use client";

import React, { useState, useEffect } from 'react';
import { CreatePostForm } from '@/components/content/create-post-form';
import type { Post } from '@/types';
import { useAuth } from '@/components/auth-provider';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldCheck, AlertTriangle, ArrowLeft } from 'lucide-react';
import { SimpleRotatingSpinner } from '@/components/ui/loading-spinners';

export default function FacultyEditPostPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [pageLoading, setPageLoading] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [initialPostData, setInitialPostData] = useState<Post | null>(null);
  const [errorLoadingPost, setErrorLoadingPost] = useState<string | null>(null);

  const postId = params?.postId as string;

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'faculty') {
        router.push(user ? '/dashboard' : '/login');
        return;
      }
      if (postId && typeof window !== 'undefined') {
        const postsStr = localStorage.getItem('apsconnect_posts'); 
        const allPosts: Post[] = postsStr ? JSON.parse(postsStr) : [];
        const postToEdit = allPosts.find(p => p.id === postId);

        if (postToEdit) {
          if (postToEdit.authorId !== user.uid) {
            setErrorLoadingPost("Access Denied: You can only edit your own posts.");
            setInitialPostData(null);
          } else {
            setInitialPostData({...postToEdit, likes: postToEdit.likes || []});
          }
        } else {
          setErrorLoadingPost("Post not found. It may have been deleted.");
        }
      } else if (!postId) {
         setErrorLoadingPost("No post ID provided.");
      }
      setPageLoading(false);
    }
  }, [user, authLoading, router, postId]);

  const handleFormSubmit = async (postData: Post, attachmentsToUpload: File[]) => {
    if (!user || !initialPostData || initialPostData.authorId !== user.uid) {
        toast({ title: "Unauthorized", description: "You cannot edit this post.", variant: "destructive", duration: 3000 });
        return;
    }
    setFormSubmitting(true);
    try {
      console.log("Updated post data (Faculty):", postData);
      console.log("Files to 'upload' (Faculty):", attachmentsToUpload.map(f => ({ name: f.name, type: f.type, size: f.size })));

      if (typeof window !== 'undefined') {
        const existingPostsStr = localStorage.getItem('apsconnect_posts'); 
        let existingPosts: Post[] = existingPostsStr ? JSON.parse(existingPostsStr) : [];
        
        const postIndex = existingPosts.findIndex(p => p.id === postData.id);
        if (postIndex > -1) {
          existingPosts[postIndex] = {...postData, updatedAt: new Date().toISOString(), likes: postData.likes || [] };
        } else {
          toast({ title: "Error", description: "Original post not found for update.", variant: "destructive", duration: 3000 });
          setFormSubmitting(false);
          return;
        }
        localStorage.setItem('apsconnect_posts', JSON.stringify(existingPosts)); 
      }

      toast({
        title: "Post Updated Successfully",
        description: `"${postData.title}" has been updated.`,
        duration: 3000,
      });
      router.push('/feed'); 
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Error Updating Post",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  if (pageLoading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'faculty') {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-destructive text-xl sm:text-2xl">Access Denied</CardTitle></CardHeader>
          <CardContent>
            <ShieldCheck className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">You do not have permission to view this page.</p>
            <Link href="/dashboard"><Button variant="outline" className="mt-6">Go to Dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (errorLoadingPost) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Card className="max-w-md mx-auto shadow-lg">
          <CardHeader><CardTitle className="text-warning text-xl sm:text-2xl">Error Loading Post</CardTitle></CardHeader>
          <CardContent>
            <AlertTriangle className="h-12 w-12 sm:h-16 sm:w-16 text-warning mx-auto mb-4" />
            <p className="text-md sm:text-lg text-muted-foreground">{errorLoadingPost}</p>
            <Link href="/feed"><Button variant="outline" className="mt-6">Back to Feed</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!initialPostData) {
     return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <SimpleRotatingSpinner className="h-12 w-12 text-primary" /> <span className="ml-2">Loading post data...</span>
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
      <CreatePostForm 
        onFormSubmit={handleFormSubmit} 
        initialData={initialPostData}
        isLoading={formSubmitting}
        formTitle="Faculty: Edit Your Post"
        formDescription="Modify the details of your post. Note: Attachments will need to be re-selected if changes are needed."
        submitButtonText="Update Post"
      />
    </div>
  );
}
