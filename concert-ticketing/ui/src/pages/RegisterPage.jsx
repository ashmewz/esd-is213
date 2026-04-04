import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await registerUser(form.name, form.email, form.password);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mx-auto max-w-[520px] rounded-[24px] bg-white px-7 py-8 shadow-sm md:px-8">
          <h1 className="text-center text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Create Account
          </h1>
          <p className="mx-auto mt-3 max-w-[380px] text-center text-sm leading-6 text-gray-500">
            Set up a StagePass account to manage tickets, swaps, and notifications.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-7 max-w-[380px] space-y-5">
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Full Name *"
              className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
              required
            />
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email *"
              className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
              required
            />
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password *"
              className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password *"
              className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#c20029] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#a70023] disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>

            <p className="text-center text-base text-gray-800">
              Already have an account?{" "}
              <Link to="/login" className="underline decoration-2 underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
