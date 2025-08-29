// content.js

// Helper function to get YouTube video ID from URL
function getYouTubeID() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

// Helper function to pause the video reliably
function pauseYouTubeVideo() {
    // Try HTML5 <video>
    const ytVideo = document.querySelector('video');
    if (ytVideo && !ytVideo.paused) {
        ytVideo.pause();
        return true;
    }
    // Try YouTube's player API as fallback
    if (window.yt && window.yt.player && window.yt.player.getPlayerByElement) {
        try {
            const player = window.yt.player.getPlayerByElement('movie_player');
            if (player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
                return true;
            }
        } catch (e) {}
    }
    return false;
}

// Prevent showing the banner multiple times
function bannerAlreadyShown() {
    return !!document.getElementById('adfree-banner');
}

// Inject banner HTML and CSS
function injectBanner() {
    if (bannerAlreadyShown()) return;

    // Banner HTML
    const banner = document.createElement('div');
    banner.id = 'adfree-banner';
    banner.innerHTML = `
        <span>🎬 Watch this video without ads? (You’ll lose comments/likes)</span>
        <button id="adfree-watch-btn">Watch without ads</button>
        <button id="adfree-stay-btn">Stay here</button>
        <button id="adfree-dontshow-btn">Don’t show again</button>
    `;

    // Banner CSS (inject only once)
    if (!document.getElementById('adfree-banner-style')) {
        const style = document.createElement('style');
        style.id = 'adfree-banner-style';
        style.textContent = `
        #adfree-banner {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #222;
          color: #fff;
          padding: 14px 24px;
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.2);
          z-index: 9999;
          font-family: Arial, sans-serif;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
        }
        #adfree-banner button {
          background: #ff5252;
          color: #fff;
          border: none;
          border-radius: 4px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 14px;
        }
        #adfree-banner button#adfree-stay-btn {
          background: #444;
        }
        #adfree-banner button#adfree-dontshow-btn {
          background: #888;
        }
        `;
        document.head.appendChild(style);
    }

    // Attach banner
    document.body.appendChild(banner);

    // Button actions
    document.getElementById('adfree-watch-btn').onclick = () => {
        const vid = getYouTubeID();
        if (vid) {
            // Try to pause the video immediately
            let paused = pauseYouTubeVideo();
            // If not paused, try again after a short delay
            if (!paused) setTimeout(pauseYouTubeVideo, 300);

            // Open the ad-free version
            const adFreeUrl = `https://www.yout-ube.com/watch?v=${vid}`;
            window.open(adFreeUrl, '_blank');
        } else {
            alert('Could not find video ID.');
        }
    };

    document.getElementById('adfree-stay-btn').onclick = () => {
        banner.remove();
    };

    document.getElementById('adfree-dontshow-btn').onclick = () => {
        const vid = getYouTubeID();
        if (vid) {
            // Get the current list, add this video, and save
            chrome.storage.sync.get({ skippedVideos: [] }, (data) => {
                const updated = data.skippedVideos;
                if (!updated.includes(vid)) {
                    updated.push(vid);
                    chrome.storage.sync.set({ skippedVideos: updated }, () => {
                        banner.remove();
                    });
                } else {
                    banner.remove();
                }
            });
        } else {
            banner.remove();
        }
    };
}

// Main SPA-safe logic to decide whether to show the banner or redirect
function handleYouTubeVideoPage() {
    if (window.location.hostname === 'www.youtube.com' && window.location.pathname === '/watch') {
        const vid = getYouTubeID();
        chrome.storage.sync.get({ skippedVideos: [], autoRedirect: false }, (data) => {
            if (!vid || data.skippedVideos.includes(vid)) return;
            if (bannerAlreadyShown()) return;
            if (data.autoRedirect) {
                const adFreeUrl = `https://www.yout-ube.com/watch?v=${vid}`;
                window.open(adFreeUrl, '_blank');
            } else {
                injectBanner();
            }
        });
    } else {
        // Remove banner if navigating away from a video page
        const banner = document.getElementById('adfree-banner');
        if (banner) banner.remove();
    }
}

// SPA navigation detection using MutationObserver
let lastUrl = location.href;
const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(handleYouTubeVideoPage, 500); // Wait for SPA nav
    }
});
observer.observe(document, { subtree: true, childList: true });

// --- Robust Initial Launcher ---
function robustInitialLaunch(retries = 15) {
    // Only try if we're on YouTube watch page and not already handled
    if (
        window.location.hostname === 'www.youtube.com' &&
        window.location.pathname === '/watch' &&
        !document.getElementById('adfree-banner')
    ) {
        handleYouTubeVideoPage();
        // If still not handled and retries remain, try again after 400ms
        if (
            !document.getElementById('adfree-banner') &&
            retries > 0
        ) {
            setTimeout(() => robustInitialLaunch(retries - 1), 400);
        }
    }
}

// Run robust launch after DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    robustInitialLaunch();
});
// Also run as a fallback after window load
window.addEventListener('load', () => {
    robustInitialLaunch();
});
// And as a final fallback, run once immediately
robustInitialLaunch();
