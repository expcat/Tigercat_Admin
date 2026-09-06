export function isDocumentFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}

export async function toggleDocumentFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  await document.documentElement.requestFullscreen();
}
