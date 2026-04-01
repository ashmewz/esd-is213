import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ACCOUNT_LINKS = [
  { label: "My Tickets", to: "/tickets", active: false },
  { label: "Account Details", to: "/account", active: true },
];

function FieldRow({
  label,
  value,
  displayContent,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  children,
}) {
  return (
    <div className="border-b border-gray-200 py-8">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-gray-900">{label}</p>
          {!isEditing && (
            displayContent ? <div className="mt-4">{displayContent}</div> : <p className="mt-3 text-[15px] text-gray-800">{value}</p>
          )}
        </div>

        <button
          type="button"
          onClick={isEditing ? onCancel : onEdit}
          className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-gray-800 transition hover:text-[#800020]"
        >
          <span>{isEditing ? "Cancel" : "Edit"}</span>
          <Pencil size={15} />
        </button>
      </div>

      {isEditing && (
        <div className="mt-5 max-w-[620px]">
          {children}
          <button
            type="button"
            onClick={onSave}
            className="mt-5 rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}

export default function AccountDetailsPage() {
  const { user, updateProfile, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [editingField, setEditingField] = useState(null);
  const [drafts, setDrafts] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    profileImage: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setDrafts({
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      profileImage: user?.profileImage || "",
    });
  }, [user]);

  function beginEdit(field) {
    setEditingField(field);
    setError("");
    setSuccess("");
    setDrafts({
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      profileImage: user?.profileImage || "",
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function cancelEdit() {
    setEditingField(null);
    setError("");
    setSuccess("");
    setDrafts({
      username: user?.username || "",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      profileImage: user?.profileImage || "",
    });
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function handleDraftChange(event) {
    const { name, value } = event.target;
    setDrafts((current) => ({ ...current, [name]: value }));
  }

  function saveField(field) {
    const nextValue = drafts[field]?.trim();
    if (!nextValue) {
      setError(`Please enter a valid ${field}.`);
      return;
    }

    updateProfile({ [field]: nextValue });
    setSuccess(`${field.charAt(0).toUpperCase() + field.slice(1)} updated.`);
    setEditingField(null);
  }

  function saveProfileDetails() {
    if (!drafts.username.trim() || !drafts.name.trim()) {
      setError("Please fill in username and name.");
      return;
    }

    updateProfile({
      username: drafts.username.trim(),
      name: drafts.name.trim(),
      profileImage: drafts.profileImage,
    });
    setSuccess("Profile updated.");
    setEditingField(null);
  }

  function savePassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setError("Please fill in all password fields.");
      return;
    }

    if (passwordForm.currentPassword !== (user?.password || "")) {
      setError("Current password is incorrect.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    updateProfile({ password: passwordForm.newPassword });
    setSuccess("Password updated.");
    setEditingField(null);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  function handleImagePick(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDrafts((current) => ({
        ...current,
        profileImage: typeof reader.result === "string" ? reader.result : current.profileImage,
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  function saveProfileImage() {
    if (!drafts.profileImage) {
      setError("Please upload an image first.");
      return;
    }

    updateProfile({ profileImage: drafts.profileImage });
    setSuccess("Profile image updated.");
    setEditingField(null);
  }

  const maskedPassword = "*".repeat(Math.max(10, String(user?.password || "").length || 10));

  return (
    <main className="min-h-[calc(100vh-140px)] bg-white">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden min-h-[calc(100vh-140px)] w-[270px] shrink-0 border-r border-gray-200 px-8 py-8 lg:block">
          <p className="text-base font-black uppercase tracking-tight text-gray-900">My Account</p>
          <nav className="mt-10 flex flex-col gap-7">
            {ACCOUNT_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`block text-[14px] ${
                  item.active ? "font-semibold text-gray-900" : "text-gray-800 hover:text-[#800020]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 border-t border-gray-200 pt-6">
            <button
              onClick={logout}
              className="text-[14px] font-medium text-gray-800 transition hover:text-[#800020]"
            >
              Log out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-8 py-8 md:px-9 lg:px-10">
          <h1 className="text-lg font-bold text-gray-900 md:text-[26px]">Account Details</h1>

          {(error || success) && (
            <div
              className={`mt-6 rounded-xl px-4 py-3 text-sm ${
                error
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {error || success}
            </div>
          )}

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-6 py-2 shadow-sm">
            <FieldRow
              label="Profile"
              value=""
              displayContent={
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {user?.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-500">
                        {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 text-[15px] text-gray-900">
                    <p>
                      <span className="font-semibold">Username:</span>{" "}
                      {user?.username || "-"}
                    </p>
                    <p>
                      <span className="font-semibold">Name:</span>{" "}
                      {user?.name || "-"}
                    </p>
                  </div>
                </div>
              }
              isEditing={editingField === "profile"}
              onEdit={() => beginEdit("profile")}
              onCancel={cancelEdit}
              onSave={saveProfileDetails}
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="shrink-0">
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                    {drafts.profileImage || user?.profileImage ? (
                      <img
                        src={drafts.profileImage || user?.profileImage}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-500">
                        {(user?.name || user?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImagePick}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#800020] hover:text-[#800020]"
                  >
                    <Camera size={14} />
                    Upload Image
                  </button>
                </div>

                <div className="grid min-w-0 flex-1 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Username</span>
                    <input
                      name="username"
                      value={drafts.username}
                      onChange={handleDraftChange}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Name</span>
                    <input
                      name="name"
                      value={drafts.name}
                      onChange={handleDraftChange}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                    />
                  </label>
                </div>
              </div>
            </FieldRow>

            <FieldRow
              label="Email"
              value={user?.email || "-"}
              isEditing={editingField === "email"}
              onEdit={() => beginEdit("email")}
              onCancel={cancelEdit}
              onSave={() => saveField("email")}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">New Email</span>
                <input
                  name="email"
                  type="email"
                  value={drafts.email}
                  onChange={handleDraftChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                />
              </label>
            </FieldRow>

            <FieldRow
              label="Phone"
              value={user?.phone || "-"}
              isEditing={editingField === "phone"}
              onEdit={() => beginEdit("phone")}
              onCancel={cancelEdit}
              onSave={() => saveField("phone")}
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">New Phone Number</span>
                <input
                  name="phone"
                  value={drafts.phone}
                  onChange={handleDraftChange}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                />
              </label>
            </FieldRow>

            <FieldRow
              label="Password"
              value={maskedPassword}
              isEditing={editingField === "password"}
              onEdit={() => beginEdit("password")}
              onCancel={cancelEdit}
              onSave={savePassword}
            >
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        currentPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">New Password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        newPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#800020]"
                  />
                </label>
              </div>
            </FieldRow>
          </div>
        </section>
      </div>
    </main>
  );
}
