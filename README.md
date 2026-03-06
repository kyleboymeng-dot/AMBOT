
# CampusConnect | Academic Portal

This is a high-performance, role-based school management system built with **Next.js 15**, **Firebase**, and **ShadCN UI**.

## 🚀 Local Setup Instructions

Follow these steps to get the project running on your machine:

### 1. Extract the Project
Unzip the downloaded project into a new folder on your computer.

### 2. Open the Terminal
You need to run commands inside your project folder:
- **Windows:** Right-click inside the folder and select **"Open in Terminal"** or click the address bar, type `cmd`, and press **Enter**.
- **macOS:** Right-click the folder > **Services** > **New Terminal at Folder**. Or, open the Terminal app, type `cd ` (with a space), and drag the folder into the window.

### 3. Install Dependencies
In the terminal window you just opened, type the following and press Enter:
```bash
npm install
```

### 4. Configure Firebase (Mandatory)
This project requires a Firebase project to handle Authentication, Database, and Storage features.
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  **Authentication**: Enable "Email/Password" in the Sign-in method tab.
4.  **Firestore**: Create a database. Start in "Test Mode" for initial development.
5.  **Storage**: Enable Firebase Storage to handle image uploads (avatars, etc.).
6.  **Web App**: Register a new Web App in your Firebase project settings.
7.  **Config**: Copy the `firebaseConfig` object provided by Firebase and replace the content in `src/firebase/config.ts`.

### 5. Run Development Server
Once configured, run this command in your terminal:
```bash
npm run dev
```
Open [http://localhost:9002](http://localhost:9002) in your browser.

## 🔑 Setting Up Test Accounts

To log in, you must first create users in both **Firebase Auth** and the **Firestore `users` collection**.

### Important: UID Mapping
For a user to log in successfully, the **Document ID** of their profile in the `users` Firestore collection **MUST** exactly match their **User UID** from Firebase Authentication.

1.  Create a user in Firebase Auth (e.g., `admin@campusconnect.edu`).
2.  Copy that user's **UID**.
3.  Create a document in the `users` collection in Firestore.
4.  Set the **Document ID** to the copied UID.
5.  Add these fields to the document:
    *   `name`: "Admin User"
    *   `email`: "admin@campusconnect.edu"
    *   `role`: "admin" (options: `admin`, `teacher`, `student`, `registrar`)

## 🖼️ Image Management
- **Static Assets**: Place logos or default icons in the `/public` folder. Access them via `/filename.png`.
- **User Uploads**: Use **Firebase Storage**. The app is pre-configured with the `useStorage` hook for accessing your bucket.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth/Storage**: Firebase
- **UI Components**: ShadCN UI
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
