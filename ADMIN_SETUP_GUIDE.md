# Admin Setup Guide

## 🚨 **IMPORTANT: Google Spreadsheet Permissions**

### **Step 1: Share Spreadsheet with Service Account**

1. **Get your service account email** from your Firebase credentials:
   - Look in `GOOGLE_APPLICATION_CREDENTIALS_JSON` for `"client_email"`
   - It looks like: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`

2. **Share your Google Spreadsheet:**
   - Open your Google Spreadsheet
   - Click "Share" button (top right)
   - Add the service account email
   - **Set permission to "Editor"** (not Viewer!)
   - Click "Send"

3. **Verify permissions:**
   - The service account email should appear in the "People with access" list
   - Permission should show "Editor"

### **Common Permission Errors:**
- ❌ `"The caller does not have permission"` = Service account not shared with spreadsheet
- ❌ `"Insufficient permissions"` = Service account has "Viewer" instead of "Editor"
- ❌ `"Access denied"` = Wrong spreadsheet ID or service account email

---

## Admin Authentication via Google Sheets

### Setup Admin Sheet
1. **Create "Admin" sheet** in your Google Spreadsheet
2. **Add columns:**
   - Column A: `Email` (admin email addresses)
   - Column B: `Name` (admin full names)
3. **Add initial admin:**
   - Row 1: Headers (`Email`, `Name`)
   - Row 2: Your admin email and name

### Admin Management Features
- ✅ **Add new admins** from admin panel
- ✅ **Remove admins** (except yourself)
- ✅ **View all admins** in table format
- ✅ **Automatic sheet creation** if Admin sheet doesn't exist
- ✅ **Prevent self-removal** for safety
- ✅ **Prevent removing last admin**

## How to Setup New Users

### Method 1: Add User Access to Existing Account

1. **Admin logs in** at `/admin/login`
2. **Go to "Add User Access" tab**
3. **Enter:**
   - 4-digit account number (from Google Sheets "Unique Number" column)
   - User's email address
4. **Click "Add Access"**
5. **Result:** User can now login with their email to access that account

### Method 2: Create New Firebase User

1. **Admin logs in** at `/admin/login`
2. **Go to "Create New User" tab**
3. **Enter:**
   - User's email address
   - Select email language (Hebrew/English)
   - Password for the user
   - Confirm password
4. **Click "Create User"**
5. **Result:** 
   - New Firebase authentication account created
   - **Firebase sends password reset email automatically** in selected language
   - User receives email to set their own password
   - User can login after setting password

### Method 3: Manage Admins

1. **Admin logs in** at `/admin/login`
2. **Go to "Manage Admins" tab**
3. **Add Admin:**
   - Enter admin email and full name
   - Click "Add Admin"
   - Admin is added to Google Sheets Admin tab
4. **Remove Admin:**
   - View current admins in table
   - Click "Remove" next to admin (except yourself)
   - Admin is removed from Google Sheets

## Firebase Email Integration

### Password Reset Emails
- **Language Support:** Hebrew (`he`) and English (`en`)
- **Automatic:** Firebase sends emails automatically
- **No SendGrid needed:** Uses Firebase's built-in email service

### How It Works
1. **Forgot Password:** User selects language → Firebase sends reset email in that language
2. **New User Creation:** Admin selects email language → Firebase sends reset email in that language
3. **User Experience:** User receives professional Firebase email with reset link

## Admin Access Setup

### Google Sheets Admin Sheet (Recommended)
1. **Create "Admin" sheet** in your Google Spreadsheet
2. **Add columns:** `Email`, `Name`
3. **Add admin users** to this sheet
4. **Manage from admin panel** - add/remove admins dynamically

### Admin Sheet Structure
\`\`\`
| Email                    | Name           |
|--------------------------|----------------|
| admin@example.com        | John Admin     |
| manager@example.com      | Jane Manager   |
\`\`\`

## User Login Flow

### Regular Users (`/login`)
1. User enters email and password
2. If account exists in Google Sheets → Dashboard
3. If account not found → **Large orange message:** 
   - **Hebrew:** "צור קשר עם מנהל המערכת כדי לסיים את הגדרת החשבון שלך"
   - **English:** "Contact the system administrator to finish setting up your account"

### Admin Users (`/admin/login`)
1. Admin enters email and password
2. **System checks Google Sheets Admin tab**
3. If email found in Admin sheet → Admin Panel
4. If not found → Access denied

## URLs

- **User Login:** `/login`
- **Admin Login:** `/admin/login` (red theme, shield icon)
- **Admin Panel:** `/admin` (3 tabs: Add User Access, Create New User, Manage Admins)
- **User Dashboard:** `/dashboard`
- **Forgot Password:** `/forgot-password`

## Required Environment Variables

\`\`\`env
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
SPREADSHEET_ID=your_google_sheet_id
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
ADMIN_SETUP_KEY=your_admin_setup_key (optional fallback)
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
\`\`\`

## 🔧 **Troubleshooting Permission Issues**

### **Error: "The caller does not have permission"**

**Solution:**
1. Get service account email from `GOOGLE_APPLICATION_CREDENTIALS_JSON`
2. Open your Google Spreadsheet
3. Click "Share" → Add service account email → Set to "Editor"
4. Click "Send"

### **Error: "Insufficient permissions"**

**Solution:**
1. Check the service account has "Editor" permissions (not "Viewer")
2. Remove and re-add with "Editor" permissions

### **Error: "Spreadsheet not found"**

**Solution:**
1. Verify `SPREADSHEET_ID` in environment variables
2. Check spreadsheet URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Ensure spreadsheet is shared with service account

### **Error: "Admin sheet not found"**

**Solution:**
1. Create "Admin" sheet in your spreadsheet
2. Add headers: `Email`, `Name`
3. Add your admin email in row 2

### **How to Find Service Account Email:**

1. **From Firebase Console:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Look for `client_email` in the JSON

2. **From Environment Variable:**
   - Look in `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Find `"client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"`

