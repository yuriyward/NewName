================================================
FILE: src/cli.ts
================================================
#!/usr/bin/env node

import { promises as fsPromises } from 'node:fs'

import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

import { unknownToError } from './error.js'
import { FORMAT_CHOICES } from './MediaInfo.js'
import mediaInfoFactory from './mediaInfoFactory.js'
import type { ReadChunkFunc } from './MediaInfo.js'
import type MediaInfo from './MediaInfo.js'

const analyze = async ({ coverData, file, format, full }: ReturnType<typeof parseArgs>) => {
  let fileHandle: fsPromises.FileHandle | undefined
  let fileSize: number
  let mediainfo: MediaInfo<typeof format> | undefined

  if (!file) {
    throw new TypeError('No file received!')
  }

  if (coverData && !['JSON', 'XML'].includes(format)) {
    throw new TypeError('For cover data you need to choose JSON or XML as output format!')
  }

  const readChunk: ReadChunkFunc = async (size, offset) => {
    if (fileHandle === undefined) {
      throw new Error('File unavailable')
    }
    const buffer = new Uint8Array(size)
    await fileHandle.read(buffer, 0, size, offset)
    return buffer
  }

  try {
    fileHandle = await fsPromises.open(file, 'r')
    const fileStat = await fileHandle.stat()
    fileSize = fileStat.size
    try {
      mediainfo = await mediaInfoFactory({ format, coverData, full })
    } catch (error: unknown) {
      throw unknownToError(error)
    }
    console.log(await mediainfo.analyzeData(() => fileSize, readChunk))
  } finally {
    if (fileHandle) {
      await fileHandle.close()
    }
    if (mediainfo) {
      mediainfo.close()
    }
  }
}

function parseArgs() {
  const yargsInstance = yargs(hideBin(process.argv))
  return yargsInstance
    .wrap(yargsInstance.terminalWidth())
    .option('format', {
      alias: 'f',
      default: 'text' as const,
      describe: 'Choose format',
      choices: FORMAT_CHOICES,
    })
    .option('cover-data', {
      default: false,
      describe: 'Output cover data as base64',
      type: 'boolean',
    })
    .option('full', {
      default: false,
      describe: 'Full information display (all internal tags)',
      type: 'boolean',
    })
    .command('$0 <file>', 'Show information about media file')
    .positional('file', { describe: 'File to analyze', type: 'string' })
    .help('h')
    .alias('h', 'help')
    .fail((message: string, error: Error, argv) => {
      if (message) {
        console.error(argv.help())
        console.error(message)
      }
      console.error(error.message)
      process.exit(1)
    })
    .parseSync()
}

try {
  await analyze(parseArgs())
} catch (error: unknown) {
  console.error(unknownToError(error).message)
}



================================================
FILE: src/error.ts
================================================
function isError(error: unknown): error is Error {
  return (
    error !== null &&
    typeof error === 'object' &&
    Object.prototype.hasOwnProperty.call(error, 'message')
  )
}

function unknownToError(error: unknown): Error {
  if (isError(error)) {
    return error
  }
  return new Error(typeof error === 'string' ? error : 'Unknown error')
}

export { unknownToError }



================================================
FILE: src/index.ts
================================================
export type {
  FormatType,
  default as MediaInfo,
  ReadChunkFunc,
  ResultMap,
  SizeArg,
} from './MediaInfo.js'
export type { MediaInfoFactoryOptions } from './mediaInfoFactory.js'
export { default, default as mediaInfoFactory } from './mediaInfoFactory.js'
export type {
  AudioTrack,
  BaseTrack,
  CreationInfo,
  Extra,
  GeneralTrack,
  ImageTrack,
  Media,
  MediaInfoResult,
  MenuTrack,
  OtherTrack,
  TextTrack,
  Track,
  VideoTrack,
} from './MediaInfoResult.js'
export { isTrackType } from './typeGuard.js'



