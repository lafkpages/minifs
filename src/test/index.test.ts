import { expect, test } from "bun:test";

import { Directory, File, MiniFS, Node, rootPath } from "..";

test("createDirectory + readDirectory                     ", () => {
  const fs = new MiniFS();
  const path = "myDir";

  // Since the directory does not exist,
  // it should return null.
  expect(fs.readDirectory(path)).toBeNull();

  // The directory should now exist.
  // If if does, it should return true.
  expect(fs.createDirectory(path)).toBeTrue();

  // Since the directory now exists,
  // it should return an empty array because
  // there are no files in the directory.
  expect(fs.readDirectory(path)).toEqual([]);
});

test("createDirectory + readDirectory (recursive)         ", () => {
  const fs = new MiniFS();
  const path = "myOtherDir/mySubDir";

  expect(fs.createDirectory(path)).toBeTrue();

  // Since the directory now exists,
  // it should return an empty array because
  // there are no files in the directory.
  expect(fs.readDirectory(path)).toEqual([]);
});

test("createDirectory + readDirectory + remove            ", () => {
  const fs = new MiniFS();
  const path = "myDir";

  expect(fs.createDirectory(path)).toBeTrue();

  // Since the directory now exists,
  // it should return an empty array because
  // there are no files in the directory.
  expect(fs.readDirectory(path)).toEqual([]);

  // Since the directory now exists,
  // removing it should be successful.
  expect(fs.remove(path)).toBeTrue();

  // Since the directory no longer exists,
  // it should return null.
  expect(fs.readDirectory(path)).toBeNull();
});

test("createDirectory + readDirectory + remove (recursive)", () => {
  const fs = new MiniFS();
  const path = "foo/bar";

  expect(fs.createDirectory(path)).toBeTrue();

  // Since the directory now exists,
  // it should return an empty array because
  // there are no files in the directory.
  expect(fs.readDirectory(path)).toEqual([]);
  expect(fs.readDirectory("foo")).toEqual(["bar"]);

  // Since the directory now exists,
  // removing it should be successful.
  expect(fs.remove(path)).toBeTrue();

  // Since the directory no longer exists,
  // it should return null.
  expect(fs.readDirectory(path)).toBeNull();

  // Since only the bar subdirectory was removed,
  // the foo directory should still exist.
  expect(fs.readDirectory("foo")).toEqual([]);
});

test("writeFile + readFile + readDirectory                ", () => {
  const fs = new MiniFS();
  const path = "myFile.txt";
  const content = "Hello, World!";

  // Since the file does not exist,
  // it should return null.
  expect(fs.readFile(path)).toBeNull();

  // The file should now exist.
  // If if does, it should return true.
  expect(fs.writeFile(path, content)).toBeTrue();

  // Since the file now exists,
  // it should return the file's content.
  expect(fs.readFile(path)).toBe(content);

  expect(fs.readDirectory(rootPath)).toEqual(["myFile.txt"]);
});

test("writeFile + readFile + readDirectory (recursive)    ", () => {
  const fs = new MiniFS();
  const path = "myParentDir/myFile.txt";
  const content = "Hello, World!";

  // Since the file does not exist,
  // it should return null.
  expect(fs.readFile(path)).toBeNull();

  // The file should now exist.
  // If if does, it should return true.
  expect(fs.writeFile(path, content)).toBeTrue();

  // Since the file now exists,
  // it should return the file's content.
  expect(fs.readFile(path)).toBe(content);

  // Since recursive is enabled,
  // the parent directory should exist.
  expect(fs.readDirectory(rootPath)).toEqual(["myParentDir"]);

  expect(fs.readDirectory(path)).toBeNull();
});

test("writeFile + walk (recursive)                        ", () => {
  const fs = new MiniFS();
  const path = "foo/bar/baz.txt";
  const content = "Hello, World!";

  expect(fs.writeFile(path, content)).toBeTrue();

  for (const [path, entry] of fs.walk()) {
    expect(path).toBeArray();
    expect(path).not.toBeEmpty();

    for (const pathSegment of path) {
      expect(pathSegment).toBeString();
      expect(pathSegment).not.toBeEmpty();
    }

    expect(entry).toBeInstanceOf(Node);

    if (path.at(-1) === "baz.txt") {
      expect(entry).toBeInstanceOf(File);
    } else {
      expect(entry).toBeInstanceOf(Directory);
    }
  }
});
