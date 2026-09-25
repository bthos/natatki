/**
 * Utility functions for note operations
 */

import type { Note } from '../types/note';

/**
 * Generate a unique note ID
 */
export function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate filename for a note based on date and ID
 */
export function generateNoteFilename(note: Note): string {
  const date = new Date(note.createdAt);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const idShort = note.id.replace('note_', '').substring(0, 8);
  return `${dateStr}-${idShort}.md`;
}

/**
 * Parse note filename to extract date and ID
 */
export function parseNoteFilename(filename: string): { date: string; idShort: string } | null {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.md$/);
  if (!match) return null;
  return {
    date: match[1],
    idShort: match[2]
  };
}

/**
 * Convert note to Markdown format with frontmatter
 */
export function noteToMarkdown(note: Note): string {
  const frontmatter: Record<string, unknown> = {
    id: note.id,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt
  };

  if (note.title) frontmatter.title = note.title;
  if (note.tags.length > 0) frontmatter.tags = note.tags;
  if (note.category) frontmatter.category = note.category;
  if (note.aiSummary) frontmatter.aiSummary = note.aiSummary;
  if (note.linkedRepos.length > 0) {
    frontmatter.linkedRepos = note.linkedRepos;
  }

  const frontmatterStr = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(v => typeof v === 'string' ? `"${v}"` : JSON.stringify(v)).join(', ')}]`;
      }
      return `${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`;
    })
    .join('\n');

  return `---\n${frontmatterStr}\n---\n\n${note.body}`;
}

/**
 * Parse Markdown with frontmatter to Note
 */
export function markdownToNote(markdown: string, id: string): Note | null {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    // No frontmatter, treat entire content as body
    return {
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      body: markdown,
      tags: [],
      attachments: [],
      linkedRepos: []
    };
  }

  const frontmatterStr = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  const frontmatter: Record<string, unknown> = {};
  frontmatterStr.split('\n').forEach(line => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const key = match[1];
      let value: unknown = match[2].trim();
      
      // Ensure value is a string for string operations
      if (typeof value === 'string') {
        // Try to parse as JSON
        if (value.startsWith('[') || value.startsWith('{')) {
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string
          }
        } else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
      }

      frontmatter[key] = value;
    }
  });

  return {
    id: frontmatter.id as string || id,
    createdAt: (frontmatter.createdAt as string) || new Date().toISOString(),
    updatedAt: (frontmatter.updatedAt as string) || new Date().toISOString(),
    title: frontmatter.title as string | undefined,
    body,
    tags: (frontmatter.tags as string[]) || [],
    category: frontmatter.category as string | undefined,
    aiSummary: frontmatter.aiSummary as string | undefined,
    attachments: [], // Attachments stored separately
    linkedRepos: (frontmatter.linkedRepos as Array<{ repoOwner: string; repoName: string }>) || []
  };
}

