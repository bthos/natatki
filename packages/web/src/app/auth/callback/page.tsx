'use client';

import { useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken } = useAuthStore();
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (processedRef.current) {
      return;
    }

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    if (error) {
      console.error('OAuth error:', error);
      router.push('/?error=auth_failed&reason=' + encodeURIComponent(error));
      return;
    }
    
    if (code) {
      processedRef.current = true; // Mark as processed immediately
      
      // Exchange code for token via backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      fetch(`${apiUrl}/auth/github/callback?code=${code}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            console.error('Backend error:', data);
            throw new Error(data.error?.message || 'Failed to exchange code');
          }
          return data;
        })
        .then(data => {
          if (data.data?.accessToken) {
            setAccessToken(data.data.accessToken);
            router.push('/');
          } else {
            console.error('No access token in response:', data);
            router.push('/?error=auth_failed&reason=no_token');
          }
        })
        .catch((err) => {
          console.error('Callback error:', err);
          const errorMessage = err.message || 'unknown';
          // If code expired, provide helpful message
          if (errorMessage.includes('expired') || errorMessage.includes('incorrect')) {
            router.push('/?error=auth_failed&reason=' + encodeURIComponent('OAuth code expired. Please try signing in again.'));
          } else {
            router.push('/?error=auth_failed&reason=' + encodeURIComponent(errorMessage));
          }
        });
    } else {
      router.push('/');
    }
  }, [searchParams, router, setAccessToken]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

