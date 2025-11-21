# Daily Error Summary Cron Job Setup

This document explains how to configure the daily error summary email that sends to `kh.menachem@gmail.com`.

## Overview

The system automatically sends a daily error report at 8:00 AM UTC (3:00 AM EST / 4:00 AM EDT) with all ERROR-level logs from the past 24 hours.

## Configuration

### 1. Environment Variables Required

Add these to your Vercel project if not already present:

\`\`\`
CRON_SECRET=your-secure-random-string
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
GOOGLE_APPLICATION_CREDENTIALS_JSON=your-service-account-json
SPREADSHEET_ID=your-spreadsheet-id
\`\`\`

### 2. Vercel Cron Jobs

The cron job is configured in `vercel.json`:

\`\`\`json
"crons": [
  {
    "path": "/api/cron/daily-error-summary",
    "schedule": "0 8 * * *"
  }
]
\`\`\`

**Schedule Format:** `0 8 * * *` means:
- Minute: 0 (at the top of the hour)
- Hour: 8 (8:00 AM UTC)
- Day of Month: * (every day)
- Month: * (every month)
- Day of Week: * (every day of the week)

### 3. Change Schedule (Optional)

To change when the email is sent, modify the `schedule` field:

Examples:
- `0 12 * * *` - 12:00 PM UTC (7:00 AM EST / 8:00 AM EDT)
- `0 0 * * *` - Midnight UTC (7:00 PM EST / 8:00 PM EDT)
- `0 6 * * 1` - 6:00 AM UTC every Monday
- `0 */6 * * *` - Every 6 hours

### 4. Security

The cron endpoint is protected by the `CRON_SECRET` environment variable. Vercel automatically includes this in the `Authorization` header when calling the cron job.

### 5. Manual Testing

To manually trigger the error summary (for testing):

\`\`\`bash
curl -X GET https://your-domain.vercel.app/api/cron/daily-error-summary \
  -H "Authorization: Bearer your-cron-secret"
\`\`\`

## Email Content

The email includes:
- Subject: 🚨🚨6301926 ERROR LOGS
- Total error count
- Errors grouped by event type
- First 5 errors of each type with details
- Timestamp, user, request ID, message, and metadata for each error

## Logs Sheet Structure

The system reads from the `Logs` sheet with columns:
- **Timestamp** (Column A)
- **Level** (Column B) - INFO, WARN, ERROR, DEBUG
- **Event** (Column C)
- **Message** (Column D)
- **Metadata** (Column E)
- **User** (Column F)
- **RequestID** (Column G)

## Troubleshooting

### No Email Received

1. Check Vercel deployment logs for cron execution
2. Verify `SMTP_USER` and `SMTP_PASS` are correct
3. Ensure Gmail App Password is valid (not regular password)
4. Check spam/junk folder

### Empty Summary

If no errors occurred in the last 24 hours, no email is sent. The cron job logs will show "No errors to report".

### Wrong Time

Remember the schedule is in UTC. Convert to your timezone:
- EST = UTC - 5 hours
- EDT = UTC - 4 hours

## Monitoring

You can monitor cron job execution in:
1. Vercel Dashboard → Your Project → Logs
2. Filter by `/api/cron/daily-error-summary`
3. Check for success/failure status codes
