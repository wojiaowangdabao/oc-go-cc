// 右键菜单翻译 - 通过 oc-go-cc 代理翻译网页为中文

const PROXY_URL = 'http://127.0.0.1:3456/v1/messages';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-page',
    title: '翻译页面为中文',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'extract-text' }, async (response) => {
    if (chrome.runtime.lastError || !response || !response.texts || response.texts.length === 0) {
      chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: '未能提取到页面文本', isError: true });
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: '翻译中...' });

    const texts = response.texts;
    const total = texts.length;
    const chunkSize = Math.max(1, Math.ceil(total / 10));

    for (let i = 0; i < total; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const pct = Math.round((i / total) * 100);
      chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: `翻译中... (${pct}%)` });

      try {
        const resp = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'unused' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            stream: false,
            messages: [{
              role: 'user',
              content: `Translate the following into Chinese. Keep the original style and tone. Natural and fluent Chinese. Don't add anything not in the original. Separate each paragraph with "|||".\n\n${chunk.join('\n|||\n')}`
            }]
          })
        });

        if (!resp.ok) {
          chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: `翻译失败: ${resp.status}`, isError: true });
          return;
        }

        const data = await resp.json();
        const translated = (data.content?.[0]?.text || '').replace(/```/g, '').trim();
        const parts = translated.split('|||').map(s => s.trim()).filter(s => s.length > 0);

        chrome.tabs.sendMessage(tab.id, { action: 'apply-batch', results: parts, startIndex: i });
      } catch (err) {
        chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: '无法连接到代理', isError: true });
        return;
      }
    }

    chrome.tabs.sendMessage(tab.id, { action: 'show-status', text: '翻译完成' });
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { action: 'hide-status' });
    }, 3000);
  });
});
