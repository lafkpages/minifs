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

## Development

First, clone the repository and install the dependencies.

```bash
git clone https://github.com/lafkpages/minifs.git
cd minifs
bun install
```

Then, configure Git hooks.

```bash
git config core.hooksPath .githooks
```

### Running tests

Tests are automatically run before every commit. You can also run them manually:

```bash
bun test
```
