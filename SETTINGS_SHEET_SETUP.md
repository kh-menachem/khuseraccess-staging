# Settings Sheet Setup

## Overview
The system now stores persistent settings in a Google Sheet tab called "Settings".

## Setup Instructions

1. **Create Settings Tab**
   - Open your Google Spreadsheet
   - Create a new tab called "Settings" (exact name, case-sensitive)

2. **Add Column Headers**
   - Column A: Key
   - Column B: Value

3. **Settings Storage Format**
   The Settings tab stores configuration as key-value pairs:

   | Key | Value | Description |
   |-----|-------|-------------|
   | system_message_enabled | TRUE/FALSE | Whether system message banner is active |
   | system_message_text | (text) | The message to display |
   | system_message_show_dashboard | TRUE/FALSE | Show on customer dashboard |
   | system_message_show_login | TRUE/FALSE | Show on login page |
   | transaction_limit_enabled | TRUE/FALSE | Whether transaction date limit is active |
   | transaction_limit_type | years/date | Type of limit (years back or specific year) |
   | transaction_limit_value | (number) | Value (e.g., "1" for 1 year, "2024" for year) |

4. **Initial Setup**
   - You don't need to manually add these rows
   - The system will automatically create them when you first save settings from the admin panel

## Benefits
- Settings persist across serverless function restarts
- Settings are backed up with your Google Sheets data
- Easy to view and manually edit if needed
- No additional database infrastructure required
