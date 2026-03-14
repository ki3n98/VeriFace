# VeriFace User Guide

## What is VeriFace?

VeriFace is an advanced, automatic attendance verification system that revolutionizes how organizations, institutions, and event managers handle identity verification and attendance. Designed for versatility, VeriFace can be deployed in classrooms, conferences, workplaces, or large-scale events.

Traditional approaches — manual roll calls, paper sign-ins, and ticketing systems — are slow, error-prone, and increasingly impractical for modern organizations. VeriFace replaces these outdated processes with an automated solution that leverages artificial intelligence for facial recognition, enabling rapid matching automatically while maintaining high reliability and low latency at entry points.

Beyond entry management, VeriFace provides administrators with powerful attendance analytics — enabling them to track participation trends, measure engagement, and generate reports instantly. Its modular design makes it easy to integrate with existing infrastructure, whether in educational, corporate, or event management systems.

Attendees check in via facial recognition or QR code; organizers track attendance in real time through the dashboard.

---

## Table of Contents

1. [Creating an Account](#1-creating-an-account)
2. [Signing In](#2-signing-in)
3. [Setting Up Your Face Photo](#3-setting-up-your-face-photo)
4. [Managing Events](#4-managing-events)
5. [Running a Session (Check-in)](#5-running-a-session-check-in)
6. [Monitoring Attendance (Dashboard)](#6-monitoring-attendance-dashboard)
7. [Cold Call Wheel](#7-cold-call-wheel)
8. [Profile & Settings](#8-profile--settings)
9. [Achievements](#9-achievements)
10. [FAQ](#10-faq)

---

## 1. Creating an Account

1. Go to the app and click **Sign Up** (or navigate to `/sign-up`).
2. Fill in your **First Name**, **Last Name**, **Email**, and **Password**.
3. Click **Create Account**.
4. On success you are redirected to the sign-in page.

> After signing in for the first time you will be taken to the **Face Photo** setup page. Complete that step before accessing the rest of the app.

---

## 2. Signing In

1. Navigate to `/sign-in`.
2. Enter your **Email** and **Password**.
3. Click **Sign In**. You are redirected to the face photo page (if no embedding exists) or the events page.

---

## 3. Setting Up Your Face Photo

VeriFace uses your photo to generate a facial embedding. This is a one-time setup required for check-in.

1. On the **Face Photo** page, click **Choose file**.
2. Select a clear, front-facing photo in **JPG, PNG, or WebP** format (max 5 MB).
3. A preview of the selected image appears.
4. Click **Upload & Continue**.
   - The app shows progress: *Checking your account → Uploading your photo → Generating your embedding.*
5. Once complete, you are redirected to **Events**.

**Tips for a good photo:**
- Use even lighting with no harsh shadows on your face.
- Look directly at the camera.
- Only one face should be visible in the frame.

---

## 4. Managing Events

The **Events** page (`/events`) is your home screen after setup.

### Viewing events

Each event you belong to appears as a card. Your role (Owner or Admin) is shown as a badge. Click a card to open its dashboard.

### Creating an event

1. Click the **Create Class or Event** card (dashed border, + icon).
2. Enter an **Event Name** and optional **Location**.
3. Optionally upload a **CSV file** to bulk-import members (see below).
4. Click **Create**.

### Importing members via CSV

Your CSV should have a header row with at least an `email` column. The app will match emails to existing accounts or send invitations to unregistered addresses.

### Deleting an event

Hover over an event card and click the **delete (trash) icon** that appears. A confirmation dialog will ask you to confirm. Only the event **owner** can delete an event.

---

## 5. Running a Session (Check-in)

A *session* is a single meeting or class period within an event.

### Creating a session / generating a QR code

1. Open the event dashboard.
2. Click **Generate QR Code**. A new session is created and a QR code modal appears.
3. Display the QR code on a projector or screen.
4. Attendees scan the QR code with their phone camera to check in via facial recognition.

> An active session's QR code can be reopened with the **View QR** button.

### Manual check-in

From the **Sessions** tab in the dashboard, use the **Check In** action on any attendee row to mark them in manually.

### Changing an attendance status

In the attendance table each row has a **status dropdown** (Present / Late / Absent). Click it and select the desired status. Changes save immediately.

---

## 6. Monitoring Attendance (Dashboard)

The dashboard (`/dashboard?eventId=…`) has two tabs.

### Overview tab

| Card | Description |
|---|---|
| Present Today | Count of attendees marked present |
| Late Arrivals | Count marked late |
| Absent Today | Count marked absent |

Two charts are displayed:
- **Bar chart** — attendance per session (present / late / absent stacked)
- **Pie chart** — breakdown for the currently selected session

### Sessions tab

A live attendance table shows every member with their:
- Avatar and name
- Email
- Status (editable dropdown)
- Check-in timestamp

The table updates in **real time** via WebSocket when attendees check in.

### Adding members

Click **Add Member(s)** to open a modal and add people to the event by email.

### Sending invitations

Click **Send Invites** to email all members who have not yet registered.

### Exporting a report

Click **Export Report** to download a CSV of the current session's attendance data.

---

## 7. Cold Call Wheel

The **Participation** page (`/participation`) randomly selects a present attendee for participation.

1. Navigate to **Participation** in the sidebar.
2. If no event is pre-selected, click an event card to load its current session.
3. Click **Spin**. The wheel animates and lands on a randomly selected present (or late) attendee.
4. The selected student's name and avatar are displayed prominently.
5. Click **Spin** again for a new selection.

---

## 8. Profile & Settings

Navigate to **Settings** (`/settings`) from the sidebar.

### Changing your profile photo (avatar)

1. Click **Change photo** under your current avatar.
2. Select an image file. A crop tool appears.
3. Drag and zoom to frame your face, then click **Crop & Upload**.

> Photos are checked automatically for inappropriate content. Uploads that fail moderation are rejected.

### Updating your name

1. Click **Edit** next to your displayed name.
2. Update your **First Name** and/or **Last Name**.
3. Click **Save**.

### Changing your email

1. Click **Change** next to your email address.
2. Enter your new email and click **Send verification**.
3. Check your inbox for a verification link. Your email updates after you click the link.

### Switching theme

In the **Appearance** section toggle between **Light** and **Dark** mode. The preference is saved to your account.

### Security

The **Security** tab (`/settings/security`) is a placeholder for upcoming features.

---

## 9. Achievements

Navigate to **Settings → Achievements** to see your badges.

| Badge | How to earn |
|---|---|
| First Steps | Complete your first check-in |
| On Time | Check in on time 3 times in a row |
| Loyal Member | Account active for 30+ days |
| Good Boy | Achieve 100% attendance at any event |
| Leader | Be an admin for any event |
| Goat | Rank #1 in attendance for any event |

Earned badges appear in full color; locked badges are greyed out with a lock icon.

---

## 10. FAQ

**My photo upload fails with "No face detected".**
Make sure only one face is clearly visible, well-lit, and facing the camera directly. Avoid sunglasses, hats, or heavy shadows.

**The QR code scan doesn't check me in.**
Ensure your face photo has been set up (step 3). The scan uses your stored facial embedding for verification.

**I'm not seeing real-time check-ins on the dashboard.**
Check your network connection. The live feed requires a WebSocket connection to the backend. Refreshing the page will re-establish it.

**I didn't receive an invitation email.**
Ask the event owner to click **Send Invites** again. Check your spam folder. Email delivery requires the backend SMTP configuration to be set up.

**I forgot my password.**
Password reset is not yet available. Contact your administrator.

**Can I belong to multiple events?**
Yes. All events you are a member of appear on the Events page.
