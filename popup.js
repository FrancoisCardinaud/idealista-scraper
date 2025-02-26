// Combined function that includes both message sending and data extraction
async function extractDataAndSendMessage() {
  const data = {
    url: window.location.href,
    price: null,
    address: null,
    phone: null,
    surface: null,
    rooms: null,
    messageSent: false
  };

  const isIdealista = window.location.hostname.includes('idealista.it');
  
  if (!isIdealista) {
    console.log('Not an Idealista.it page');
    return data;
  }

  console.log('Extracting from Idealista.it');
  
  try {
    // Extract price - try multiple selectors
    const priceSelectors = [
      'span[data-price]',
      'span.price-features__price',
      'span.txt-bold[data-price]',
      'span.h3-simulated',
      '.info-data-price',
      '.price',
      'span.h1'
    ];

    for (const selector of priceSelectors) {
      const priceElement = document.querySelector(selector);
      if (priceElement) {
        // Try data attribute first
        let priceText = priceElement.getAttribute('data-price');
        if (!priceText) {
          // Fallback to text content
          priceText = priceElement.textContent.trim();
        }
        if (priceText) {
          // Remove currency and other symbols, keeping only digits and dots
          const cleanPrice = priceText.replace(/[^\d.]/g, '');
          // Now convert the string with dots (e.g., '1.088.000') to a number
          const match = cleanPrice.match(/(\d+(?:\.\d+)*)/);
          if (match) {
            data.price = parseInt(match[1].replace(/\./g, ''));
            console.log('Found price:', data.price, 'from selector:', selector);
            break;
          }
        }
      }
    }

    // Extract surface and rooms
    const details = document.querySelectorAll('.details-property li');
    details.forEach(li => {
      const text = li.textContent.toLowerCase().trim();
      
      // Surface area
      if (text.includes('m²')) {
        const surfaceMatch = text.match(/(\d+)\s*m²/i);
        if (surfaceMatch) {
          data.surface = parseInt(surfaceMatch[1]);
          console.log('Found surface area:', data.surface);
        }
      }
      
      // Rooms
      if (text.includes('local')) {
        const roomsMatch = text.match(/(\d+)\s*local[ei]/i);
        if (roomsMatch) {
          data.rooms = parseInt(roomsMatch[1]);
          console.log('Found rooms:', data.rooms);
        }
      }
    });

    // Extract address from the Posizione section
    const addressParts = [];
    const headerMap = document.querySelector('#headerMap');
    
    if (headerMap) {
      // Get all header-map-list items
      const mapListItems = headerMap.querySelectorAll('.header-map-list');
      if (mapListItems.length > 0) {
        mapListItems.forEach((item, index) => {
          const text = item.textContent.trim();
          if (text) {
            addressParts.push(text);
          }
        });
        
        if (addressParts.length > 0) {
          // Combine all parts with commas
          data.address = addressParts.join(', ');
          console.log('Found address from Posizione section:', data.address);
        }
      }
    }

    // If no address found in Posizione section (fallback)
    if (!data.address) {
      console.log('No address found in Posizione section, trying fallback methods...');
      const breadcrumbElements = document.querySelectorAll('.breadcrumb-navigation a, .breadcrumb a');
      if (breadcrumbElements.length > 0) {
        // Get the last 2-3 breadcrumb items (area, district, city)
        const locationParts = Array.from(breadcrumbElements)
          .slice(-3) // Take last 3 elements
          .map(a => a.textContent.trim())
          .filter(text => text && !text.includes('Home') && !text.includes('Annunci')); // Filter out common non-location items
        
        if (locationParts.length > 0) {
          data.address = locationParts.join(', ');
          console.log('Found address from breadcrumbs (fallback):', data.address);
        }
      }
    }

    // Extract phone number
    async function getPhoneNumber(maxAttempts = 5) {
      console.log('Starting phone number extraction...');
      
      // Find and click the phone button
      const phoneButtonSelectors = [
        'a.see-phones-btn.icon-phone',
        '.see-phones-btn.icon-phone',
        '.hidden-contact-phones_link',
        'a[role="button"].see-phones-btn'
      ];

      let phoneButton = null;
      for (const selector of phoneButtonSelectors) {
        phoneButton = document.querySelector(selector);
        if (phoneButton) {
          console.log('Found phone button:', phoneButton.outerHTML);
          phoneButton.click();
          console.log('Phone button clicked');
          break;
        }
      }

      if (!phoneButton) {
        console.log('No phone button found');
        return null;
      }

      // Wait for phone number to appear and extract it
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`Attempt ${attempt}/${maxAttempts} to find phone number`);
        
        // Wait for the number to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Try multiple selectors for the phone number
        const phoneSelectors = [
          '.hidden-contact-phones_link', // The original button container that now contains the number
          '.see-phones-btn',
          '.contact-phones',
          '.phone-number-revealed',
          '.hidden-contact-phones_text',
          'span[itemprop="telephone"]',
          'a[href^="tel:"]',
          '.phone-number-formatted'
        ];

        for (const selector of phoneSelectors) {
          const phoneElement = document.querySelector(selector);
          if (phoneElement) {
            // Get phone number from either text content or href
            let phoneText = phoneElement.textContent.trim() || phoneElement.getAttribute('href') || '';
            
            // Clean and validate the number
            phoneText = phoneText
              .replace(/[^\d+]/g, '') // Remove all non-digit/non-plus characters
              .replace(/^00/, '+') // Convert international prefix
              .replace(/^0/, '+39'); // Add country code if missing

            if (phoneText.length >= 9) { // Italian numbers are typically 9-13 digits
              console.log('Found cleaned phone number:', phoneText);
              return phoneText;
            }
          }
        }
      }

      console.log('Failed to find phone number after all attempts');
      return null;
    }

    data.phone = await getPhoneNumber();
    if (data.phone) {
      console.log('Successfully extracted phone number:', data.phone);
    } else {
      console.log('No phone number found');
    }

    // Try to send message
    try {
      data.messageSent = await (async function sendMessage() {
        console.log('Processing Idealista.it message...');
        
        // Helper function to simulate button clicks
        async function simulateButtonClick(button) {
          console.log('Simulating click on button:', button);
          
          // First click attempt with full event simulation
          button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          button.click();
          console.log('First click completed');
          
          // Wait a bit
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Second click attempt
          button.click();
          console.log('Second click completed');
          
          // Final wait to ensure everything is processed
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const textarea = document.querySelector('textarea[name="contact-message"]');
        if (!textarea) {
          console.error('Message textarea not found on Idealista.it');
          return false;
        }
        
        console.log('Found textarea:', textarea);
        textarea.value = `Buongiorno,

Offriamo servizi digitali per valorizzare la sua vendita indipendente, con visite virtuali 3D e fotografie professionali che accelerano la vendita e migliorano l'esperienza degli acquirenti.
        
Prisma3D non è un'agenzia immobiliare, ma le forniamo strumenti avanzati: visite virtuali, foto di alta qualità, planimetrie, misurazioni precise e analisi dettagliate, il tutto a tariffe competitive.
        
Perché una visita virtuale 3D?
→ Permette agli acquirenti di esplorare l'immobile da casa, attirando più clienti seri e riducendo i tempi di vendita.
        
I vantaggi:
→ Studi dimostrano che le visite 3D rendono le vendite più rapide, le negoziazioni più efficaci e migliorano il valore finale della transazione.
        
Scopra di più su www.prisma3d.it. Restiamo a disposizione!
        
Cordiali saluti,
Il team Prisma3D`;
        console.log('Message set to:', textarea.value);
        
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        const sendButton = document.querySelector('button.submit-button.btn.action.txt-bold.txt-big.desktop.button-chat.icon-chat');
        console.log('Found chat button:', sendButton?.outerHTML);
        
        if (!sendButton) {
          console.log('Trying mobile button...');
          const mobileButton = document.querySelector('button.submit-button.btn.action.txt-bold.txt-big.no-desktop.button-chat.icon-chat');
          console.log('Found mobile button:', mobileButton?.outerHTML);
          
          if (!mobileButton) {
            console.error('No chat button found on Idealista.it');
            return false;
          }
          await simulateButtonClick(mobileButton);
        } else {
          await simulateButtonClick(sendButton);
        }
        
        console.log('Message sent on Idealista.it');
        return true;
      })();
      console.log('Message sending status:', data.messageSent ? 'Success' : 'Failed');
    } catch (error) {
      console.error('Error in message sending:', error);
      data.messageSent = false;
    }

  } catch (error) {
    console.error('Error extracting data:', error);
  }

  console.log('=== Final Data Summary ===');
  console.log('URL:', data.url);
  console.log('Price:', data.price);
  console.log('Address:', data.address);
  console.log('Phone:', data.phone);
  console.log('Surface:', data.surface);
  console.log('Rooms:', data.rooms);
  console.log('Message Sent:', data.messageSent);
  console.log('========================');

  return data;
}

