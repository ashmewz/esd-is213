import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { customerLogin } from "../api";

export default function LoginPage() {
  const { login, isCustomer } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isCustomer) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await customerLogin(email, password);
      login(user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mx-auto max-w-[520px] rounded-[24px] bg-white px-7 py-8 shadow-sm md:px-8">
          <h1 className="text-center text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Sign In
          </h1>

          <form onSubmit={handleSubmit} className="mx-auto mt-7 max-w-[380px]">
            <div className="space-y-5">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email *"
                  className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password *"
                  className="w-full rounded-xl border border-gray-500 px-4 py-3.5 pr-14 text-base text-gray-800 outline-none transition focus:border-[#800020]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                </button>
              </div>
            </div>

            {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-[#c20029] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#a70023] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="mt-6 space-y-4 text-center text-base text-gray-800">
              <Link to="/forgot-password" className="underline decoration-2 underline-offset-4">
                Forgot password?
              </Link>
              <Link to="/resend-activation" className="block w-full underline decoration-2 underline-offset-4">
                Resend email activation
              </Link>
            </div>

            <p className="mt-6 text-center text-base text-gray-800">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="underline decoration-2 underline-offset-4">
                Register now
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
