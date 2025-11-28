/**
 * Constants for downloads permission page
 */

/**
 * Videos hosted on GitHub for folder selection process
 * Keep videos external to avoid bloating extension size
 * Using 4:3 cropped versions for larger display in the UI
 */
export const FOLDER_SELECTION_STEP1_VIDEO_URL =
  'https://cdn.jsdelivr.net/gh/yuriyward/github-public-media@main/videos/folder_access_setup_step_1_cropped_4x3.mp4';

export const FOLDER_SELECTION_STEP2_VIDEO_URL =
  'https://cdn.jsdelivr.net/gh/yuriyward/github-public-media@main/videos/folder_access_setup_step_2_cropped_4x3.mp4';

/**
 * Delay before auto-closing the tab after successful setup (ms)
 * Allows users to see the success message before the tab closes
 */
export const SUCCESS_AUTO_CLOSE_DELAY_MS = 100;