// Function to detect if we're on a search results page
function isSearchResultsPage() {
  const isIdealista = window.location.hostname.includes('idealista.it');
  
  console.log('Checking if search results page...');
  console.log('URL:', window.location.href);
  
  if (isIdealista) {
    // For Idealista, check if we have listing items and we're not on a single listing
    const hasListings = document.querySelector('.items-container') !== null;
    const isSingleListing = document.querySelector('.txt-bold') !== null && 
                           document.querySelector('.icon-phone') !== null;
    const isSearchPage = hasListings && !isSingleListing;
    console.log('Idealista search page detection:', { hasListings, isSingleListing, isSearchPage });
    return isSearchPage;
  }
  return false;
}

// Function to get listing links from search results page
function getListingLinks() {
  console.log('Getting listing links...');
  const isIdealista = window.location.hostname.includes('idealista.it');
  let links = [];

  if (isIdealista) {
    // Try multiple selectors for Idealista listings
    const selectors = [
      '.items-container .item-link',
      'article.item a',
      '.item-info-container a',
      '[data-adid] a',
      'a[href*="/immobile/"]'
    ];

    // Try each selector until we find links
    for (const selector of selectors) {
      const linkElements = document.querySelectorAll(selector);
      if (linkElements.length > 0) {
        console.log(`Found links using selector: ${selector}`);
        links = Array.from(linkElements)
          .filter(a => {
            // Filter out promoted listings and ensure it's a property link
            return !a.querySelector('.listing-alert') && 
                   a.href && 
                   a.href.includes('/immobile/');
          })
          .map(a => {
            const href = a.href;
            // Ensure we have the full URL
            return href.startsWith('http') ? href : 'https://www.idealista.it' + href;
          });
        break;
      }
    }
  }

  console.log(`Found ${links.length} listing links`);
  return links;
}

