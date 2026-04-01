import { useNavigate } from "react-router-dom";
import { X, LogIn, UserPlus } from "lucide-react";

export default function LoginPromptModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  function goTo(path) {
    onClose();
    navigate(path);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#fff0f3] flex items-center justify-center mx-auto mb-4">
              <LogIn size={26} className="text-[#800020]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Sign in to continue</h2>
            <p className="text-sm text-gray-500 mt-2">
              You need an account to add tickets to your cart and checkout.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => goTo("/login")}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#800020] hover:bg-[#6a001a] text-white font-semibold rounded-xl transition text-sm"
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              onClick={() => goTo("/register")}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold rounded-xl transition text-sm"
            >
              <UserPlus size={16} /> Create an Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