================================================
FILE: src/MediaInfo.ts
================================================
import { unknownToError } from './error.js'
import { FLOAT_FIELDS, INT_FIELDS, type MediaInfoResult, type Track } from './MediaInfoResult.js'
import type { MediaInfoFactoryOptions } from './mediaInfoFactory.js'
import type { MediaInfoModule, MediaInfoWasmInterface } from './MediaInfoModule.js'

const MAX_UINT32_PLUS_ONE = 2 ** 32

/** Format of the result type */
type FormatType = 'object' | 'JSON' | 'XML' | 'HTML' | 'text'

type MediaInfoOptions<TFormat extends FormatType> = Required<
  Omit<MediaInfoFactoryOptions<TFormat>, 'locateFile'>
>

type SizeArg = (() => Promise<number> | number) | number

type ReadChunkFunc = (size: number, offset: number) => Promise<Uint8Array> | Uint8Array

interface ResultMap {
  object: MediaInfoResult
  JSON: string
  XML: string
  HTML: string
  text: string
}

const FORMAT_CHOICES = ['JSON', 'XML', 'HTML', 'text'] as const

const DEFAULT_OPTIONS = {
  coverData: false,
  chunkSize: 256 * 1024,
  format: 'object',
  full: false,
} as const

type ResultCallback<TFormat extends FormatType> = (
  result: ResultMap[TFormat] | null,
  err?: unknown
) => void

/**
 * Wrapper for the MediaInfoLib WASM module.
 *
 * This class should not be instantiated directly. Use the {@link mediaInfoFactory} function
 * to create instances of `MediaInfo`.
 *
 * @typeParam TFormat - The format type, defaults to `object`.
 */
class MediaInfo<TFormat extends FormatType = typeof DEFAULT_OPTIONS.format> {
  private readonly mediainfoModule: MediaInfoModule
  private mediainfoModuleInstance: MediaInfoWasmInterface
  private isAnalyzing = false

  /** @group General Use */
  readonly options: MediaInfoOptions<TFormat>

  /**
   * The constructor should not be called directly, instead use {@link mediaInfoFactory}.
   *
   * @hidden
   * @param mediainfoModule WASM module
   * @param options User options
   */
  constructor(mediainfoModule: MediaInfoModule, options: MediaInfoOptions<TFormat>) {
    this.mediainfoModule = mediainfoModule
    this.options = options
    this.mediainfoModuleInstance = this.instantiateModuleInstance()
  }

  /**
   * Convenience method for analyzing a buffer chunk by chunk.
   *
   * @param size Return total buffer size in bytes.
   * @param readChunk Read chunk of data and return an {@link Uint8Array}.
   * @group General Use
   */
  analyzeData(size: SizeArg, readChunk: ReadChunkFunc): Promise<ResultMap[TFormat]>

  /**
   * Convenience method for analyzing a buffer chunk by chunk.
   *
   * @param size Return total buffer size in bytes.
   * @param readChunk Read chunk of data and return an {@link Uint8Array}.
   * @param callback Function that is called once the processing is done
   * @group General Use
   */
  analyzeData(size: SizeArg, readChunk: ReadChunkFunc, callback: ResultCallback<TFormat>): void