// Function to process a single listing in a new tab
async function processListing(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (newTab) => {
      chrome.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          try {
            // Wait for page stabilization
            await new Promise(r => setTimeout(r, 2000));
            
            // Extract data and send message in a single script execution
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: () => {
                return new Promise((resolve) => {
                  const data = {
                    url: window.location.href,
                    price: null,
                    address: null,
                    phone: null,
                    messageSent: false
                  };
                  
                  // Extract price
                  const priceElement = document.querySelector('.info-data-price');
                  if (priceElement) {
                    const priceText = priceElement.textContent.trim();
                    const cleanPrice = priceText.replace(/[^\d.]/g, '');
                    data.price = parseInt(cleanPrice.replace(/\./g, ''));
                  }

                  // Extract address
                  const addressElement = document.querySelector('.location');
                  if (addressElement) {
                    data.address = addressElement.textContent.trim();
                  }

                  // Click phone button and wait for number
                  const phoneButton = document.querySelector('a.icon-phone');
                  if (phoneButton) {
                    phoneButton.click();
                    setTimeout(() => {
                      const phoneElement = document.querySelector('.phone-number');
                      if (phoneElement) {
                        data.phone = phoneElement.textContent.trim();
                      }
                      
                      // Now try to send message
                      const textarea = document.querySelector('textarea[name="message"]');
                      const sendButton = document.querySelector('button[data-test="send-message"]');
                      
                      if (textarea && sendButton) {
                        textarea.value = 'Salve, sono interessato a questo immobile. È ancora disponibile?';
                        textarea.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        setTimeout(() => {
                          sendButton.click();
                          data.messageSent = true;
                          resolve(data);
                        }, 500);
                      } else {
                        resolve(data);
                      }
                    }, 1000);
                  } else {
                    resolve(data);
                  }
                });
              }
            });
            
            // Close the tab and return the result
            await chrome.tabs.remove(newTab.id);
            resolve(result?.result || null);
          } catch (error) {
            console.error(`Error processing listing ${url}:`, error);
            await chrome.tabs.remove(newTab.id);
            resolve(null);
          }
        }
      });
    });
  });
}

