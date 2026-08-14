# Typeform Clone

A full-stack, functional clone of the Typeform application, designed to replicate the core form-building and form-filling workflows, complete with the signature one-question-at-a-time conversational experience.

## 🚀 Features

- **Form Builder**: Drag-and-drop style 3-panel builder interface with live preview.
- **Multiple Question Types**: Short text, long text, multiple choice, dropdown, email, number, yes/no, and rating.
- **Form Management**: Dashboard to create, rename, duplicate, publish, and delete forms.
- **Respondent Flow**: Full-screen, smooth-transitioning, one-question-at-a-time experience for users filling out the form.
- **Response Tracking**: View all submissions in a detailed tabular dashboard.
- **Authentication**: JWT-based login and signup flow.

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (TypeScript, App Router)
- **Styling**: Vanilla CSS Modules (scoped, maintainable, matching Typeform's design system)
- **Backend**: Python 3, FastAPI
- **Database**: SQLite3 (No ORM, raw SQL for performance and simplicity)
- **Authentication**: JWT (JSON Web Tokens) with Passlib (bcrypt)

## 🏗 Architecture Overview

The application follows a standard decoupled Client-Server architecture:
1. **Frontend (Next.js)**: Manages the complex state of the form builder, handles client-side routing, and provides the highly interactive Respondent Flow. It communicates with the backend via REST API calls.
2. **Backend (FastAPI)**: Serves as a lightweight, high-performance API layer. It handles user authentication, form validation, and CRUD operations.
3. **Database (SQLite)**: A file-based relational database used for persistence. Queries are executed using standard SQL, with relationships strictly enforced via foreign keys.

## 🗄 Database Schema

The database consists of 5 core tables, structured to allow flexible form definitions and efficient response tracking:

- **`users`**: Stores creator accounts.
  - `id` (PK), `email`, `password_hash`, `created_at`, `updated_at`
- **`forms`**: Represents a single Typeform.
  - `id` (PK), `user_id` (FK), `title`, `description`, `is_published`, `share_slug`, `created_at`, `updated_at`
- **`questions`**: Defines individual fields within a form.
  - `id` (PK), `form_id` (FK), `question_type`, `title`, `description`, `is_required`, `position`, `options` (JSON string for choice-based types)
- **`responses`**: Represents a single submission from a user.
  - `id` (PK), `form_id` (FK), `respondent_id` (UUID), `submitted_at`
- **`answers`**: Stores the specific value provided for a question within a response.
  - `id` (PK), `response_id` (FK), `question_id` (FK), `value`

## 🧠 Assumptions Made

1. **Saving Strategy**: The form builder utilizes a "delete-and-replace" strategy for questions when saving a form. Instead of tracking complex deltas (which question was edited vs deleted), the backend drops existing questions and re-inserts the new ordered list. This ensures data consistency with minimal complexity.
2. **Anonymous Respondents**: The respondent flow does not require authentication. To track unique submissions, a random UUID (`respondent_id`) is generated on the backend upon submission.
3. **Flexible Options Storage**: Instead of creating a separate table for question options (e.g., choices in a dropdown), options are stored as a serialized JSON string in the `questions.options` column. This prevents unnecessary JOINs when loading a form.
4. **Client-Side Storage**: JWT tokens are stored in `localStorage` for simplicity.
5. **Proxy Configuration**: During development, Next.js is configured to proxy `/api` requests to the FastAPI backend running on port 8000, preventing CORS preflight overhead.

## ⚙️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.9+)

### 1. Backend Setup
Navigate to the backend directory and set up a virtual environment:
```bash
cd backend
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```
*The backend will run on `http://localhost:8000` and automatically create the `typeform.db` file.*

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory:
```bash
cd typeform-app

# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
*The frontend will run on `http://localhost:3000`.*

### 3. Usage
1. Open `http://localhost:3000` in your browser.
2. Sign up for a new account.
3. Click "Create form" and start building!
4. Hit "Publish" to generate a shareable link and test the respondent flow.