  analyzeData(
    size: SizeArg,
    readChunk: ReadChunkFunc,
    callback?: ResultCallback<TFormat>
  ): Promise<ResultMap[TFormat] | null> | undefined {
    // Support promise signature
    if (callback === undefined) {
      return new Promise((resolve, reject) => {
        const resultCb: ResultCallback<TFormat> = (result, error) => {
          this.isAnalyzing = false
          if (error || !result) {
            reject(unknownToError(error))
          } else {
            resolve(result)
          }
        }
        this.analyzeData(size, readChunk, resultCb)
      })
    }

    if (this.isAnalyzing) {
      callback('', new Error('cannot start a new analysis while another is in progress'))
      return
    }
    this.reset()
    this.isAnalyzing = true

    const finalize = () => {
      try {
        this.openBufferFinalize()
        const result = this.inform()
        if (this.options.format === 'object') {
          callback(this.parseResultJson(result))
        } else {
          callback(result)
        }
      } finally {
        this.isAnalyzing = false
      }
    }

    let offset = 0
    const runReadDataLoop = (fileSize: number) => {
      const readNextChunk = (data: Uint8Array) => {
        if (continueBuffer(data)) {
          getChunk()
        } else {
          finalize()
        }
      }

      const getChunk = () => {
        let dataValue
        try {
          const safeSize = Math.min(this.options.chunkSize, fileSize - offset)
          dataValue = readChunk(safeSize, offset)
        } catch (error: unknown) {
          this.isAnalyzing = false
          callback('', unknownToError(error))
          return
        }

        if (dataValue instanceof Promise) {
          dataValue.then(readNextChunk).catch((error: unknown) => {
            this.isAnalyzing = false
            callback('', unknownToError(error))
          })
        } else {
          readNextChunk(dataValue)
        }
      }

      const continueBuffer = (data: Uint8Array): boolean => {
        if (data.length === 0 || this.openBufferContinue(data, data.length)) {
          return false
        }
        const seekTo: number = this.openBufferContinueGotoGet()
        if (seekTo === -1) {
          offset += data.length
        } else {
          offset = seekTo
          this.openBufferInit(fileSize, seekTo)
        }
        return true
      }

      this.openBufferInit(fileSize, offset)
      getChunk()
    }

    const fileSizeValue = typeof size === 'function' ? size() : size

    if (fileSizeValue instanceof Promise) {
      fileSizeValue.then(runReadDataLoop).catch((error: unknown) => {
        callback(null, unknownToError(error))
      })
    } else {
      runReadDataLoop(fileSizeValue)
    }
  }

  /**
   * Close the MediaInfoLib WASM instance.
   *
   * @group General Use
   */
  close(): void {
    if (typeof this.mediainfoModuleInstance.close === 'function') {
      this.mediainfoModuleInstance.close()
    }
  }

  /**
   * Reset the MediaInfoLib WASM instance to its initial state.
   *
   * This method ensures that the instance is ready for a new parse.
   * @group General Use
   */
  reset(): void {
    this.mediainfoModuleInstance.delete()
    this.mediainfoModuleInstance = this.instantiateModuleInstance()
  }

  /**
   * Receive result data from the WASM instance.
   *
   * (This is a low-level MediaInfoLib function.)
   *
   * @returns Result data (format can be configured in options)
   * @group Low-level
   */
  inform(): string {
    return this.mediainfoModuleInstance.inform()
  }

  /**
   * Send more data to the WASM instance.
   *
   * (This is a low-level MediaInfoLib function.)
   *
   * @param data Data buffer
   * @param size Buffer size
   * @returns Processing state: `0` (no bits set) = not finished, Bit `0` set = enough data read for providing information
   * @group Low-level
   */
  openBufferContinue(data: Uint8Array, size: number): boolean {
    // bit 3 set -> done
    return !!(this.mediainfoModuleInstance.open_buffer_continue(data, size) & 0x08)
  }

  /**
   * Retrieve seek position from WASM instance.
   * The MediaInfoLib function `Open_Buffer_GoTo` returns an integer with 64 bit precision.
   * It would be cut at 32 bit due to the JavaScript bindings. Here we transport the low and high
   * parts separately and put them together.
   *
   * (This is a low-level MediaInfoLib function.)
   *
   * @returns Seek position (where MediaInfoLib wants go in the data buffer)
   * @group Low-level
   */
  openBufferContinueGotoGet(): number {
    // JS bindings don't support 64 bit int
    // https://github.com/buzz/mediainfo.js/issues/11
    let seekTo = -1
    const seekToLow: number = this.mediainfoModuleInstance.open_buffer_continue_goto_get_lower()
    const seekToHigh: number = this.mediainfoModuleInstance.open_buffer_continue_goto_get_upper()
    if (seekToLow == -1 && seekToHigh == -1) {
      seekTo = -1
    } else if (seekToLow < 0) {
      seekTo = seekToLow + MAX_UINT32_PLUS_ONE + seekToHigh * MAX_UINT32_PLUS_ONE
    } else {
      seekTo = seekToLow + seekToHigh * MAX_UINT32_PLUS_ONE
    }
    return seekTo
  }

