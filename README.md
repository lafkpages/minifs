# MiniFS

An in-memory filesystem-like data structure.

## Installation

You can install MiniFS using npm, or your preferred package manager.

```bash
npm i @luisafk/minifs
```

## Usage

```ts
import { MiniFS } from "@luisafk/minifs";

const fs = new MiniFS();

fs.writeFile("foo/bar.txt", "Hello, World"); // true

fs.readDirectory("foo"); // ["bar.txt"]
fs.readFile("foo/bar.txt"); // "Hello, World"
```

## Running tests

```bash
bun test
```
