"""
Typeform Clone — FastAPI Backend
Main application entry point.
"""
import json
import uuid


from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from database import get_connection, init_db
from auth import hash_password, verify_password, create_access_token, decode_access_token

# Initialize app
app = FastAPI(
    title="Typeform Clone API",
    description="Backend API for the Typeform clone project",
    version="1.0.0",
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup():
    init_db()


# ===== Auth Dependency =====

def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract and validate JWT token from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"id": int(payload["sub"]), "email": payload["email"]}


# ===== Pydantic Models =====

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class CreateFormRequest(BaseModel):
    title: str = "My typeform"

class QuestionData(BaseModel):
    id: str
    type: str
    title: str
    description: str = ""
    required: bool = False
    options: list = []
    position: int = 0

class SaveFormRequest(BaseModel):
    title: str
    description: str = ""
    questions: list[QuestionData] = []

class SubmitResponseRequest(BaseModel):
    answers: dict[str, str]

class RenameFormRequest(BaseModel):
    title: str




# ===== Auth Routes =====

@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    """Register a new user."""
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    password_hash = hash_password(req.password)
    cursor.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        (req.email, password_hash),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    token = create_access_token({"sub": str(user_id), "email": req.email})
    return AuthResponse(access_token=token, user={"id": user_id, "email": req.email})


@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    """Authenticate an existing user."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user["id"]), "email": user["email"]})
    return AuthResponse(access_token=token, user={"id": user["id"], "email": user["email"]})


# ===== Form Routes =====

@app.get("/api/forms")
def list_forms(user: dict = Depends(get_current_user)):
    """List all forms for the current user."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.id, f.title, f.is_published, f.updated_at, f.share_slug,
               COUNT(DISTINCT q.id) AS question_count,
               (SELECT COUNT(*) FROM responses r WHERE r.form_id = f.id) AS response_count
        FROM forms f
        LEFT JOIN questions q ON q.form_id = f.id
        WHERE f.user_id = ?
        GROUP BY f.id
        ORDER BY f.updated_at DESC
    """, (user["id"],))
    forms = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return forms


@app.post("/api/forms")
def create_form(req: CreateFormRequest, user: dict = Depends(get_current_user)):
    """Create a new blank form."""
    conn = get_connection()
    cursor = conn.cursor()
    share_slug = str(uuid.uuid4())[:8]
    cursor.execute(
        "INSERT INTO forms (user_id, title, share_slug) VALUES (?, ?, ?)",
        (user["id"], req.title, share_slug),
    )
    conn.commit()
    form_id = cursor.lastrowid
    conn.close()
    return {"id": form_id, "title": req.title, "share_slug": share_slug}


@app.get("/api/forms/{form_id}")
def get_form(form_id: int, user: dict = Depends(get_current_user)):
    """Get a form with all its questions."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    cursor.execute(
        "SELECT * FROM questions WHERE form_id = ? ORDER BY position ASC",
        (form_id,),
    )
    questions_raw = cursor.fetchall()
    conn.close()

    questions = []
    for q in questions_raw:
        options = []
        if q["options"]:
            try:
                options = json.loads(q["options"])
            except json.JSONDecodeError:
                options = []
        questions.append({
            "id": str(q["id"]),
            "type": q["question_type"],
            "title": q["title"],
            "description": q["description"] or "",
            "required": bool(q["is_required"]),
            "options": options,
            "position": q["position"],
        })

    return {
        "id": form["id"],
        "title": form["title"],
        "description": form["description"] or "",
        "is_published": bool(form["is_published"]),
        "share_slug": form["share_slug"],
        "questions": questions,
    }


@app.put("/api/forms/{form_id}")
def save_form(form_id: int, req: SaveFormRequest, user: dict = Depends(get_current_user)):
    """Save form with all questions (delete and re-insert strategy)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    # Update form metadata
    cursor.execute(
        "UPDATE forms SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.title, req.description, form_id),
    )

    # Delete existing questions and re-insert
    cursor.execute("DELETE FROM questions WHERE form_id = ?", (form_id,))
    for i, q in enumerate(req.questions):
        options_json = json.dumps(q.options) if q.options else None
        cursor.execute(
            """INSERT INTO questions (form_id, question_type, title, description, is_required, position, options)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (form_id, q.type, q.title, q.description, int(q.required), i, options_json),
        )

    conn.commit()
    conn.close()
    return {"status": "saved"}


@app.delete("/api/forms/{form_id}")
def delete_form(form_id: int, user: dict = Depends(get_current_user)):
    """Delete a form and all its questions."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    cursor.execute("DELETE FROM forms WHERE id = ?", (form_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}


@app.patch("/api/forms/{form_id}/rename")
def rename_form(form_id: int, req: RenameFormRequest, user: dict = Depends(get_current_user)):
    """Rename an existing form."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    cursor.execute(
        "UPDATE forms SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (req.title, form_id),
    )
    conn.commit()
    conn.close()
    return {"status": "renamed", "title": req.title}


