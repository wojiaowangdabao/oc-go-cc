let textNodes = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract-text') {
    textNodes = [];
    const texts = extractPageText(textNodes);
    sendResponse({ texts });
    return false;
  }

  if (request.action === 'show-status') {
    showStatus(request.text, request.isError);
  }

  if (request.action === 'hide-status') {
    const el = document.getElementById('__oc_status');
    if (el) el.remove();
  }

  if (request.action === 'apply-batch') {
    let count = 0;
    for (let j = 0; j < request.results.length; j++) {
      const idx = request.startIndex + j;
      const node = textNodes[idx];
      if (node && node.parentElement && document.contains(node)) {
        node.textContent = request.results[j];
        count++;
      }
    }
  }
});

function showStatus(msg, isError) {
  let el = document.getElementById('__oc_status');
  if (!el) {
    el = document.createElement('div');
    el.id = '__oc_status';
    el.style.cssText = 'position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;z-index:99999;font-size:14px;box-shadow:0 2px 10px rgba(0,0,0,0.1);';
    document.body.appendChild(el);
  }
  el.style.background = isError ? '#fff3cd' : '#cce5ff';
  el.style.color = isError ? '#856404' : '#004085';
  el.style.border = isError ? '1px solid #ffeeba' : '1px solid #b8daff';
  el.textContent = msg;
}

function extractPageText(nodeList) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
            parent.tagName === 'NOSCRIPT' || parent.tagName === 'CODE' ||
            parent.tagName === 'PRE') {
          return NodeFilter.FILTER_REJECT;
        }
        const text = node.textContent.trim();
        if (text.length < 5) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const texts = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (text.length > 0) {
      texts.push(text);
      nodeList.push(node);
    }
  }
  return texts;
}
