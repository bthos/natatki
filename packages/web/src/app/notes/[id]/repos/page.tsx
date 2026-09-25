'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import RepositoriesList from '@/components/RepositoriesList';
import { useAuthStore } from '@/store/useAuthStore';

export default function NoteReposPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.push(`/notes/${id}`)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors mb-4"
          title="Back to note"
          aria-label="Back to note"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Repository Analysis</h1>
        <p className="text-gray-600 mt-2">Find repositories where this note can be applied</p>
      </div>

      <RepositoriesList noteId={id} />
    </div>
  );
}
