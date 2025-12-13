"use client";

import { useState } from "react";
import styles from "./sign-in.module.css";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:80/auth/login", {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid email or password");
      }

      const data = await res.json();
      console.log("Login success:", data);

      // Save token
      localStorage.setItem("token", data.access_token);

      // Redirect to dashboard/home page
      window.location.href = "/home";
    } catch (error) {
      alert("Login failed. Check your email and password.");
      console.error(error);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <img src="/logo.png" className={styles.logo} alt="Logo" />

      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
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
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
