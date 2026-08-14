"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Password strength checker
  const getPasswordStrength = (
    pw: string
  ): { level: number; label: string; color: string } => {
    if (pw.length === 0) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, label: "Weak", color: "#e74c3c" };
    if (score === 2) return { level: 2, label: "Fair", color: "#f5a623" };
    if (score === 3) return { level: 3, label: "Good", color: "#2db67d" };
    return { level: 4, label: "Strong", color: "#1a9562" };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleEmailContinue = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setStep(2);
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Signup failed. Please try again.");
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
          {/* Step 1: Email */}
          {step === 1 && (
            <div className={styles.stepContent} key="step-1">
              <div className={styles.welcomeSection}>
                <h1 className={styles.title} id="signup-title">
                  Get better data with conversational forms, surveys, quizzes &
                  more.
                </h1>
                <p className={styles.subtitle}>
                  Creating an account is free. No credit card required.
                </p>
              </div>

              <form
                className={styles.form}
                onSubmit={handleEmailContinue}
                id="signup-email-form"
                noValidate
              >
                {error && (
                  <div
                    className={styles.errorBanner}
                    id="signup-error"
                    role="alert"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
                      <path
                        d="M8 4V9"
                        stroke="currentColor"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="signup-email" className={styles.label}>
                    Email
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="signup-email"
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

                <button
                  type="submit"
                  className={styles.submitButton}
                  id="signup-continue"
                >
                  Continue
                </button>
              </form>

              <div className={styles.footerLinks}>
                <p className={styles.loginPrompt}>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className={styles.loginLink}
                    id="login-link"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Password + Terms */}
          {step === 2 && (
            <div className={styles.stepContent} key="step-2">
              <div className={styles.welcomeSection}>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setStep(1);
                    setError("");
                  }}
                  id="back-button"
                  aria-label="Go back to email step"
                >
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
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <h1 className={styles.title} id="signup-password-title">
                  Create your account
                </h1>
                <p className={styles.emailIndicator}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  {email}
                </p>
              </div>

              <form
                className={styles.form}
                onSubmit={handleSignup}
                id="signup-password-form"
                noValidate
              >
                {error && (
                  <div
                    className={styles.errorBanner}
                    id="signup-step2-error"
                    role="alert"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="8" cy="8" r="7.5" stroke="currentColor" />
                      <path
                        d="M8 4V9"
                        stroke="currentColor"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="11.5" r="0.75" fill="currentColor" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.inputGroup}>
                  <label htmlFor="signup-password" className={styles.label}>
                    Password
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className={styles.input}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowPassword(!showPassword)}
                      id="toggle-password-signup"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className={styles.strengthMeter}>
                      <div className={styles.strengthBars}>
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={styles.strengthBar}
                            style={{
                              backgroundColor:
                                i <= passwordStrength.level
                                  ? passwordStrength.color
                                  : "#e8e8e8",
                            }}
                          />
                        ))}
                      </div>
                      <span
                        className={styles.strengthLabel}
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Terms Agreement */}
                <div className={styles.checkboxGroup}>
                  <label
                    htmlFor="agree-terms"
                    className={styles.checkboxLabel}
                  >
                    <div className={styles.checkboxWrapper}>
                      <input
                        id="agree-terms"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className={styles.checkbox}
                      />
                      <div
                        className={`${styles.customCheckbox} ${
                          agreedToTerms ? styles.checked : ""
                        }`}
                      >
                        {agreedToTerms && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className={styles.checkboxText}>
                      I agree to Typeform&apos;s{" "}
                      <a href="#" className={styles.termsLink}>
                        Terms of Service
                      </a>
                      ,{" "}
                      <a href="#" className={styles.termsLink}>
                        Privacy Policy
                      </a>{" "}
                      and{" "}
                      <a href="#" className={styles.termsLink}>
                        Data Processing Agreement
                      </a>
                      .
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                  id="signup-submit"
                >
                  {isLoading ? (
                    <div className={styles.spinner} />
                  ) : (
                    "Create my free account"
                  )}
                </button>
              </form>

              <div className={styles.footerLinks}>
                <p className={styles.loginPrompt}>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className={styles.loginLink}
                    id="login-link-step2"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