  /**
   * Inform MediaInfoLib that no more data is being read.
   *
   * (This is a low-level MediaInfoLib function.)
   *
   * @group Low-level
   */
  openBufferFinalize(): void {
    this.mediainfoModuleInstance.open_buffer_finalize()
  }

  /**
   * Prepare MediaInfoLib to process a data buffer.
   *
   * (This is a low-level MediaInfoLib function.)
   *
   * @param size Expected buffer size
   * @param offset Buffer offset
   * @group Low-level
   */
  openBufferInit(size: number, offset: number): void {
    this.mediainfoModuleInstance.open_buffer_init(size, offset)
  }

  /**
   * Parse result JSON. Convert integer/float fields.
   *
   * @param result Serialized JSON from MediaInfo
   * @returns Parsed JSON object
   */
  private parseResultJson(resultString: string): ResultMap[TFormat] {
    type Writable<T> = { -readonly [P in keyof T]: T[P] }

    const intFields = INT_FIELDS as readonly string[]
    const floatFields = FLOAT_FIELDS as readonly string[]

    // Parse JSON
    const result = JSON.parse(resultString) as MediaInfoResult

    if (result.media) {
      const newMedia = { ...result.media, track: [] as Writable<Track>[] }

      if (Array.isArray(result.media.track)) {
        for (const track of result.media.track) {
          let newTrack: Writable<Track> = { '@type': track['@type'] }
          for (const [key, val] of Object.entries(track) as [string, unknown][]) {
            if (key === '@type') {
              continue
            }
            if (typeof val === 'string' && intFields.includes(key)) {
              newTrack = { ...newTrack, [key]: Number.parseInt(val, 10) }
            } else if (typeof val === 'string' && floatFields.includes(key)) {
              newTrack = { ...newTrack, [key]: Number.parseFloat(val) }
            } else {
              newTrack = { ...newTrack, [key]: val }
            }
          }
          newMedia.track.push(newTrack)
        }
      }

      return { ...result, media: newMedia } as ResultMap[TFormat]
    }

    return result as ResultMap[TFormat]
  }

  /**
   * Instantiate a new WASM module instance.
   *
   * @returns MediaInfo module instance
   */
  private instantiateModuleInstance(): MediaInfoWasmInterface {
    return new this.mediainfoModule.MediaInfo(
      this.options.format === 'object' ? 'JSON' : this.options.format,
      this.options.coverData,
      this.options.full
    )
  }
}

export type { FormatType, ReadChunkFunc, ResultMap, SizeArg }
export { DEFAULT_OPTIONS, FORMAT_CHOICES }
export default MediaInfo



================================================
FILE: src/mediaInfoFactory.ts
================================================
import MediaInfo, { DEFAULT_OPTIONS, type FormatType } from './MediaInfo.js'
import mediaInfoModuleFactory, { type MediaInfoModule } from './MediaInfoModule.js'

interface MediaInfoFactoryOptions<TFormat extends FormatType> {
  /** Output cover data as base64 */
  coverData?: boolean

  /** Chunk size used by `analyzeData` (in bytes) */
  chunkSize?: number

  /** Result format (`object`, `JSON`, `XML`, `HTML` or `text`) */
  format?: TFormat

  /** Full information display (all internal tags) */
  full?: boolean

  /**
   * This method will be called before loading the WASM file. It should return the actual URL to
   * `MediaInfoModule.wasm`.
   *
   * @see https://emscripten.org/docs/api_reference/module.html#Module.locateFile
   */
  locateFile?: (path: string, prefix: string) => string
}

