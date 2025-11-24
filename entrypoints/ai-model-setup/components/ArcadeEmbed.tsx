import type { JSX } from 'react';

/**
 * Arcade demo embed showing how to enable Chrome's built-in AI flags
 * and configure on-device models for file renaming.
 */
export function ArcadeEmbed(): JSX.Element {
  return (
    <div
      style={{
        position: 'relative',
        paddingBottom: 'calc(62.367724867724874%)',
        height: '0',
        width: '100%',
      }}
    >
      <iframe
        src="https://demo.arcade.software/iow4OOSfK6xdBOYLVDpx?embed&embed_mobile=inline&embed_desktop=inline&show_copy_link=true"
        title="Enable On-Device AI Models for Smarter File Names in Chrome"
        frameBorder="0"
        loading="lazy"
        allowFullScreen
        allow="clipboard-write"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          colorScheme: 'light',
        }}
      />
    </div>
  );
}
