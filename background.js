// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startScraping') {
    handleScraping(message.tab);
    sendResponse({ success: true });
  }
  return true;
});

// Store the current scraping state
let scrapingState = {
  isRunning: false,
  totalListings: 0,
  processedListings: 0,
  results: []
};

// Function to update popup with current state
async function updatePopup() {
  const views = chrome.extension.getViews({ type: 'popup' });
  if (views.length > 0) {
    views[0].postMessage({
      type: 'updateState',
      state: scrapingState
    }, '*');
  }
  // Also store in chrome.storage for popup reopens
  await chrome.storage.local.set({ scrapingState });
}

// Main scraping handler
async function handleScraping(tab) {
  scrapingState = {
    isRunning: true,
    totalListings: 0,
    processedListings: 0,
    results: []
  };
  await updatePopup();

  try {
    // Get listing links
    const [linksResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const links = [];
        document.querySelectorAll('article.item a.item-link').forEach(link => {
          if (link.href) links.push(link.href);
        });
        return links;
      }
    });

    const links = linksResult.result;
    scrapingState.totalListings = links.length;
    await updatePopup();

    // Process each listing
    for (let i = 0; i < links.length; i++) {
      const url = links[i];
      
      // Create and process tab
      const newTab = await chrome.tabs.create({ url, active: true });
      await new Promise(r => setTimeout(r, 2000)); // Wait for load

      // Extract data
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: () => {
          // Your existing data extraction code here
          const data = {
            url: window.location.href,
            price: null,
            address: null,
            phone: null
          };
          
          // Extract price
          const priceElement = document.querySelector('.info-data-price');
          if (priceElement) {
            const priceText = priceElement.textContent.trim();
            const cleanPrice = priceText.replace(/[^\\d.]/g, '');
            data.price = parseInt(cleanPrice.replace(/\\./g, ''));
          }

          // Extract address
          const addressElement = document.querySelector('.location');
          if (addressElement) {
            data.address = addressElement.textContent.trim();
          }

          // Click phone button and get number
          const phoneButton = document.querySelector('a.icon-phone');
          if (phoneButton) {
            phoneButton.click();
            // Wait for number to appear
            setTimeout(() => {
              const phoneElement = document.querySelector('.phone-number');
              if (phoneElement) {
                data.phone = phoneElement.textContent.trim();
              }
            }, 1000);
          }

          return data;
        }
      });

      if (result?.result) {
        scrapingState.results.push(result.result);
      }
      
      scrapingState.processedListings++;
      await updatePopup();

      // Close the tab
      await chrome.tabs.remove(newTab.id);
      await new Promise(r => setTimeout(r, 1000)); // Wait between listings
    }
  } catch (error) {
    console.error('Scraping error:', error);
  }

  scrapingState.isRunning = false;
  await updatePopup();
}
