🧱 FULL TASK PLAN
### do not change this file 

Writing + Doodling + Code + PDF + Mobile App
(NeonDB + Cloudinary + PWA)

1️⃣ PROJECT SETUP

Create two projects:

Frontend (React + Vite)

Backend (Node.js + Express)

Decide environment variables for:

Database

JWT secret

Cloudinary keys

Set up Git repository

2️⃣ DATABASE (NEON DB)

Create Neon PostgreSQL instance

Design tables:

Users

Pages

Blocks

Ensure each page belongs to one user

Ensure each block belongs to one page

3️⃣ AUTHENTICATION (EMAIL / USERNAME + PASSWORD)

Create user registration flow

Hash passwords before saving

Create login flow using email or username

Generate session token (JWT)

Protect all private routes

Implement logout

Add session persistence for mobile & web

4️⃣ FRONTEND AUTH UI

Login screen

Signup screen

Form validation

Store authentication state

Auto-login after refresh

5️⃣ BLOCK-BASED EDITOR SYSTEM

Create page editor

Implement block ordering

Add ability to:

Add block

Delete block

Reorder block

Block types:

Text block

Code block

Drawing block

Image block

6️⃣ TEXT WRITING

Rich text support

Keyboard shortcuts

Paste support

Auto-save content

7️⃣ DOODLING (EVERYWHERE)

Add freehand drawing block

Add doodle overlay on:

Text blocks

Code blocks

Save doodles as structured data

Restore doodles on reload

8️⃣ CODE WRITING + EXECUTION

Code editor block

Language selector

Run button

Show output below editor

Send code to execution service

Handle errors & timeouts

9️⃣ IMAGE HANDLING

Support:

Upload

Drag & drop

Paste screenshots

Save images locally (offline)

Upload images to Cloudinary when online

Store only image URLs in Neon DB1️⃣1️⃣ CLOUD SYNC

Sync pages and blocks to Neon DB

Resolve conflicts (last edit wins)

Sync images after upload completes

1️⃣2️⃣ PDF EXPORT

Export a full page as PDF

Include:

Text

Images

Code blocks

Drawings

Ensure PDF works on:

Desktop

Mobile browsers

1️⃣3️⃣ MOBILE SUPPORT (PWA)

Enable PWA support

Add install prompt

Make UI responsive

Test on Android & iOS

Ensure offline works on mobile

1️⃣4️⃣ SECURITY

Enforce authentication on backend

Restrict access to user data

Secure image uploads

Add request limits for login & code execution