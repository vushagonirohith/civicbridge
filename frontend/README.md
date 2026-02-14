<<<<<<< HEAD
# CivicBridge-Frontend


## Overall Purpose

This collection of JavaScript files creates the complete front-end for a web application called "CivicBridge". The application is a civic issue tracking system (like a 311 app). It's designed for two types of users:

* **Regular Users:** Citizens who can sign up, log in, and report local issues (like potholes, graffiti, or garbage). They can specify the location using a map, upload photos, and track the status of their reports on a personal dashboard.
* **Administrators:** A special user (with a hardcoded login) who can view all submitted reports from all users. The admin dashboard allows them to filter reports, update the status (e.g., from "Pending" to "In Progress" or "Resolved"), add comments, and manage the system.

The application uses `localStorage` to manage user sessions and cache data, and it attempts to persist data permanently by sending it to a Google Apps Script URL, which likely saves the data to a Google Sheet.

---

## File-by-File Breakdown

Here is what each file is responsible for:

### 1. **main.js (Core Application)**

This is the main entry point and "control center" for your application.

* **Initializes** the entire app, including the preloader.
* **Loads User Preferences:** Reads the saved theme (dark/light) from `localStorage`.
* **Event Listeners:** Sets up all the primary click events, such as opening the Login, Signup, Settings, and Report Issue modals.
* **UI Management:** Contains the `updateAuthUI` function, which is crucial for changing the header. It shows "Login/Signup" for guests or "Welcome [User] / Logout" for logged-in users.
* **Utilities:** Provides global helper functions like `showAlert` (for pop-up notifications) and `closeAllModals`.

### 2. **auth.js (Authentication)**

This file handles all user session management: logging in, signing up, and logging out.

* **`handleLogin` / `handleSignup`:** Manages the respective forms. It validates input, checks for existing users, and saves new users.
* **`handleAdminLogin`:** Contains the hardcoded credentials (`admin` / `admin123`) for the administrator.
* **`logout`:** Clears the user's session data from `localStorage`.
* **Data Handling:** It uses `sheetsService` (from `sheets.js`) to save/retrieve user data from your Google Sheet backend, and also uses `localStorage` as a fallback.

### 3. **report.js (Issue Reporting Module)**

This file manages the "Report an Issue" modal and all its logic.

* **`ReportManager` Class:** Encapsulates all reporting functionality.
* **Form Handling:** Manages the form fields like "Issue Type," "Description," and "Photo Upload."
* **Photo Upload:** Handles file selection, validating (max 5 images), and showing image previews.
* **Map Integration:** Initializes the Google Map inside the modal (`initializeReportMap`). It allows a user to drop a pin, search for an address, or use their phone's GPS (`useCurrentLocation`).
* **Submission:** Bundles all the form data (issue details, location, photos) and sends it to the `sheetsService` to be saved.

### 4. **dashboard.js (User Dashboard)**

This file builds the personal dashboard that a user sees after logging in.

* **`loadUserDashboard`:** This is the main function. It checks if the user is logged in.
* **Data Fetching:** It gets all reports from `localStorage` and filters them to show only the ones submitted by the currently logged-in user.
* **Statistics:** It calculates the user's stats (Total Issues, Pending, In Progress, Resolved).
* **Rendering:** It dynamically generates the HTML to display the list of issue cards. It also shows any "Admin Comments" on a report.
* **Filtering:** It adds event listeners to the "All," "Pending," etc., buttons to filter the user's report list.

### 5. **admin.js (Admin Dashboard)**

This is a separate, more powerful dashboard exclusively for the administrator.

* **`AdminManager` Class:** Manages all admin-specific functionality.
* **`loadAdminDashboard`:** Renders a dashboard that shows all reports from *all* users.
* **Admin Controls:** Provides UI for searching and filtering all reports (by status, user, or text).
* **CRUD Operations:** This is where the admin manages reports. The code allows the admin to:
    * **Update Status:** Change an issue's status via a dropdown.
    * **Add Comment:** Write a comment that the user will see on their dashboard.
    * **Delete:** Remove an issue report from the system.
    * **View:** Open modals to see issue details and all attached photos.

### 6. **map.js (Map Services)**

This file initializes the Google Maps API and provides shared map functionalities.

* **`initMap`:** The main function called to load the Google Maps API.
* **`initCommunityMap`:** Initializes the main map on the homepage, which shows sample issue markers.
* **Styling:** Includes `getMapStyle` to automatically change the map's color scheme based on the app's dark or light theme.
* **Utilities:** Provides the `placeMarker` function used by `report.js` to drop a pin on the reporting map.

### 7. **chatbot.js (CivicAssist Chatbot)**

This creates the floating chatbot widget.

* **`ChatbotManager` Class:** Manages the chat UI (opening, closing, sending messages).
* **Rules-Based Logic:** This is *not* an AI bot. The `fetchLocalReply` function contains a series of `if/else` statements. It checks the user's message for keywords (e.g., "report," "dashboard," "admin") and provides a pre-programmed response.

### 8. **settings.js (User Preferences)**

This file controls the "Settings" modal.

* **`SettingsManager` Class:** Manages the modal's behavior.
* **Tab Navigation:** Handles switching between the "Profile," "Appearance," and "Notifications" tabs.
* **Theme Switcher:** Contains the logic for the Light, Dark, and Auto theme buttons. It saves the user's choice to `localStorage` and applies the theme to the entire app.
* **Notification Toggles:** Manages the on/off switches for notification preferences (though the logic to use these settings isn't fully implemented).

### 9. **sheets.js (Data Service)**

This is your application's "backend" service layer.

* **`SheetsService` Class:** This class is responsible for all communication with your Google Apps Script backend.
* **API Calls:** It abstracts the `fetch` API. It has methods like `saveUser`, `getUser`, and `saveReport`.
* **Data Formatting:** Each method formats the data (e.g., `formData`) and sends it to your specific Google Script URL (`GOOGLE_SCRIPT_URL`) with the correct "action" parameter. This is what allows your app to save and retrieve data from the Google Sheet.
=======
# CivicBridge
>>>>>>> 7518df2f1e2c1faf0aa268e7a07ab56205553948
