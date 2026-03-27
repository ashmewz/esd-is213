import { useState } from "react";
import { Link } from "react-router-dom";

export default function ResendActivationPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mx-auto max-w-[520px] rounded-[24px] bg-white px-7 py-8 shadow-sm md:px-8">
          <h1 className="text-center text-2xl font-black tracking-tight text-gray-900 md:text-3xl">
            Resend Activation
          </h1>
          <p className="mx-auto mt-3 max-w-[380px] text-center text-sm leading-6 text-gray-500">
            Enter your email and we&apos;ll resend your account activation instructions.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-7 max-w-[380px]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email *"
              className="w-full rounded-xl border border-gray-500 px-4 py-3.5 text-base text-gray-800 outline-none transition focus:border-[#800020]"
              required
            />

            {submitted && (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                Activation instructions have been prepared for {email}.
              </div>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-[#c20029] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#a70023]"
            >
              Resend Activation
            </button>

            <p className="mt-6 text-center text-base text-gray-800">
              <Link to="/login" className="underline decoration-2 underline-offset-4">
                Back to Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
