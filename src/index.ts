export enum NodeType {
  Node,
  File,
  Directory,
}

export class Node<TData = unknown> {
  name?: string;
  content?: unknown;

  /**
   * Unknown data associated with the node.
   */
  data?: TData;

  getType() {
    return NodeType.Node;
  }

  isFile(): this is File {
    return this.getType() === NodeType.File;
  }

  isDirectory(): this is Directory {
    return this.getType() === NodeType.Directory;
  }
}

export class File<TFileContent = unknown, TData = unknown> extends Node<TData> {
  name: string;
  content?: TFileContent;

  constructor(name: string, content?: TFileContent) {
    super();

    this.name = name;
    this.content = content;
  }

  getType() {
    return NodeType.File as const;
  }
}

export interface DirectoryContent<TFileContent = unknown, TData = unknown> {
  [fileName: string]: Entry<TFileContent, TData>;
}
export class Directory<
  TFileContent = unknown,
  TData = unknown,
> extends Node<TData> {
  name: string;
  content: DirectoryContent<TFileContent, TData>;

  constructor(name: string, content?: DirectoryContent<TFileContent, TData>) {
    super();

    this.name = name;
    this.content = content || {};
  }

  getType() {
    return NodeType.Directory as const;
  }
}

/**
 * A file system entry, which can be either a file or a directory.
 */
export type Entry<TFileContent = unknown, TData = unknown> =
  | File<TFileContent, TData>
  | Directory<TFileContent, TData>;

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

export interface WriteCallback<TFileContent, TData> {
  (file: File<TFileContent, TData>): void;
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

export class MiniFS<TFileContent = unknown, TData = unknown> {
  protected files = new Directory<TFileContent, TData>("");

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
          dir.content[pathSegment] = new Directory(pathSegment);
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

    let entry: Entry<TFileContent, TData> = this.files;
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
  ):
    | (T["returnEntry"] extends true
        ? Directory<TFileContent, TData>
        : string[])
    | null;
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
    | (T["returnEntry"] extends true ? File<TFileContent, TData> : TFileContent)
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

  private _writeFile(
    path: PathSegments,
    callback: WriteCallback<TFileContent, TData>,
    options: Required<WriteOptions>,
  ) {
    let dir = this.files;
    for (const [i, pathSegment] of path.entries()) {
      const isLastSegment = i == path.length - 1;

      if (!(pathSegment in dir.content)) {
        if (options.recursive) {
          if (isLastSegment) {
            if (pathSegment in dir.content) {
              const entry = dir.content[pathSegment];
              if (entry.isFile()) {
                callback(entry);
              } else if (this.preferErrors) {
                throw new Error( // TODO: path join function?
                  `[MiniFS._writeFile] "${path.join("/")}" is a directory.`,
                );
              } else {
                return false;
              }
            } else {
              dir.content[pathSegment] = new File<TFileContent, TData>(
                pathSegment,
              );
              callback(dir.content[pathSegment] as File<TFileContent, TData>);
            }
            return true;
          }
          dir.content[pathSegment] = new Directory(pathSegment);
        } else if (this.preferErrors) {
          throw new Error(
            `[MiniFS._writeFile] Directory "${pathSegment}" does not exist.`,
          );
        } else {
          return false;
        }
      }

      const nextEntry = dir.content[pathSegment];

      if (nextEntry instanceof File) {
        if (this.preferErrors) {
          throw new Error(`[MiniFS._writeFile] "${pathSegment}" is a file.`);
        }
        return false;
      }

      dir = nextEntry;
    }

    return true;
  }

  /**
   * Writes to a file's content at the given path.
   * @param content Optional. The content of the file.
   * @returns A boolean indicating whether the file was written successfully.
   */
  writeFile(path: Path, content?: TFileContent, options?: WriteOptions) {
    return this._writeFile(
      pathAsSegments(path),
      (file) => {
        file.content = content;
      },
      {
        ...defaultWriteOptions,
        ...options,
      },
    );
  }

  /**
   * Runs a callback on a file at the given path.
   * If the file does not exist, it will be created.
   *
   * This could be used, for example, to modify a file's `data` property.
   * Or it could be used to modify both its data and its content in one go.
   * If you only want to modify the content, use {@link MiniFS.writeFile}.
   *
   * @param callback The callback to run on the file.
   * @returns A boolean indicating whether the file was written successfully.
   */
  writeFileWithCallback(
    path: Path,
    callback: WriteCallback<TFileContent, TData>,
    options?: WriteOptions,
  ) {
    return this._writeFile(pathAsSegments(path), callback, {
      ...defaultWriteOptions,
      ...options,
    });
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
