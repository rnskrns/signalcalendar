const pendingScripts = new Map();

export function loadScript(src) {
  if (pendingScripts.has(src)) return pendingScripts.get(src);

  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();

  const request = new Promise((resolve, reject) => {
    const script = existing || document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => {
      pendingScripts.delete(src);
      reject(new Error(`스크립트 로드 실패: ${src}`));
    }, { once: true });
    if (!existing) document.head.appendChild(script);
  });

  pendingScripts.set(src, request);
  return request;
}
