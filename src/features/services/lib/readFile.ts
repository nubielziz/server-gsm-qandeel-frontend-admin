// Reads an uploaded text file for the import dialog. `File.text()` where the browser has it, a FileReader otherwise.

/** The text of a file the staff member picked. Rejects when the file cannot be read. */
export function readTextFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
    reader.readAsText(file);
  });
}
