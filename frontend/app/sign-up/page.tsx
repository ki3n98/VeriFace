"use client";

import { useState } from "react";
import styles from "../sign-in/sign-in.module.css"; // reuse same styling

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(""); // <-- NEW

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:80/auth/signup", {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
          embedding: [], // required by your backend
        }),
      });

      if (!res.ok) {
        setError("Unable to create account. Please try again.");
        return;
      }

      // Success message
      setSuccess("Success! Please log in.");

      // Delay redirect so user sees the success alert
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 2500);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <img src="/logo.png" className={styles.logo} alt="Logo" />

      <div className={styles.card}>
        <h1 className={styles.title}>Sign Up</h1>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        {!success && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              First Name
              <input
                className={styles.input}
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Last Name
              <input
                className={styles.input}
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className={styles.label}>
              Password
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className={styles.button} type="submit">
              Create Account
            </button>

            {/* 👇 NEW: Sign-in link */}
            <p className={styles.linkText}>
              Already have an account?{" "}
              <a href="/sign-in" className={styles.link}>
                Sign in here
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
