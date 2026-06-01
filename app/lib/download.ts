export function baixarUrl(url: string, nomeArquivo: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function baixarBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  baixarUrl(url, nomeArquivo);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