const noopPrint = () => {
  // No-op
}

type FactoryCallback<TFormat extends FormatType> = (mediainfo: MediaInfo<TFormat>) => void
type ErrorCallback = (error: unknown) => void

function defaultLocateFile(path: string, prefix: string) {
  try {
    const url = new URL(prefix)
    if (url.pathname === '/') {
      return `${prefix}mediainfo.js/dist/${path}`
    }
  } catch {
    // empty
  }
  return `${prefix}../${path}`
}

// TODO pass through more emscripten module options?

/**
 * Creates a {@link MediaInfo} instance with the specified options.
 *
 * @typeParam TFormat - The format type, defaults to `object`.
 * @param options - Configuration options for creating the {@link MediaInfo} instance.
 * @returns A promise that resolves to a {@link MediaInfo} instance when no callback is provided.
 */
function mediaInfoFactory<TFormat extends FormatType = typeof DEFAULT_OPTIONS.format>(
  options?: MediaInfoFactoryOptions<TFormat>
): Promise<MediaInfo<TFormat>>

/**
 * Creates a {@link MediaInfo} instance with the specified options and executes the callback.
 *
 * @typeParam TFormat - The format type, defaults to `object`.
 * @param options - Configuration options for creating the {@link MediaInfo} instance.
 * @param callback - Function to call with the {@link MediaInfo} instance.
 * @param errCallback - Optional function to call on error.
 */
function mediaInfoFactory<TFormat extends FormatType = typeof DEFAULT_OPTIONS.format>(
  options: MediaInfoFactoryOptions<TFormat>,
  callback: FactoryCallback<TFormat>,
  errCallback?: ErrorCallback
): void

function mediaInfoFactory<TFormat extends FormatType = typeof DEFAULT_OPTIONS.format>(
  options: MediaInfoFactoryOptions<TFormat> = {},
  callback?: FactoryCallback<TFormat>,
  errCallback?: ErrorCallback
): Promise<MediaInfo<TFormat>> | undefined {
  if (callback === undefined) {
    return new Promise((resolve, reject) => {
      mediaInfoFactory(options, resolve, reject)
    })
  }

  const { locateFile, ...mergedOptions } = {
    ...DEFAULT_OPTIONS,
    ...options,
    format: (options.format ?? DEFAULT_OPTIONS.format) as TFormat,
  }

  const mediaInfoModuleFactoryOpts: Partial<MediaInfoModule> = {
    // Silence all print in module
    print: noopPrint,
    printErr: noopPrint,

    locateFile: locateFile ?? defaultLocateFile,
    onAbort: (err: Error) => {
      if (errCallback) {
        errCallback(err)
      }
    },
  }

  // Fetch and load WASM module
  mediaInfoModuleFactory(mediaInfoModuleFactoryOpts)
    .then((wasmModule) => {
      callback(new MediaInfo<TFormat>(wasmModule, mergedOptions))
    })
    .catch((error: unknown) => {
      if (errCallback) {
        errCallback(error)
      }
    })
}

export type { MediaInfoFactoryOptions }
export default mediaInfoFactory



================================================
FILE: src/MediaInfoModule.cpp
================================================
#include <emscripten/bind.h>
#include <MediaInfo/MediaInfo.h>
#include <string>

