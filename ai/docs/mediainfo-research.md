Integrating MediaInfo.js in a Vite + React Chrome Extension
MediaInfo.js is a WebAssembly-based library for extracting rich media metadata entirely client-side. It can retrieve technical details (codec, resolution, bitrate, duration, etc.) as well as tag info (like title, artist, album for audio) from video/audio files
medium.com
medium.com
. This makes it ideal for your Chrome extension that renames downloads based on media metadata, since everything can run in-browser without server calls. Below I outline the best integration approach and alternatives, given your Vite+React MV3 extension setup:
1. Using MediaInfo.js in Your Extension
Install the library: Add MediaInfo.js via your package manager (Bun/NPM/Yarn). For example:
bun add mediainfo.js    # or: npm install mediainfo.js
This pulls in the ESM module and the accompanying WASM binary
medium.com
. MediaInfo’s license is BSD-2-Clause, so it’s permissive and fine to use in a browser extension
mediainfo.js.org
. Loading the WASM: MediaInfo.js will need to load its WebAssembly module (MediaInfoModule.wasm) at runtime. In a Vite build, you should ensure this file is copied to the extension output and served with the correct MIME type (application/wasm). There are a few ways to handle this:
Use Vite’s asset handling: You can import the .wasm as an asset to get a URL. For example:
import wasmURL from 'mediainfo.js/MediaInfoModule.wasm?url';
Vite’s bundler will then bundle or copy the WASM and give you a wasmURL. When initializing MediaInfo, pass a locateFile option to point to this URL.
Place in public folder: Copy MediaInfoModule.wasm to your public/ directory (so it ends up in the extension build). Then use Chrome’s runtime URL to load it. For example:
import mediaInfoFactory from 'mediainfo.js';
const mediaInfo = await mediaInfoFactory({
  locateFile: (fileName) => chrome.runtime.getURL(fileName),
  format: 'object'  // get results as JS object
});
The locateFile option tells MediaInfo’s loader exactly where to find the WASM file
mediainfo.js.org
 – here we use chrome.runtime.getURL('MediaInfoModule.wasm') to get the extension-internal URL. This ensures the WASM loads correctly even in production build.
Instantiate and reuse MediaInfo: Creating the MediaInfo instance is asynchronous because it loads the WASM. You can do it with a promise or await. For example:
// Using async/await
const mediaInfo = await mediaInfoFactory({ format: 'object' });

// Or using promise
mediaInfoFactory({ format: 'object' }).then(mediaInfo => { ... });
It’s best to instantiate once and reuse the mediaInfo instance if you’ll analyze multiple files in the session, rather than creating a new WASM instance each time. The library supports analyzing multiple files by resetting the state; you can call mediaInfo.close() when done overall
mediainfo.js.org
mediainfo.js.org
. Reusing the instance avoids re-loading the WASM for every download. Feeding data to MediaInfo: The library doesn’t magically know the file’s bytes; you provide them via a callback. You won’t load the entire file into memory – instead, MediaInfo.js uses chunked reading. You give it two things: the total file size, and a function to read a chunk at a given offset. MediaInfo will call that function as needed to gather enough data. For example, from the docs:
const fileSize = ...;  // e.g. content-length or Blob.size
async function readChunk(chunkSize, offset) {
  // fetch or read [offset, offset+chunkSize) bytes
  const slice = fileBlob.slice(offset, offset + chunkSize);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}
