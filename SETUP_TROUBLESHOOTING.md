# 🚨 Critical Setup Issues - MUST FIX FIRST

## Issue 1: Firebase Identity Toolkit API Not Enabled

### **Error Message:**
\`\`\`
Identity Toolkit API has not been used in project 587565799238 before or it is disabled
\`\`\`

### **Solution:**
1. **Go to Google Cloud Console:** https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=587565799238
2. **Click "Enable" button**
3. **Wait 2-3 minutes** for the API to activate
4. **Try creating user again**

### **Why This Happens:**
- Firebase Authentication requires the Identity Toolkit API
- This API is not enabled by default in new projects
- Must be manually enabled in Google Cloud Console

---

## Issue 2: Google Sheets Permission Denied

### **Error Messages:**
- "No permission to edit spreadsheet"
- "No permission to edit Admin sheet"
- "The caller does not have permission"

### **Root Cause:**
Your service account doesn't have Editor permissions on the Google Spreadsheet.

### **Solution Steps:**

#### **Step 1: Find Your Service Account Email**
Look in your `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable for:
\`\`\`json
{
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
}
\`\`\`

#### **Step 2: Share Spreadsheet with Service Account**
1. **Open your Google Spreadsheet**
2. **Click "Share" button** (top right corner)
3. **Add the service account email** from Step 1
4. **Set permission to "Editor"** (NOT Viewer!)
5. **Click "Send"**
6. **Wait 1-2 minutes** for permissions to propagate

#### **Step 3: Verify Permissions**
- Service account should appear in "People with access"
- Permission should show "Editor"
- If it shows "Viewer", change it to "Editor"

---

## Issue 3: Environment Variables Check

### **Required Variables:**
\`\`\`env
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
SPREADSHEET_ID=your_google_sheet_id
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
\`\`\`

### **Verify Setup:**
1. **Check all environment variables are set**
2. **Verify SPREADSHEET_ID matches your Google Sheet**
3. **Confirm Firebase project ID is correct**

---

## Quick Fix Checklist

### ✅ **For Create User Error:**
- [ ] Enable Identity Toolkit API in Google Cloud Console
- [ ] Wait 2-3 minutes after enabling
- [ ] Verify Firebase project ID is correct

### ✅ **For Spreadsheet Permission Errors:**
- [ ] Find service account email in credentials JSON
- [ ] Share Google Spreadsheet with service account
- [ ] Set permission to "Editor" (not Viewer)
- [ ] Wait 1-2 minutes for permissions to activate

### ✅ **For All Issues:**
- [ ] Check browser console for detailed error messages
- [ ] Verify all environment variables are set
- [ ] Confirm spreadsheet ID matches your Google Sheet

---

## Testing After Fixes

### **Test Create User:**
1. Go to Admin Panel → Create New User tab
2. Enter test email and password
3. Should succeed without Identity Toolkit error

### **Test Add User Access:**
1. Go to Admin Panel → Add User Access tab
2. Enter valid 4-digit account number and email
3. Should succeed without permission error

### **Test Add Admin:**
1. Go to Admin Panel → Manage Admins tab
2. Enter admin email and name
3. Should succeed without permission error

---

## Common Mistakes

❌ **Setting service account as "Viewer"** instead of "Editor"
❌ **Forgetting to enable Identity Toolkit API**
❌ **Using wrong spreadsheet ID**
❌ **Not waiting for permissions to propagate**
❌ **Typos in service account email**

✅ **Correct Setup:**
- Service account has "Editor" permissions
- Identity Toolkit API is enabled
- All environment variables are correct
- Waited 2-3 minutes after changes

---

## Need Help?

If issues persist after following these steps:

1. **Check browser console** for detailed error messages
2. **Verify environment variables** are exactly correct
3. **Double-check service account email** has no typos
4. **Confirm spreadsheet is shared** with correct permissions
5. **Wait a few minutes** after making changes

The system will now provide detailed error messages with step-by-step solutions for each issue.
