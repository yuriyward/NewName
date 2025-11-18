/**
 * Image description generation using Prompt API
 * Generates concise multi-sentence descriptions of image content
 */

import { SILENT_RENAME_THRESHOLD } from '@/entrypoints/shared/constants/confidence-thresholds';
import { formatPageContextForPrompt } from '@/entrypoints/shared/context/page-context-formatter';
import { offscreenLogger } from '@/entrypoints/shared/debug/offscreen-logger';
import type { PageContextDetails } from '@/entrypoints/shared/state/page-context-store';
import {
  createPromptSession,
  destroyPromptSession,
} from '../text-analysis/prompt-helpers';

export interface ImageDescription {
  description: string;
  confidence: number;
}

const DESCRIPTION_SYSTEM_PROMPT = `You are a precise image analyst. Your task is to generate a clear,
concise description of image content in up to three sentences. Focus on what the image shows, not metadata.

Guidelines:
- Be specific: describe objects, scenes, text, or activity
- Keep it tight but expressive: aim for under 3 sentences total
- No metadata: avoid file info, dimensions, format
- Natural language: write as you'd describe it to someone
- Reply with only the description text, no formatting`;

/**
 * Generate a concise description of image content using Prompt API
 * Uses multimodal session to analyze image and return plain text description
 *
 * @param imageBlob - PNG blob of image to describe
 * @param pageContext - Optional page context (title, heading, URL) from download
 * @returns Description object with text and baseline confidence
 *
 * Note: Multimodal availability is verified by the pipeline orchestrator before calling this function.
 */
export async function describeImage(
  imageBlob: Blob,
  pageContext?: PageContextDetails,
): Promise<ImageDescription | null> {
  let session = null;

  try {
    const startTime = Date.now();

    offscreenLogger.log(
      '[ImageDescription] Creating multimodal session for image description',
      {
        blobSize: imageBlob.size,
        blobType: imageBlob.type,
      },
    );

    // Create multimodal session expecting image + text input
    session = await createPromptSession({
      systemPrompt: DESCRIPTION_SYSTEM_PROMPT,
      temperature: 0.4,
      topK: 10,
      expectedInputs: [{ type: 'image' }, { type: 'text' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
      outputLanguage: 'en',
    });

    if (!session) {
      const helpText =
        'Check chrome://flags/#prompt-api-for-gemini-nano-multimodal-input is set to "Enabled" (not "Default"). This is a Chrome quirk: "Default" does NOT enable multimodal support - you must explicitly select "Enabled" from the dropdown.';
      offscreenLogger.warn(
        `[ImageDescription] Failed to create multimodal session. ${helpText}`,
      );
      offscreenLogger.error(
        `[ImageDescription] Failed to create multimodal session. ${helpText}`,
      );
      return null;
    }

    // Build multimodal prompt with image and text instruction
    let promptText = `Analyze this image and provide a detailed description in up to three sentences.
Focus on the visual content and key details; avoid metadata or technical comments.`;

    // Add page context if available
    promptText += formatPageContextForPrompt(pageContext, {
      prefix: '\n\nThis image was downloaded from:',
      multiline: true,
    });

    // Send prompt with image content using multimodal format
    // For multimodal sessions, content must be an array of content items
    // See: https://github.com/webmachinelearning/prompt-api
    const response = await session.prompt([
      {
        role: 'user',
        content: [
          { type: 'text', value: promptText },
          { type: 'image', value: imageBlob },
        ],
      },
    ]);

    const elapsedMs = Date.now() - startTime;

    // Use response text directly as description
    const description = response.trim();

    if (!description || description.length === 0) {
      offscreenLogger.warn('[ImageDescription] Empty description in response');
      return null;
    }

    offscreenLogger.log('[ImageDescription] Description generated', {
      description: description,
      elapsedMs,
    });

    return {
      description,
      confidence: SILENT_RENAME_THRESHOLD, // Baseline confidence for model-generated descriptions
    };
  } catch (error) {
    offscreenLogger.warn(
      '[ImageDescription] Image description generation failed',
      {
        error,
      },
    );
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}