// Function to process search results in batches
async function processSearchResults(tab) {
  const results = [];
  
  // Detach popup first
  await detachPopup();
  
  // Get all listing links
  const [linksResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getListingLinks
  });
  
  if (!linksResult || !linksResult.result || linksResult.result.length === 0) {
    console.error('No listing links found');
    return results;
  }

  const links = linksResult.result;
  console.log(`Found ${links.length} listings to process`);
  
  // Process listings one at a time since we need tab focus
  for (let i = 0; i < links.length; i++) {
    console.log(`Processing listing ${i + 1}/${links.length}`);
    showStatus(`Processing listing ${i + 1}/${links.length}...`);
    
    try {
      // Process single listing
      const result = await processListing(links[i]);
      
      // Add successful result to the array
      if (result) {
        results.push(result);
        showStatus(`Processed ${results.length}/${links.length} listings...`);
      }
      
      // Add a small delay between listings
      if (i + 1 < links.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }
  
  return results;
}

// Function to extract data and send message without focus
async function extractDataAndSendMessageNoFocus() {
  return new Promise((resolve) => {
    const data = {
      url: window.location.href,
      price: null,
      address: null,
      phone: null,
      messageSent: false
    };
    
    // Extract price
    const priceElement = document.querySelector('.info-data-price');
    if (priceElement) {
      const priceText = priceElement.textContent.trim();
      const cleanPrice = priceText.replace(/[^\d.]/g, '');
      data.price = parseInt(cleanPrice.replace(/\./g, ''));
    }

    // Extract address
    const addressElement = document.querySelector('.location');
    if (addressElement) {
      data.address = addressElement.textContent.trim();
    }

    // Click phone button and wait for number
    const phoneButton = document.querySelector('a.icon-phone');
    if (phoneButton) {
      phoneButton.click();
      setTimeout(() => {
        const phoneElement = document.querySelector('.phone-number');
        if (phoneElement) {
          data.phone = phoneElement.textContent.trim();
        }
        
        // Now try to send message
        const textarea = document.querySelector('textarea[name="message"]');
        const sendButton = document.querySelector('button[data-test="send-message"]');
        
        if (textarea && sendButton) {
          textarea.value = 'Salve, sono interessato a questo immobile. È ancora disponibile?';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          
          setTimeout(() => {
            sendButton.click();
            data.messageSent = true;
            resolve(data);
          }, 500);
        } else {
          resolve(data);
        }
      }, 1000);
    } else {
      resolve(data);
    }
  });
}

// Function to process listing without focus
async function processListingNoFocus(url) {
  return new Promise((resolve) => {
    chrome.tabs.create({ url, active: false }, (newTab) => {
      chrome.tabs.onUpdated.addListener(async function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          try {
            // Wait for page stabilization
            await new Promise(r => setTimeout(r, 5000));
            
            // Extract data and send message
            const [result] = await chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: extractDataAndSendMessage  // Use the original function
            });
            
            console.log('Extraction result:', result);
            
            // Close the tab and return the result
            await chrome.tabs.remove(newTab.id);
            
            // Make sure we resolve with the actual data
            if (result && result.result) {
              console.log('Resolving with data:', result.result);
              resolve(result.result);
            } else {
              console.log('No data found in result');
              resolve(null);
            }
          } catch (error) {
            console.error(`Error processing listing ${url}:`, error);
            await chrome.tabs.remove(newTab.id);
            resolve(null);
          }
        }
      });
    });
  });
}

