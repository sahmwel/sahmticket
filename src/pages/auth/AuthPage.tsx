// src/pages/auth/AuthPage.tsx
import { useState } from "react";
import AuthModal from "../AuthModal";

export default function AuthPage() {
  const [showAuth, setShowAuth] = useState(true);
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