@app.post("/api/forms/{form_id}/duplicate")
def duplicate_form(form_id: int, user: dict = Depends(get_current_user)):
    """Duplicate an existing form with all its questions."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT title, description FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    new_title = form["title"] + " (copy)"
    share_slug = str(uuid.uuid4())[:8]

    # Insert new form
    cursor.execute(
        "INSERT INTO forms (user_id, title, description, share_slug) VALUES (?, ?, ?, ?)",
        (user["id"], new_title, form["description"], share_slug),
    )
    new_form_id = cursor.lastrowid

    # Get questions
    cursor.execute("SELECT question_type, title, description, is_required, position, options FROM questions WHERE form_id = ?", (form_id,))
    questions = cursor.fetchall()

    for q in questions:
        cursor.execute(
            """INSERT INTO questions (form_id, question_type, title, description, is_required, position, options)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (new_form_id, q["question_type"], q["title"], q["description"], q["is_required"], q["position"], q["options"])
        )

    conn.commit()
    conn.close()
    return {"status": "duplicated", "id": new_form_id}


@app.put("/api/forms/{form_id}/publish")
def toggle_publish(form_id: int, user: dict = Depends(get_current_user)):
    """Toggle form published status."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, is_published FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    new_status = 0 if form["is_published"] else 1
    cursor.execute(
        "UPDATE forms SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_status, form_id),
    )
    conn.commit()
    conn.close()
    return {"is_published": bool(new_status)}


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "typeform-clone-api"}

# ===== Public Form Routes =====

@app.get("/api/public/form/{share_slug}")
def get_public_form(share_slug: str):
    """Get a published form by its share slug."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM forms WHERE share_slug = ? AND is_published = 1", (share_slug,))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found or not published")

    cursor.execute("SELECT * FROM questions WHERE form_id = ? ORDER BY position ASC", (form["id"],))
    questions_raw = cursor.fetchall()
    conn.close()

    questions = []
    for q in questions_raw:
        options = []
        if q["options"]:
            try:
                options = json.loads(q["options"])
            except json.JSONDecodeError:
                pass
        questions.append({
            "id": q["id"],
            "type": q["question_type"],
            "title": q["title"],
            "description": q["description"] or "",
            "required": bool(q["is_required"]),
            "options": options,
            "position": q["position"],
        })

    return {
        "id": form["id"],
        "title": form["title"],
        "description": form["description"] or "",
        "questions": questions,
    }


@app.post("/api/public/form/{share_slug}/submit")
def submit_response(share_slug: str, req: SubmitResponseRequest):
    """Submit a response to a published form."""
    import re
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM forms WHERE share_slug = ? AND is_published = 1", (share_slug,))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")
    
    form_id = form["id"]

    # Fetch questions for validation
    cursor.execute("SELECT id, question_type, is_required FROM questions WHERE form_id = ? ORDER BY position ASC", (form_id,))
    questions = cursor.fetchall()

    # Server-side validation
    errors = []
    for q in questions:
        q_id_str = str(q["id"])
        value = req.answers.get(q_id_str, "")

        # Required check
        if q["is_required"] and (not value or not value.strip()):
            errors.append(f"Question {q_id_str} is required")
            continue

        if value and value.strip():
            # Email format check
            if q["question_type"] == "email":
                email_re = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_re, value):
                    errors.append(f"Question {q_id_str}: invalid email format")

            # Number check
            if q["question_type"] == "number":
                try:
                    float(value)
                except ValueError:
                    errors.append(f"Question {q_id_str}: invalid number")

    if errors:
        conn.close()
        raise HTTPException(status_code=422, detail="; ".join(errors))

    respondent_id = str(uuid.uuid4())

    cursor.execute(
        "INSERT INTO responses (form_id, respondent_id) VALUES (?, ?)",
        (form_id, respondent_id)
    )
    response_id = cursor.lastrowid

    # Insert answers
    for q_id_str, value in req.answers.items():
        if value is not None and value != "":
            cursor.execute(
                "INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)",
                (response_id, int(q_id_str), value)
            )

    conn.commit()
    conn.close()
    return {"status": "success", "response_id": response_id}


# ===== Results Routes =====

@app.get("/api/forms/{form_id}/responses")
def get_form_responses(form_id: int, user: dict = Depends(get_current_user)):
    """Get all responses for a form (owner only)."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, title FROM forms WHERE id = ? AND user_id = ?", (form_id, user["id"]))
    form = cursor.fetchone()
    if not form:
        conn.close()
        raise HTTPException(status_code=404, detail="Form not found")

    cursor.execute("SELECT id, question_type, title, options FROM questions WHERE form_id = ? ORDER BY position ASC", (form_id,))
    questions_raw = cursor.fetchall()

    questions = []
    for q in questions_raw:
        options = []
        if q["options"]:
            try:
                options = json.loads(q["options"])
            except json.JSONDecodeError:
                pass
        questions.append({
            "id": q["id"],
            "type": q["question_type"],
            "title": q["title"],
            "options": options,
        })

    cursor.execute("SELECT id, respondent_id, submitted_at FROM responses WHERE form_id = ? ORDER BY submitted_at DESC", (form_id,))
    responses_raw = cursor.fetchall()

    responses = []
    for r in responses_raw:
        cursor.execute("SELECT question_id, value FROM answers WHERE response_id = ?", (r["id"],))
        answers_raw = cursor.fetchall()
        answers_dict = {str(a["question_id"]): a["value"] for a in answers_raw}
        
        responses.append({
            "id": r["id"],
            "respondent_id": r["respondent_id"],
            "submitted_at": r["submitted_at"],
            "answers": answers_dict,
        })

    conn.close()

    return {
        "form_id": form["id"],
        "form_title": form["title"],
        "questions": questions,
        "responses": responses,
        "total": len(responses),
    }
