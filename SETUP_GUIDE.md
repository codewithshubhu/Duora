# DUORA — Production Architecture & Deployment Guide
> **Tagline:** Connect Privately.  
> **Lead Architect & Engineer:** Shubham Mishra  
> **Version:** 1.0.0 Production Release

Duora is a secure, private messaging application engineered with React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, Firebase Storage, and Capacitor for Android, featuring WebRTC audio and video calling.

---

## 1. Architecture Overview

### Technology Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Web Audio API.
- **Backend & Database:** Firebase Authentication, Cloud Firestore (Enterprise edition), Firebase Storage.
- **Real-Time Communication:** WebRTC Peer-to-Peer with Google STUN servers (`stun.l.google.com:19302`) and Firestore signaling.
- **Mobile Runtime:** Capacitor 6 / Android WebView.
- **Sound Engine:** Procedural Web Audio API synthesizer for zero-latency ringtones, call connected tones, and message audio pops.

---

## 2. Permanent Duora ID & Zero-PII Security Architecture

### Immutable Public Identifier
- Every registered account receives a permanent, immutable public ID formatted as `DUR-XXXX-XXXX` (e.g., `DUR-9F4K-3L7P`).
- Internal routing references the Firebase Auth `uid`.
- Usernames are unique, lowercase-normalized, and reserved atomically in `/usernames/{usernameLower}`.
- PII (user emails, verification tokens) is isolated in `/users/{uid}/private/info` and protected by Firestore Security Rules. Email addresses are never exposed in search or public profiles.

---

## 3. Mandatory Email Verification

Duora enforces verified email requirements to prevent bot swarms and unverified spamming:
1. When an account is registered with email and password, a verification link is automatically dispatched via `sendEmailVerification`.
2. Unverified users see an in-app verification status banner with an instant "Resend Link" button and a real-time "I've Verified (Check Status)" check.
3. Backend Firestore rules restrict writes to verified accounts.

---

## 4. 12 Built-in Themes

Duora features 12 persistent color themes (both light and dark modes) alongside customizable accent colors and chat wallpapers:
1. **Royal Violet Light (Default):** `#7057E8`, Soft Lilac `#EDE8FF`, Ink `#191824`, Cloud `#F7F7FB`.
2. **Royal Violet Dark:** Deep violet `#8B72FF`, Obsidian `#12111A`.
3. **Obsidian Midnight:** Pure dark `#0B0B0E` with vibrant violet accents.
4. **Cyber Lilac:** Neon purple `#A855F7` with deep space background.
5. **Deep Indigo:** Slate `#0F172A` and Indigo `#4F46E5`.
6. **Emerald Forest:** Dark emerald `#041F1A` and green `#059669`.
7. **Rose Dusk:** Deep rose `#190E14` and ruby `#E11D48`.
8. **Solar Amber:** Warm dark `#18140B` and amber `#D97706`.
9. **Nordic Slate:** Blue slate `#0B132B` and sky `#0284C7`.
10. **Velvet Mauve:** Rich mauve `#160B1E` and orchid `#C026D3`.
11. **Crimson Night:** Dark crimson `#190A0A` and red `#DC2626`.
12. **Pure Minimalist:** Clean light `#F8FAFC` and royal blue `#2563EB`.

Wallpapers supported: Clean, Constellation, Geometric Mesh, Organic Waves, Subtle Dots.

---

## 5. WebRTC Voice and Video Calling

- **Signaling Collection:** `/calls/{callId}`
- **ICE Candidate Exchange:** `/calls/{callId}/callerCandidates` & `/calls/{callId}/receiverCandidates`
- **Features:**
  - Real microphone and camera stream capture via `navigator.mediaDevices.getUserMedia`.
  - In-call controls: Mute audio, toggle video, flip front/rear camera (`facingMode: 'user' | 'environment'`).
  - Active call timer (mm:ss).
  - Melodic procedural incoming call ringtone synthesized directly in the browser.
  - Call logs with incoming, outgoing, and missed call history.

---

## 6. Capacitor Android Packaging Instructions

### Android Setup Steps
1. Install Capacitor CLI and Android platform:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap add android
   ```
2. Build production web bundle:
   ```bash
   npm run build
   npx cap sync android
   ```
3. Open in Android Studio:
   ```bash
   npx cap open android
   ```
4. Verify Android Permissions in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.INTERNET" />
   <uses-permission android:name="android.permission.CAMERA" />
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
   <uses-permission android:name="android.permission.VIBRATE" />
   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
   ```
5. Place your Firebase `google-services.json` inside `android/app/`.
6. Build signed APK or App Bundle via Android Studio (`Build > Generate Signed Bundle / APK`).

---

## 7. Testing Checklist

- [x] **Email & Password Sign-up:** Creates user, generates unique Duora ID (`DUR-XXXX-XXXX`), and sends verification link.
- [x] **Google Sign-in:** Instant popup authentication and profile bootstrap.
- [x] **Search & Discovery:** Searches by exact Duora ID or username prefix with real Firestore data.
- [x] **Message Requests:** Incoming request notification card on Home, with Accept and Decline actions.
- [x] **Real-time Messaging:** One-to-one and group chat with text, photo attachments, voice notes, and file attachments.
- [x] **Message Reactions & Replies:** Quick emojis, emoji picker, swipe/reply banner.
- [x] **WebRTC Calls:** Peer-to-peer audio/video connection with STUN server, ringtone, mute, camera toggle, and call logs.
- [x] **12 Themes & Wallpapers:** Real-time theme change and persistence in localStorage.