const result = await mediaInfo.analyzeData(fileSize, readChunk);
This pattern is shown in the official docs
mediainfo.js.org
. In your extension, you can obtain a Blob or use fetch with range requests to implement readChunk:
If you intercept before download (onDeterminingFilename): You likely only have the file URL at that point, not a Blob yet. You can perform a range fetch() to get initial bytes. For example, do a HEAD request to get Content-Length (file size), then use fetch(url, { headers: { Range: "bytes=0-65535" } }) to get the first ~64KB (or whatever chunk size you choose). Many media formats (MP4, MP3, etc.) store metadata in headers, so the first chunk may have duration, resolution, etc. If needed, MediaInfo might request more chunks (e.g. some formats store info at the end; MediaInfo will ask for those via your readChunk function). Make sure your extension has host permission for the URL so CORS doesn’t block the fetch. Since your manifest uses <all_urls> for downloads
GitHub
, you should be able to fetch the file bytes.
If you analyze after download completes: Chrome’s Downloads API doesn’t give direct file access without user permission, so the typical approach is indeed to analyze during download or in parallel. However, you could wait until the file is saved and then use the File System Access API (with user consent) to read the file. This is more complex (and likely not necessary if you can do it during download).
Avoid blocking the extension: MediaInfo’s parsing is CPU-intensive but usually fast for small chunks. Still, parsing a large video could take a couple of seconds. In a Manifest V3 extension, long-running tasks should be done outside the service worker thread to avoid timing issues. The good practice is to use an Offscreen Document or a Web Worker to handle the heavy work:
Offscreen Document approach: Since your extension already uses an Offscreen Document (hidden background page) for heavy tasks
GitHub
GitHub
, you can delegate media analysis to it. When a download is detected, send a message from the background (service worker) to the offscreen page with the file’s URL (and perhaps desired metadata toggles). In the offscreen context (which can run React or plain scripts), load MediaInfo and perform the fetch/analyzeData. This keeps the service worker free to handle other events. Your project plan even mentions “offscreen extraction for ... lightweight container metadata” in the Phase-2 design
GitHub
 – MediaInfo.js fits that role. By doing it offscreen, you can also afford a bit more time (a few seconds) for analysis without blocking the critical download filename suggestion flow.
