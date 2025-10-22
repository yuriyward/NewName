export const mockFilenames = {
  good: 'Document-Title-2025-03-04.pdf',
  bad: 'Original.pdf',
  screenshot: 'Screenshot',
  download: 'download',
  image: 'Image',
} as const;

export const mockProposals = {
  high: 'Supabase — CORS for Edge Functions.pdf',
  suggested: 'Database Configuration Guide.pdf',
  alternative: 'Edge Function Setup Documentation.pdf',
} as const;

export const filenameVariants = {
  short: {
    original: 'doc.pdf',
    renamed: 'Report.pdf',
  },
  normal: {
    original: 'Original.pdf',
    renamed: 'Supabase — CORS for Edge Functions.pdf',
  },
  long: {
    original:
      'project-specifications-2025-comprehensive-analysis-document-v3-final.pdf',
    renamed:
      'Enterprise Resource Planning System Integration Guide with Cloud Architecture Patterns.pdf',
  },
  veryLong: {
    original:
      'system-requirements-specification-for-distributed-microservices-architecture-implementation-phase-three-comprehensive-documentation.pdf',
    renamed:
      'Comprehensive Guide to Building Scalable Distributed Microservices Architecture with Cloud-Native Patterns and DevOps Integration Strategies for Enterprise Deployments.pdf',
  },
} as const;

export type FilenamePresetKey = keyof typeof filenameVariants;
