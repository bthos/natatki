'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import NotesList from '@/components/NotesList';
import LoginPrompt from '@/components/LoginPrompt';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading, checkAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Check for OAuth errors
    const errorParam = searchParams.get('error');
    const reasonParam = searchParams.get('reason');
    if (errorParam === 'auth_failed') {
      setError(reasonParam || 'Authentication failed. Please try again.');
      // Clear error from URL
      router.replace('/');
    }
  }, [checkAuth, searchParams, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold">Authentication Error</h3>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        )}
        <LoginPrompt />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <NotesList />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}