class MediaInfoJs
{
  MediaInfoLib::MediaInfo mi;

public:
  MediaInfoJs(const MediaInfoLib::String &outputFormat, bool coverData, bool full)
  {
    mi.Option(__T("Output"), outputFormat);
    mi.Option(__T("File_IsSeekable"), __T("1"));
    if (coverData)
    {
      mi.Option(__T("Cover_Data"), __T("base64"));
    }
    if (full)
    {
      mi.Option(__T("Complete"), __T("1"));
    }
  }
  int open(const std::string &data, double fileSize)
  {
    return mi.Open((const ZenLib::int8u *)data.data(), data.size(), NULL, 0, (ZenLib::int64u)fileSize);
  }
  int open_buffer_init(double estimatedFileSize, double fileOffset)
  {
    return mi.Open_Buffer_Init((ZenLib::int64u)estimatedFileSize, (ZenLib::int64u)fileOffset);
  }
  int open_buffer_continue(const std::string &data, double size)
  {
    return mi.Open_Buffer_Continue((ZenLib::int8u *)data.data(), (ZenLib::int64u)size);
  }
  int open_buffer_finalize()
  {
    return mi.Open_Buffer_Finalize();
  }
  int open_buffer_continue_goto_get()
  {
    return open_buffer_continue_goto_get_lower();
  }
  // JS binding doesn't seem to support 64 bit int
  // see https://github.com/buzz/mediainfo.js/issues/11
  int open_buffer_continue_goto_get_lower()
  {
    return mi.Open_Buffer_Continue_GoTo_Get();
  }
  int open_buffer_continue_goto_get_upper()
  {
    return mi.Open_Buffer_Continue_GoTo_Get() >> 32;
  }
  MediaInfoLib::String inform()
  {
    return mi.Inform();
  }
  void close()
  {
    mi.Close();
  }
};

EMSCRIPTEN_BINDINGS(mediainfojs)
{
  emscripten::class_<MediaInfoJs>("MediaInfo")
      .smart_ptr<std::shared_ptr<MediaInfoJs>>("MediaInfo")
      .constructor<const MediaInfoLib::String &, bool, bool>()
      .function("open", &MediaInfoJs::open)
      .function("open_buffer_init", &MediaInfoJs::open_buffer_init)
      .function("open_buffer_continue", &MediaInfoJs::open_buffer_continue)
      .function("open_buffer_continue_goto_get", &MediaInfoJs::open_buffer_continue_goto_get)
      .function("open_buffer_continue_goto_get_lower", &MediaInfoJs::open_buffer_continue_goto_get_lower)
      .function("open_buffer_continue_goto_get_upper", &MediaInfoJs::open_buffer_continue_goto_get_upper)
      .function("open_buffer_finalize", &MediaInfoJs::open_buffer_finalize)
      .function("inform", &MediaInfoJs::inform)
      .function("close", &MediaInfoJs::close);
}



================================================
FILE: src/MediaInfoModule.d.ts
================================================
import type { FORMAT_CHOICES } from './MediaInfo.js'

type WasmConstructableFormatType = (typeof FORMAT_CHOICES)[number]

interface MediaInfoWasmInterface {
  delete(): void
  close(): void
  inform(): string
  open_buffer_continue(data: Uint8Array, size: number): number
  open_buffer_continue_goto_get_lower(): number
  open_buffer_continue_goto_get_upper(): number
  open_buffer_finalize(): number
  open_buffer_init(estimatedFileSize: number, fileOffset: number): number
}

type MediaInfoWasmConstructable = new (
  format: WasmConstructableFormatType,
  coverData: boolean,
  full: boolean
) => MediaInfoWasmInterface

interface MediaInfoModule extends EmscriptenModule {
  MediaInfo: MediaInfoWasmConstructable
}

declare const mediaInfoModuleFactory: EmscriptenModuleFactory<MediaInfoModule>

export type { MediaInfoModule, MediaInfoWasmConstructable, MediaInfoWasmInterface }
export default mediaInfoModuleFactory



================================================
FILE: src/typeGuard.ts
================================================
import type { Track } from './MediaInfoResult'

/**
 * Checks if a given object is of a specified track type.
 *
 * @template T - The type of track to check for.
 * @param thing - The object to check.
 * @param type - The track type to check against.
 * @returns A boolean indicating whether the object is of the specified track type.
 */
function isTrackType<T extends Track['@type']>(
  thing: unknown,
  type: T
): thing is Extract<Track, { '@type': T }> {
  return thing !== null && typeof thing === 'object' && (thing as Track)['@type'] === type
}

export { isTrackType }
