// src/pages/organizer/Profile.tsx
import Sidebar from "../../components/Sidebar";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { LogOut, Mail, User, Calendar, Edit3, Check, X, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  created_at: string;
}

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        const { data: profileArray, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, phone, avatar_url, role, created_at")
          .eq("id", session.user.id);

        const profile = profileArray?.[0];

        const userData: UserProfile = {
          id: session.user.id,
          email: session.user.email || "No email",
          full_name: profile?.full_name || session.user.user_metadata?.full_name || "Organizer",
          phone: profile?.phone || "",
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
          role: profile?.role || session.user.user_metadata?.role || "organizer",
          created_at: profile?.created_at || session.user.created_at || "",
        };

        setUser(userData);
        setTempName(userData.full_name || "Organizer");
      } catch (err: any) {
        console.error("Profile error:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [navigate]);

  const handleSaveName = async () => {
    if (!user || !tempName.trim()) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, full_name: tempName.trim(), updated_at: new Date() });

      if (error) throw error;

      setUser({ ...user, full_name: tempName.trim() });
      setEditingName(false);
    } catch (err: any) {
      alert("Failed to update name: " + err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}

        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
          <main className="p-6 lg:p-10 max-w-5xl mx-auto py-12">
            <h1 className="text-4xl font-bold text-white mb-8">My Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Avatar Card */}
              <div className="lg:col-span-1">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
                      {user?.full_name?.[0]?.toUpperCase() || "O"}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 rounded-full p-2 shadow-lg">
                      <Edit3 size={16} className="text-white" />
                    </button>
                  </div>

                  <div className="mt-6">
                    {editingName ? (
                      <div className="flex items-center justify-center gap-3">
                        <input
                          type="text"
                          value={tempName}
                          onChange={(e) => setTempName(e.target.value)}
                          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-xl font-semibold text-center focus:outline-none focus:border-purple-500"
                          autoFocus
                        />
                        <button onClick={handleSaveName} className="text-green-400 hover:text-green-300">
                          <Check size={22} />
                        </button>
                        <button onClick={() => { setEditingName(false); setTempName(user?.full_name || ""); }} className="text-red-400 hover:text-red-300">
                          <X size={22} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                          {user?.full_name}
                          <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-white">
                            <Edit3 size={18} />
                          </button>
                        </h2>
                        <p className="text-purple-400 font-medium mt-2 capitalize">{user?.role}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mt-10 w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 px-6 py-3 rounded-xl font-medium transition flex items-center justify-center gap-3"
                  >
                    <LogOut size={20} />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                    <User className="text-purple-400" />
                    Account Information
                  </h3>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <div className="flex items-center gap-4 text-gray-400">
                        <Mail size={20} />
                        <span>Email</span>
                      </div>
                      <span className="text-white font-medium">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-white/10">
                      <div className="flex items-center gap-4 text-gray-400">
                        <Calendar size={20} />
                        <span>Member Since</span>
                      </div>
                      <span className="text-white font-medium">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric"
                        }) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <div className="flex items-center gap-4 text-gray-400">
                        <User size={20} />
                        <span>User ID</span>
                      </div>
                      <code className="text-xs text-gray-500 font-mono bg-white/5 px-3 py-1 rounded">
                        {user?.id.slice(0, 8)}...
                      </code>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-4">Security & Preferences</h3>
                  <p className="text-gray-400">Password change, two-factor auth, and notifications coming soon.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}