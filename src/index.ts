export class File {
  name: string;

  content?: string | Blob;

  constructor(name: string, content?: string | Blob) {
    this.name = name;
    this.content = content;
  }
}

export interface Directory {
  [fileName: string]: Entry;
}

/**
 * A file system entry, which can be either a file or a directory.
 */
export type Entry = File | Directory;

/**
 * A file path.
 *
 * Can be a string or an array of strings, where each string is a path segment.
 *
 * @example
 * "/path/to/file.txt"
 *
 * @example
 * ["path", "to", "file.txt"]
 */
export type Path = string | PathSegments;
export type PathSegments = string[];

/**
 * A constant representing the root path.
 * Can be passed to methods such as {@link MiniFS.readDirectory}.
 */
export const rootPath = [];

/**
 * Converts a {@link Path} to a {@link PathSegments} array.
 */
function pathAsSegments(path: Path) {
  return typeof path == "string" ? path.split("/") : path;
}

export interface MiniFSOptions {
  preferErrors?: boolean;
}

export interface ReadOptions {
  /**
   * If true, returns the entry instead of its content.
   *
   * @see Entry
   */
  returnEntry?: boolean;
}

export interface WriteOptions {
  /**
   * If true, creates all parent directories if they don't exist.
   * @default true
   */
  recursive?: boolean;
}

export class MiniFS {
  protected files: Directory = {};

  // Options
  protected preferErrors: boolean;

  constructor(options?: MiniFSOptions) {
    this.preferErrors = options?.preferErrors ?? false;
  }

  /**
   * Creates a directory at the given path.
   * @param recursive If true, creates all parent directories if they don't exist.
   * @returns A boolean indicating whether the directory was created.
   */
  createDirectory(path: Path, options?: WriteOptions) {
    path = pathAsSegments(path);

    const { recursive } = {
      recursive: true,
      ...options,
    };

    let dir = this.files;
    for (const pathSegment of path) {
      if (!(pathSegment in dir)) {
        if (recursive) {
          dir[pathSegment] = {};
        } else if (this.preferErrors) {
          throw new Error(
            `[MiniFS.createDirectory] Directory "${pathSegment}" does not exist.`
          );
        } else {
          return false;
        }
      }

      const nextEntry = dir[pathSegment];

      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.createDirectory] "${pathSegment}" is a file.`
          );
        }
        return false;
      }

      dir = nextEntry;
    }

    return true;
  }

  protected readEntry(path: Path) {
    path = pathAsSegments(path);

    let entry: Entry = this.files;
    for (const [i, pathSegment] of path.entries()) {
      if (!(pathSegment in entry)) {
        return null;
      }

      const isLastSegment = i == path.length - 1;

      if (entry instanceof File) {
        if (this.preferErrors) {
          throw new Error(`[MiniFS.readEntry] "${pathSegment}" is a file.`);
        }
        return null;
      }

      const nextEntry: Entry | undefined = entry[pathSegment];

      if (!isLastSegment && nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(`[MiniFS.readEntry] "${pathSegment}" is a file.`);
        }
        return null;
      }

      entry = nextEntry;
    }

    return entry;
  }

  readDirectory(path: Path, options?: ReadOptions) {
    const entry = this.readEntry(path);

    const { returnEntry } = {
      returnEntry: false,
      ...options,
    };

    if (entry instanceof File) {
      if (this.preferErrors) {
        throw new Error(`[MiniFS.readDirectory] "${path}" is a file.`);
      }
      return null;
    }

    if (entry) {
      if (returnEntry) {
        return entry;
      }
      return Object.keys(entry);
    }

    if (this.preferErrors) {
      throw new Error(`[MiniFS.readDirectory] "${path}" does not exist.`);
    }
    return null;
  }

  readFile(path: Path, options?: ReadOptions) {
    const entry = this.readEntry(path);

    const { returnEntry } = {
      returnEntry: false,
      ...options,
    };

    if (entry instanceof File) {
      if (entry.content == undefined) {
        if (this.preferErrors) {
          throw new Error(`[MiniFS.readFile] "${path}" has no content.`);
        }
        return null;
      }

      if (returnEntry) {
        return entry;
      }
      return entry.content;
    }

    if (!entry) {
      if (this.preferErrors) {
        throw new Error(`[MiniFS.readFile] "${path}" does not exist.`);
      }
      return null;
    }

    if (this.preferErrors) {
      throw new Error(`[MiniFS.readFile] "${path}" is a directory.`);
    }
    return null;
  }

  /**
   * Writes a file at the given path.
   * @param content Optional. The content of the file.
   * @returns A boolean indicating whether the file was written successfully.
   */
  writeFile(path: Path, content?: string | Blob, options?: WriteOptions) {
    path = pathAsSegments(path);

    const { recursive } = {
      recursive: true,
      ...options,
    };

    let dir = this.files;
    for (const [i, pathSegment] of path.entries()) {
      const isLastSegment = i == path.length - 1;

      if (!(pathSegment in dir)) {
        if (recursive) {
          if (isLastSegment) {
            dir[pathSegment] = new File(pathSegment, content);
            return true;
          }
          dir[pathSegment] = {};
        } else if (this.preferErrors) {
          throw new Error(
            `[MiniFS.writeFile] Directory "${pathSegment}" does not exist.`
          );
        } else {
          return false;
        }
      }

      const nextEntry = dir[pathSegment];

      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(`[MiniFS.writeFile] "${pathSegment}" is a file.`);
        }
        return false;
      }

      dir = nextEntry;
    }

    return true;
  }

  remove(path: Path) {
    path = pathAsSegments(path);

    let dir = this.files;
    for (const [i, pathSegment] of path.entries()) {
      const isLastSegment = i == path.length - 1;

      if (!(pathSegment in dir)) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.removeDirectory] Directory "${pathSegment}" does not exist.`
          );
        }
        return false;
      }

      const nextEntry = dir[pathSegment];
      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.removeDirectory] "${pathSegment}" is a file.`
          );
        }
        return false;
      }

      if (isLastSegment) {
        delete dir[pathSegment];
        return true;
      }

      dir = nextEntry;
    }

    return true;
  }
}
