export function downloadTextFile(fileName: string, content: string | Uint8Array, type: string) {
  const blob = new Blob([toBlobPart(content)], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toBlobPart(content: string | Uint8Array): BlobPart {
  if (typeof content === 'string') {
    return content;
  }

  const buffer = new ArrayBuffer(content.byteLength);
  new Uint8Array(buffer).set(content);

  return buffer;
}