// Function to process search results in batches without focus
async function processSearchResultsInBatches(tab) {
  const results = [];
  
  // Get all listing links
  const [linksResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getListingLinks
  });
  
  if (!linksResult || !linksResult.result || linksResult.result.length === 0) {
    console.error('No listing links found');
    return results;
  }

  const links = linksResult.result;
  console.log(`Found ${links.length} listings to process`);
  
  // Process listings in batches of 3
  const batchSize = 3;
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(links.length/batchSize)}`);
    showStatus(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(links.length/batchSize)}...`);
    
    try {
      // Process all listings in the batch simultaneously
      const batchResults = await Promise.all(
        batch.map(url => processListingNoFocus(url))
      );
      
      console.log('Batch results:', batchResults);
      
      // Add successful results to the array
      batchResults.forEach(result => {
        if (result) {
          console.log('Adding result:', result);
          results.push(result);
          showStatus(`Processed ${results.length}/${links.length} listings...`);
        }
      });
      
      // Add a small delay between batches
      if (i + batchSize < links.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }
  
  console.log('Final results:', results);
  return results;
}

// Initialize UI
document.addEventListener('DOMContentLoaded', async function() {
  const buttons = {
    scrapeData: document.getElementById('scrapeData'),
    copyMessage: document.getElementById('copyMessage'),
    exportTXT: document.getElementById('exportTXT'),
    exportJSON: document.getElementById('exportJSON'),
    exportCSV: document.getElementById('exportCSV')
  };
  
  const elements = {
    status: document.getElementById('status'),
    messageTemplate: document.getElementById('messageTemplate'),
    copySuccess: document.getElementById('copySuccess'),
    dataDisplay: document.getElementById('dataDisplay')
  };

  let scrapedData = null;
  
  // Check for existing scraping state
  const { scrapingState } = await chrome.storage.local.get('scrapingState');
  if (scrapingState) {
    updateUIFromState(scrapingState);
  }

  // Copy message functionality
  buttons.copyMessage.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(elements.messageTemplate.value);
      elements.copySuccess.style.display = 'inline';
      setTimeout(() => {
        elements.copySuccess.style.display = 'none';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  });

  // Scrape data functionality
  buttons.scrapeData.addEventListener('click', async () => {
    try {
      showStatus('Starting scrape...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on a search results page
      const [isSearchPage] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: isSearchResultsPage
      });

      if (isSearchPage.result) {
        // Process search results page with batch processing
        showStatus('Processing search results in batches...');
        const results = await processSearchResultsInBatches(tab);
        
        if (results.length === 0) {
          showStatus('No listings found to process', true);
          return;
        }
        
        scrapedData = results;
        showStatus(`Processed ${results.length} listings successfully!`);
        
        // Enable export buttons
        Object.keys(buttons).forEach(key => {
          if (key !== 'scrapeData') buttons[key].disabled = false;
        });
        
        // Save results automatically
        saveResults(results);
      } else {
        // Single listing processing
        showStatus('Processing single listing...');
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractDataAndSendMessage
        });

        console.log('Received result from extraction:', result);
        if (result && result.result) {
          scrapedData = result.result;
          console.log('Updating display with scraped data:', scrapedData);
          updateDataDisplay(scrapedData);
          showStatus('Data scraped successfully!');
          
          // Enable export buttons
          Object.keys(buttons).forEach(key => {
            if (key !== 'scrapeData') buttons[key].disabled = false;
          });
        } else {
          showStatus('No data was extracted', true);
        }
      }
    } catch (error) {
      console.error('Scraping error:', error);
      showStatus('Error scraping data: ' + error.message, true);
    }
  });

  // Export button handlers
  buttons.exportTXT.addEventListener('click', () => {
    if (!scrapedData) return;
    const content = Array.isArray(scrapedData) ? 
      scrapedData.map(data => formatDataForTXT(data)).join('\n\n---\n\n') :
      formatDataForTXT(scrapedData);
    downloadFile('property-data.txt', content);
    showStatus('Exported as TXT file');
  });

  buttons.exportJSON.addEventListener('click', () => {
    if (!scrapedData) return;
    downloadFile('property-data.json', JSON.stringify(scrapedData, null, 2));
    showStatus('Exported as JSON file');
  });

  buttons.exportCSV.addEventListener('click', () => {
    if (!scrapedData) return;
    const content = Array.isArray(scrapedData) ?
      formatMultipleDataForCSV(scrapedData) :
      formatDataForCSV(scrapedData);
    downloadFile('property-data.csv', content, 'text/csv');
    showStatus('Exported as CSV file');
  });
});

