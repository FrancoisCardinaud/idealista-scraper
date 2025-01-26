# Real Estate Data Scraper Chrome Extension

This Chrome extension allows you to scrape property information from real estate listings and export the data in various formats.

## Features

- Scrape property data including:
  - URL
  - Price (in EUR)
  - Address
  - Contact name
  - Phone number
- Export data in multiple formats:
  - TXT
  - JSON
  - CSV
  - Google Sheets (requires additional setup)

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory

## Usage

1. Navigate to a property listing page
2. Click the extension icon
3. Click "Scrape Property Data"
4. Choose your preferred export format

## Important Notes

- The content scraping selectors in `content.js` need to be updated to match the specific website's HTML structure
- Google Sheets export requires additional setup with the Google Sheets API
- Make sure to comply with the website's terms of service and robots.txt