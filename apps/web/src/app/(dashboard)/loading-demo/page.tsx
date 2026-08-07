'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import {
  EnterpriseLoader,
  CompactEnterpriseLoader,
  LoadingSpinner,
  PageLoader,
} from '@/components/loading';

export default function LoadingDemoPage() {
  const [showFullLoader, setShowFullLoader] = useState(false);

  if (showFullLoader) {
    return (
      <div className="fixed inset-0 z-50">
        <EnterpriseLoader
          message="Demonstrating Enterprise Loading Experience"
          showProgress={true}
        />
        <Button
          onClick={() => setShowFullLoader(false)}
          className="fixed top-4 right-4 z-50"
          variant="outline"
        >
          Close Demo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Enterprise Loading Components
        </h1>
        <p className="text-muted-foreground mt-2">
          Professional loading experiences that elevate your application from POC to
          enterprise-grade
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enterprise Loader</CardTitle>
          <CardDescription>
            Full-screen loading experience with branding, progress tracking, and helpful tips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowFullLoader(true)} className="w-full">
            View Full Enterprise Loader
          </Button>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">Compact Version</h4>
            <Card className="p-8">
              <CompactEnterpriseLoader message="Processing your request..." />
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enhanced Loading Spinners</CardTitle>
          <CardDescription>Professional spinners with multiple sizes and variants</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <h4 className="font-medium text-sm">Sizes</h4>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="sm" />
                  <span className="text-xs text-muted-foreground">Small</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="md" />
                  <span className="text-xs text-muted-foreground">Medium</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="lg" />
                  <span className="text-xs text-muted-foreground">Large</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <h4 className="font-medium text-sm">Variants</h4>
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner variant="primary" />
                  <span className="text-xs text-muted-foreground">Primary</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner variant="default" />
                  <span className="text-xs text-muted-foreground">Default</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner variant="subtle" />
                  <span className="text-xs text-muted-foreground">Subtle</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <h4 className="font-medium text-sm">Page Loader</h4>
              <Card className="h-48">
                <PageLoader message="Loading your data..." showBrand={true} />
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">❌ Before (POC-style)</CardTitle>
            <CardDescription>Basic spinner that looks unprofessional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-red-200 rounded-lg">
              <div className="text-center">
                <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">✅ After (Enterprise-level)</CardTitle>
            <CardDescription>Professional loading with branding and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-green-200 rounded-lg">
              <CompactEnterpriseLoader message="Initializing workspace..." />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
