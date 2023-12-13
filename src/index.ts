export class Node {
  content?: unknown;

  /**
   * Unknown data associated with the node.
   */
  data: Record<string, unknown> = {};
}

export class File extends Node {
  name: string;

  content?: string | Blob;

  constructor(name: string, content?: string | Blob) {
    super();

    this.name = name;
    this.content = content;
  }
}

export type DirectoryContent = {
  [fileName: string]: Entry;
};
export class Directory extends Node {
  content: DirectoryContent;

  constructor(content?: DirectoryContent) {
    super();

    this.content = content || {};
  }
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

/**
 * A file path represented as an array of path segments.
 *
 * @example
 * ["path", "to", "file.txt"]
 */
export type PathSegments = string[];

/**
 * A constant representing the root path.
 * Can be passed to methods such as {@link MiniFS.readDirectory}.
 */
export const rootPath = [] satisfies PathSegments;

/**
 * Converts a {@link Path} to a {@link PathSegments} array.
 */
function pathAsSegments(path: Path) {
  return typeof path == "string" ? path.split("/") : path;
}

/**
 * Options for {@link MiniFS}.
 */
export interface MiniFSOptions {
  /**
   * If true, certain functions will throw errors instead of returning null.
   */
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

// Do NOT type these as ReadOptions or WriteOptions,
// as otherwise when destructuring the options, the
// values will show as possibly undefined as the
// option types have optional properties.
const defaultReadOptions = {
  returnEntry: false,
};

const defaultWriteOptions = {
  recursive: true,
};

export class MiniFS {
  protected files = new Directory();

  // Options
  protected preferErrors: boolean;

  constructor(options?: MiniFSOptions) {
    this.preferErrors = options?.preferErrors ?? false;
  }

  *walk(
    dir = this.files,
    path: PathSegments = [],
  ): Generator<[PathSegments, Entry]> {
    for (const [name, entry] of Object.entries(dir.content)) {
      const entryPath = [...path, name];

      yield [entryPath, entry];

      if (entry instanceof Directory) {
        yield* this.walk(entry, entryPath);
      }
    }
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
      if (!(pathSegment in dir.content)) {
        if (recursive) {
          dir.content[pathSegment] = new Directory();
        } else if (this.preferErrors) {
          throw new Error(
            `[MiniFS.createDirectory] Directory "${pathSegment}" does not exist.`,
          );
        } else {
          return false;
        }
      }

      const nextEntry = dir.content[pathSegment];

      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.createDirectory] "${pathSegment}" is a file.`,
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
    for (const pathSegment of path) {
      if (entry instanceof File) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.readEntry] Intermediate path segment "${path}" is a file.`,
          );
        }
        return null;
      }

      if (!(pathSegment in entry.content)) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.readEntry] Intermediate path segment "${pathSegment}" does not exist.`,
          );
        }
        return null;
      }

      entry = entry.content[pathSegment];
    }

    return entry;
  }

  readDirectory<T extends ReadOptions>(
    path: Path,
    options?: T,
  ): (T["returnEntry"] extends true ? Directory : string[]) | null;
  readDirectory(path: Path, options?: ReadOptions) {
    const entry = this.readEntry(path);

    const { returnEntry } = {
      ...defaultReadOptions,
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
      return Object.keys(entry.content);
    }

    if (this.preferErrors) {
      throw new Error(`[MiniFS.readDirectory] "${path}" does not exist.`);
    }
    return null;
  }

  readFile<T extends ReadOptions>(
    path: Path,
    options?: T,
  ):
    | (T["returnEntry"] extends true ? File : NonNullable<File["content"]>)
    | null;
  readFile(path: Path, options?: ReadOptions) {
    const entry = this.readEntry(path);

    const { returnEntry } = {
      ...defaultReadOptions,
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
      ...defaultWriteOptions,
      ...options,
    };

    let dir = this.files;
    for (const [i, pathSegment] of path.entries()) {
      const isLastSegment = i == path.length - 1;

      if (!(pathSegment in dir.content)) {
        if (recursive) {
          if (isLastSegment) {
            dir.content[pathSegment] = new File(pathSegment, content);
            return true;
          }
          dir.content[pathSegment] = new Directory();
        } else if (this.preferErrors) {
          throw new Error(
            `[MiniFS.writeFile] Directory "${pathSegment}" does not exist.`,
          );
        } else {
          return false;
        }
      }

      const nextEntry = dir.content[pathSegment];

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

      if (!(pathSegment in dir.content)) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.removeDirectory] Directory "${pathSegment}" does not exist.`,
          );
        }
        return false;
      }

      const nextEntry = dir.content[pathSegment];
      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(
            `[MiniFS.removeDirectory] "${pathSegment}" is a file.`,
          );
        }
        return false;
      }

      if (isLastSegment) {
        delete dir.content[pathSegment];
        return true;
      }

      dir = nextEntry;
    }

    return true;
  }
}
