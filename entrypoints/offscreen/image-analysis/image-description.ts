/**
 * Image description generation using Prompt API
 * Generates concise 1-2 sentence descriptions of image content
 */

import { SILENT_RENAME_THRESHOLD } from '@/entrypoints/shared/constants/confidence-thresholds';
import { debugLogger } from '@/entrypoints/shared/debug/logger';
import {
  createPromptSession,
  destroyPromptSession,
} from '../text-analysis/prompt-helpers';

export interface ImageDescription {
  description: string;
  confidence: number;
}

const DESCRIPTION_SYSTEM_PROMPT = `You are a precise image analyst. Your task is to generate a clear,
concise description of image content in 1-2 sentences. Focus on what the image shows, not metadata.

Guidelines:
- Be specific: describe objects, scenes, text, or activity
- Keep it brief: aim for under 120 characters
- No metadata: avoid file info, dimensions, format
- Natural language: write as you'd describe it to someone
- Reply with only the description text, no formatting`;

/**
 * Generate a concise description of image content using Prompt API
 * Uses multimodal session to analyze image and return plain text description
 *
 * @param imageBlob - PNG blob of image to describe
 * @returns Description object with text and baseline confidence
 *
 * Note: Multimodal availability is verified by the pipeline orchestrator before calling this function.
 */
export async function describeImage(
  imageBlob: Blob,
): Promise<ImageDescription | null> {
  let session = null;

  try {
    const startTime = Date.now();

    console.log(
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
      const message =
        '[ImageDescription] Failed to create multimodal session even though API reported as available. ' +
        'Check chrome://flags/#prompt-api-for-gemini-nano-multimodal-input is set to "Enabled" (not "Default"). ' +
        'This is a Chrome quirk: "Default" does NOT enable multimodal support - ' +
        'you must explicitly select "Enabled" from the dropdown.';
      debugLogger.warn(message);
      console.error(message);
      return null;
    }

    // Build multimodal prompt with image and text instruction
    const promptText = `Analyze this image and provide a 1-2 sentence description.
Keep it under 120 characters and focus on what the image shows.`;

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
      debugLogger.warn('[ImageDescription] Empty description in response');
      return null;
    }

    console.log('[ImageDescription] Description generated', {
      description: description,
      elapsedMs,
    });

    return {
      description,
      confidence: SILENT_RENAME_THRESHOLD, // Baseline confidence for model-generated descriptions
    };
  } catch (error) {
    debugLogger.warn('[ImageDescription] Image description generation failed', {
      error,
    });
    return null;
  } finally {
    if (session) {
      destroyPromptSession(session);
    }
  }
}