// Helper functions for UI updates and data formatting
function updateDataDisplay(data) {
  if (!data) {
    console.error('No data to display');
    return;
  }
  
  console.log('Updating display with data:', data);
  const dataDisplay = document.getElementById('dataDisplay');
  
  // Update individual value elements
  const elements = {
    url: document.getElementById('urlValue'),
    price: document.getElementById('priceValue'),
    address: document.getElementById('addressValue'),
    phone: document.getElementById('phoneValue'),
    surface: document.getElementById('surfaceValue'),
    rooms: document.getElementById('roomsValue')
  };

  // Update each element with formatted data
  if (elements.url) elements.url.textContent = data.url || 'N/A';
  if (elements.price) elements.price.textContent = data.price ? `€${data.price}` : 'N/A';
  if (elements.address) elements.address.textContent = data.address || 'N/A';
  if (elements.phone) elements.phone.textContent = data.phone || 'N/A';
  if (elements.surface) elements.surface.textContent = data.surface ? `${data.surface} m²` : 'N/A';
  if (elements.rooms) elements.rooms.textContent = data.rooms || 'N/A';

  // Make the display visible
  dataDisplay.classList.add('visible');
}

function showStatus(message, isError = false) {
  console.log(`Status update: ${message} (${isError ? 'error' : 'success'})`);
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = isError ? 'error' : 'success';
}

function formatDataForTXT(data) {
  return `URL: ${data.url}
Price: €${data.price}
Address: ${data.address}
Phone: ${data.phone}
Surface Area: ${data.surface} m²
Rooms: ${data.rooms}
Message Sent: ${data.messageSent ? 'Yes' : 'No'}`;
}

function formatDataForCSV(data) {
  const headers = ['URL', 'Price (EUR)', 'Address', 'Phone', 'Surface Area (m²)', 'Rooms', 'Message Sent'];
  const values = [
    data.url,
    data.price,
    data.address,
    data.phone,
    data.surface,
    data.rooms,
    data.messageSent ? 'Yes' : 'No'
  ].map(value => `"${(value || '').toString().replace(/"/g, '""')}"`);

  return `${headers.join(',')}\n${values.join(',')}`;
}

function formatMultipleDataForCSV(dataArray) {
  const headers = ['URL', 'Price (EUR)', 'Address', 'Phone', 'Surface Area (m²)', 'Rooms', 'Message Sent'];
  const rows = dataArray.map(data => [
    data.url,
    data.price,
    data.address,
    data.phone,
    data.surface,
    data.rooms,
    data.messageSent ? 'Yes' : 'No'
  ].map(value => `"${(value || '').toString().replace(/"/g, '""')}"`));

  return [headers.join(',')].concat(rows.map(row => row.join(','))).join('\n');
}

function downloadFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Function to save results to file
function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `property-data-${timestamp}.txt`;
  
  // Create header row
  let content = 'URL\tPrice (EUR)\tAddress\tPhone\tSurface Area (m²)\tRooms\tMessage Sent\n';
  
  // Add data rows
  results.forEach(data => {
    content += `${data.url}\t`;
    content += `${data.price || ''}\t`;
    content += `${data.address || ''}\t`;
    content += `${data.phone || ''}\t`;
    content += `${data.surface || ''}\t`;
    content += `${data.rooms || ''}\t`;
    content += `${data.messageSent ? 'Yes' : 'No'}\n`;
  });
  
  downloadFile(filename, content);
}