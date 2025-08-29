// Load autoRedirect setting
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get({ autoRedirect: false }, (data) => {
    document.getElementById('autoRedirectSwitch').checked = data.autoRedirect;
  });
});
// Save autoRedirect setting
document.getElementById('autoRedirectSwitch').addEventListener('change', (e) => {
  chrome.storage.sync.set({ autoRedirect: e.target.checked });
});
// Clear "Don't show again" list
document.getElementById('clearListBtn').addEventListener('click', () => {
  chrome.storage.sync.set({ skippedVideos: [] }, () => {
    document.getElementById('clearSuccessMsg').textContent = 'List cleared!';
    setTimeout(() => {
      document.getElementById('clearSuccessMsg').textContent = '';
    }, 1700);
  });
});