Web Worker alternative: If you prefer, you can spin up a Web Worker from the offscreen document to run MediaInfo in an isolated thread. The react-mediainfo wrapper you found essentially does this – it loads MediaInfo in a worker to avoid blocking the UI thread. In your case, since the “UI” is just the extension (and possibly offscreen page), you might not need that extra complexity. But if you do heavy analysis (e.g. very large files), using a worker is a safe choice. With Vite, you can create a worker script (e.g. mediainfo.worker.js) and import it via new Worker(new URL('mediainfo.worker.js', import.meta.url)). Inside the worker, use MediaInfo.js normally and postMessage the results back. This pattern is similar to what react-mediainfo does behind the scenes.
Time and size constraints: Keep in mind performance limits. If a media file is enormous, you don’t want to download it entirely just to get metadata (that defeats the purpose!). MediaInfo allows you to read just the parts needed. For example, it might read a few KB from the start, maybe jump to the end for duration info, etc. You can also set a chunkSize option when creating the MediaInfo instance (e.g. 1MB) to control how much it reads at once. In testing, tune this for a balance of speed vs. overhead. Your project docs note to “rely on Range fetch + strict timeouts” for large media
GitHub
. In practice, this means you might decide to limit how long you spend parsing – e.g. if MediaInfo hasn’t returned metadata after, say, 5-8 seconds, you fall back to not using it (or use a simpler naming). This ensures the download isn’t delayed too long by analysis. Chrome’s download filename determination is synchronous, but you’ve built an async suggestion mechanism with a 400ms timeout in code. You might want to only use MediaInfo in a second-phase rename (upgrade) if it can’t finish in the initial 400ms window. For example, initially name the file without media metadata, then use your extension’s “upgrade” flow (with user permission) to rename the file after download using the retrieved metadata. This matches the idea of a Phase-2 contextual upgrade in your design. Putting it all together: In summary, the integration would look like:
Install MediaInfo.js in your project.
Expose the WASM to the extension build (via public folder or Vite asset import) and use locateFile so MediaInfo can load it.
On download start, if the file type is audio/video and the user enabled media-metadata naming, send a message to your offscreen page or initiate MediaInfo analysis. Provide the file URL/size to the analysis function.
Use range requests in the readChunk function to avoid full downloads. For example, first 1MB, and let MediaInfo ask for more if needed.
Get metadata result (as JSON/object). From this, pull the fields you want (e.g. resolution, duration, artist, etc.) and construct the filename. (MediaInfo’s output for common fields like duration or resolution will be under the appropriate track – e.g. the "General" or "Video" track in the JSON. You can parse out something like widthxheight or a human-readable duration.)
Apply the name. If you are within the onDeterminingFilename flow and have the name in time, use suggest(filename). If using a second-phase rename, update the name via the file system after confirming with the user (your extension architecture already anticipates an “Upgrade” flow with user confirmation/FS access).
2. Considering Alternatives
You asked if there’s a “better way” or another library. There are a few alternatives, but each has limitations:
music-metadata-browser: This is a pure-JS library for reading audio file tags (ID3 for MP3, etc.)
github.com
. It’s great for song info (title, artist, album art, etc.) and runs fully in JS (no WASM). However, it only supports audio files (and some basic info like duration). It won’t parse video files or provide video codecs/resolutions. If your use-case was only MP3/M4A tagging, this could be a lighter-weight choice. But since you need to handle videos too, you’d need another solution in parallel – complicating your extension.
Using HTML <video>/<audio> elements: In some cases, you can get basic metadata by loading the file into a hidden media element. For example, setting a <video src="blob:..."> can sometimes give you video.videoWidth, video.videoHeight, and video.duration after metadata loads. However, this approach is limited. It only works for formats the browser can natively play (e.g. MP4, WebM, MP3, etc.), and won’t give you detailed info like codec names or bitrate. Also, in a background/offscreen context, you’d have to create a media element and wait for it to load – which might be as slow as using MediaInfo (and less comprehensive). It’s not reliable for broad use.
ffmpeg.wasm or custom WASM parsers: There are projects like ffmpeg compiled to WebAssembly that could extract metadata. But ffmpeg.wasm is much larger and heavier (dozens of MBs) and overkill if you only need metadata. MediaInfo.js is specifically optimized for metadata extraction and is much smaller. Your design docs even mention using “FFmpeg-lite” under performance budgets
GitHub
, which suggests being cautious with payload size. MediaInfo fits that budget better (v0.3.6 WASM is a few MB and loads fairly quickly).
In short, MediaInfo.js is the most straightforward, all-in-one solution for your needs. It covers virtually all common media formats and provides both technical and tag metadata in one go. Alternative libraries would either narrow the file type support or significantly increase complexity. Given that MediaInfo.js runs fully on-device and with acceptable performance (especially if you use chunked reads and offscreen processing), it aligns well with your extension’s “local-first” philosophy
GitHub
.
3. Integration Tips for Vite + React (WXT) Extension
To ensure a smooth integration in your Vite/React codebase (which uses the WXT framework):
Add to Bundler Config (if needed): Vite generally supports WASM, but double-check your build. If the WASM isn’t loading, use the locateFile approach or configure Vite to treat .wasm as an asset. You might also verify the MIME type in the extension: Chrome will refuse to compile WASM with an incorrect MIME. Loading via chrome.runtime.getURL should automatically serve it with correct type if packaged, but test in dev. The StackOverflow solution for CRA (which used copy-webpack-plugin and a service worker cache) isn’t needed with Vite; just ensure the file is in dist and reachable
stackoverflow.com
stackoverflow.com
.
Lazy-load MediaInfo: Don’t import or initialize MediaInfo.js until you actually need it (when a download event for media occurs). This avoids adding overhead for every download or on startup. For example, you can dynamically import('mediainfo.js') inside the handler for media files. This way the WASM is loaded only on demand. Given that users might download many non-media files, it’s good to only pay the cost when necessary.
Testing: Use your extension’s manual test server with media files (as listed under the 📸 Media scenario
GitHub
) to verify that the filename suggestions include the metadata you expect. Test a variety of formats (MP4, MKV, MP3, FLAC, etc.) to ensure MediaInfo handles them and your code picks the right fields. Also test the performance – e.g. a 1GB video file: does your range-read approach still get the metadata quickly (MediaInfo might only read headers, so it should be fine)? And check what happens if MediaInfo fails or takes too long (your code should fall back gracefully, perhaps leaving the name unchanged or using a simpler rule).
By following the above approach, you integrate MediaInfo.js effectively into your Chrome extension. On download clicks, your extension can detect media files, extract the desired metadata on the client side, and incorporate it into the filename. This leverages a well-supported library for comprehensive media info while respecting the performance and architecture constraints of a MV3 extension (doing heavy work off the UI thread, using partial data reads, etc.). References:
MediaInfo.js official docs – overview and use cases
