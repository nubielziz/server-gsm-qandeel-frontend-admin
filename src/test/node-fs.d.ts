// The one Node call the tests make: reading a source file of the app as text. The app is typed for the browser only (the "types" of
// tsconfig.json), so the tests name the little of Node they use here, and Node's own types stay out of every other file.
declare module 'node:fs' {
  /** Reads a file as text; a relative path starts at the folder the tests run in, which is the project's. */
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
