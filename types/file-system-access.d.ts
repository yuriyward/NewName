declare global {
  interface FileSystemFileHandle {
    /**
     * Experimental native move operation for File System Access handles.
     * Not yet included in TypeScript's DOM lib declarations.
     *
     * https://wicg.github.io/file-system-access/#api-filesystemfilehandle-move
     */
    move?(newName: string): Promise<void>;
  }

  interface FileSystemDirectoryHandle {
    move?(newName: string): Promise<void>;
    queryPermission?(descriptor?: {
      mode?: 'read' | 'readwrite';
    }): Promise<PermissionState>;
    requestPermission?(descriptor?: {
      mode?: 'read' | 'readwrite';
    }): Promise<PermissionState>;
  }
}

export {};
