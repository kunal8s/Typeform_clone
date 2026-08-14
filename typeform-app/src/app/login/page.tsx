"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Invalid email or password");
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.logo} id="logo-link">
          <svg
            width="33"
            height="22"
            viewBox="0 0 33 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 0H10.5C14.5 0 17 2.5 17 5.5C17 8.5 14.5 11 10.5 11H6V22H0V0Z"
              fill="currentColor"
            />
            <path
              d="M19 5.5C19 2.5 21.5 0 25.5 0H33V6H25.5C24.5 6 24 6.5 24 7V22H19V5.5Z"
              fill="currentColor"
            />
          </svg>
          <span className={styles.logoText}>typeform</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.formContainer}>
          {/* Welcome Text */}
          <div className={styles.welcomeSection}>
            <h1 className={styles.title} id="login-title">
              Hello,
              <br />
              welcome back
            </h1>
          </div>

          {/* Login Form */}
          <form
            className={styles.form}
            onSubmit={handleSubmit}
            id="login-form"
            noValidate
          >
            {error && (
              <div className={styles.errorBanner} id="login-error" role="alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
                  <path d="M8 4V9" stroke="currentColor" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor="login-email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bruce@wayne.com"
                  className={styles.input}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="login-password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={styles.input}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword(!showPassword)}
                  id="toggle-password"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading ? (
                <div className={styles.spinner} />
              ) : (
                "Log in to Typeform"
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className={styles.footerLinks}>
            <p className={styles.signupPrompt}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className={styles.signupLink} id="signup-link">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