## Admin Management Process

### Step 1: Initial Setup
\`\`\`
Share spreadsheet with service account → Create Admin sheet → Add initial admin → Admin can login
\`\`\`

### Step 2: Add More Admins
\`\`\`
Admin Panel → Manage Admins → Add Admin → New admin added to sheet
\`\`\`

### Step 3: Remove Admins
\`\`\`
Admin Panel → Manage Admins → View table → Remove admin → Admin removed from sheet
\`\`\`

## Security Features

✅ **Sheet-based authentication** - Admins stored in Google Sheets  
✅ **Self-removal prevention** - Cannot remove yourself  
✅ **Last admin protection** - Cannot remove the last admin  
✅ **Admin-only access** - Only admins can manage other admins  
✅ **Real-time updates** - Changes reflect immediately  
✅ **Automatic sheet creation** - Creates Admin sheet if missing  
✅ **Permission validation** - Checks spreadsheet access before operations

## API Endpoints

### Admin Verification
- `POST /api/admin/verify` - Check if user is admin

### Admin Management
- `POST /api/admin/add-admin` - Add new admin to sheet
- `POST /api/admin/list-admins` - Get all admins from sheet
- `POST /api/admin/remove-admin` - Remove admin from sheet

### User Management
- `POST /api/admin/add-user-access` - Add user access to account
- `POST /api/admin/create-user` - Create new Firebase user

## Troubleshooting

### Admin Not Found
1. Check Admin sheet exists in Google Spreadsheet
2. Verify email is exactly as entered in sheet
3. Check column headers are "Email" and "Name"
4. Ensure no extra spaces in email addresses

### Cannot Add Admin
1. Verify you are logged in as an admin
2. **Check Google Sheets write permissions** ⭐
3. Ensure Admin sheet has proper structure
4. **Verify service account has "Editor" access** ⭐

### Cannot Remove Admin
1. Cannot remove yourself (by design)
2. Cannot remove last admin (safety feature)
3. Check you have admin permissions

### Cannot Add User Access
1. **Check service account has "Editor" permissions** ⭐
2. Verify account number exists in People sheet
3. Check "Unique Number" and "User Access" columns exist
4. Ensure spreadsheet is shared with service account

## Benefits

✅ **No database needed** - Uses Google Sheets as admin store  
✅ **Easy management** - Add/remove admins from web interface  
✅ **Secure** - Multiple safety checks prevent accidents  
✅ **Scalable** - Can handle multiple admins easily  
✅ **Audit trail** - All changes logged in Google Sheets  
✅ **Permission-aware** - Clear error messages for permission issues
