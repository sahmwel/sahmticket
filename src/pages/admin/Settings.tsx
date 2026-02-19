// src/pages/admin/Settings.tsx - COMPLETE UPDATE
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Menu,
  DollarSign,
  Percent,
  CreditCard,
  Globe,
  Shield,
  Bell,
  Mail,
  Lock,
  Users,
  RefreshCw,
  X,
  ChevronDown,
} from "lucide-react";

interface PlatformSettings {
  id?: string;
  // General
  site_name: string;
  support_email: string;
  contact_phone: string;
  currency: string;
  timezone: string;
  // Fee settings
  service_fee_percent: number;
  vat_percent: number;
  stamp_duty_threshold: number;
  stamp_duty_amount: number;
  gateway_fee_percent: number;
  gateway_fee_flat: number;
  gateway_cap: number;
  // Payment gateways
  paystack_public_key: string;
  paystack_secret_key: string;
  flutterwave_public_key: string;
  flutterwave_secret_key: string;
  flutterwave_encryption_key: string;
  // Email
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_email: string;
  from_name: string;
  // Security
  require_email_verification: boolean;
  allow_organizer_signup: boolean;
  allow_attendee_signup: boolean;
  max_event_duration_days: number;
  // Appearance
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  favicon_url: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  site_name: "SahmTicketHub",
  support_email: "support@sahmtickethub.com",
  contact_phone: "+234 800 000 0000",
  currency: "NGN",
  timezone: "Africa/Lagos",
  service_fee_percent: 5,
  vat_percent: 7.5,
  stamp_duty_threshold: 10000,
  stamp_duty_amount: 50,
  gateway_fee_percent: 1.5,
  gateway_fee_flat: 100,
  gateway_cap: 2000,
  paystack_public_key: "",
  paystack_secret_key: "",
  flutterwave_public_key: "",
  flutterwave_secret_key: "",
  flutterwave_encryption_key: "",
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_pass: "",
  from_email: "",
  from_name: "",
  require_email_verification: true,
  allow_organizer_signup: true,
  allow_attendee_signup: true,
  max_event_duration_days: 365,
  primary_color: "#7c3aed",
  secondary_color: "#db2777",
  logo_url: "",
  favicon_url: "",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "fees" | "gateways" | "email" | "security" | "appearance">("general");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate("/auth");
        return;
      }

      // Assuming a table named 'platform_settings' with a single row
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data);
      } else {
        // No settings exist yet – create default row? Or just use defaults.
        // Optionally insert default settings
        const { error: insertError } = await supabase
          .from("platform_settings")
          .insert(DEFAULT_SETTINGS)
          .select()
          .single();

        if (insertError) throw insertError;
        // settings remain DEFAULT_SETTINGS until re-fetch
        fetchSettings(); // re-fetch after insert
      }
    } catch (err: any) {
      console.error("Fetch settings error:", err);
      setError(err.message);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("platform_settings")
        .upsert({ id: settings.id, ...settings }) // upsert based on id
        .eq("id", settings.id || "00000000-0000-0000-0000-000000000000"); // if no id, treat as insert

      if (error) throw error;

      setSuccess(true);
      toast.success("Settings saved successfully!");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-950 items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Toaster position="top-right" />

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-white/10"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-gray-950 border-r border-white/10">
            <Sidebar role="admin" />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar role="admin" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar role="admin" />
        <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-purple-900/5 to-gray-900">
          <main className="p-4 sm:p-6 lg:p-8 xl:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Platform Settings</h1>
                <p className="text-gray-400 text-sm sm:text-base">Configure your ticket platform</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchSettings}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition disabled:opacity-50"
                >
                  <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                  Refresh
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/30 transition disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success/Error messages */}
            {success && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3 text-green-300">
                <CheckCircle size={20} />
                <span>Settings saved successfully!</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Settings tabs */}
            <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-4">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "general"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab("fees")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "fees"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Fees & Taxes
              </button>
              <button
                onClick={() => setActiveTab("gateways")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "gateways"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Payment Gateways
              </button>
              <button
                onClick={() => setActiveTab("email")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "email"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Email
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "security"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab("appearance")}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === "appearance"
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                Appearance
              </button>
            </div>

            {/* Settings forms */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
              {/* General Settings */}
              {activeTab === "general" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">General Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">Site Name</label>
                      <input
                        type="text"
                        value={settings.site_name}
                        onChange={(e) => handleChange("site_name", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Support Email</label>
                      <input
                        type="email"
                        value={settings.support_email}
                        onChange={(e) => handleChange("support_email", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Contact Phone</label>
                      <input
                        type="text"
                        value={settings.contact_phone}
                        onChange={(e) => handleChange("contact_phone", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Currency</label>
                      <select
                        value={settings.currency}
                        onChange={(e) => handleChange("currency", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/60"
                      >
                        <option value="NGN">NGN (Nigerian Naira)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GHS">GHS (Ghanaian Cedi)</option>
                        <option value="KES">KES (Kenyan Shilling)</option>
                        <option value="ZAR">ZAR (South African Rand)</option>
                        <option value="CAD">CAD (Canadian Dollar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => handleChange("timezone", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/60"
                      >
                        <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                        <option value="Africa/Accra">Africa/Accra (GMT)</option>
                        <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                        <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Fees & Taxes */}
              {activeTab === "fees" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">Fee Configuration</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block flex items-center gap-2">
                        <Percent size={16} /> Service Fee (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.service_fee_percent}
                        onChange={(e) => handleChange("service_fee_percent", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block flex items-center gap-2">
                        <Percent size={16} /> VAT (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.vat_percent}
                        onChange={(e) => handleChange("vat_percent", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Stamp Duty Threshold (₦)</label>
                      <input
                        type="number"
                        value={settings.stamp_duty_threshold}
                        onChange={(e) => handleChange("stamp_duty_threshold", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Stamp Duty Amount (₦)</label>
                      <input
                        type="number"
                        value={settings.stamp_duty_amount}
                        onChange={(e) => handleChange("stamp_duty_amount", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Gateway Fee (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={settings.gateway_fee_percent}
                        onChange={(e) => handleChange("gateway_fee_percent", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Gateway Flat Fee (₦)</label>
                      <input
                        type="number"
                        value={settings.gateway_fee_flat}
                        onChange={(e) => handleChange("gateway_fee_flat", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Gateway Cap (₦)</label>
                      <input
                        type="number"
                        value={settings.gateway_cap}
                        onChange={(e) => handleChange("gateway_cap", parseFloat(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Gateways */}
              {activeTab === "gateways" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">Paystack</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">Public Key</label>
                      <input
                        type="text"
                        value={settings.paystack_public_key}
                        onChange={(e) => handleChange("paystack_public_key", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Secret Key</label>
                      <input
                        type="password"
                        value={settings.paystack_secret_key}
                        onChange={(e) => handleChange("paystack_secret_key", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                      />
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-white mt-8 mb-4">Flutterwave</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">Public Key</label>
                      <input
                        type="text"
                        value={settings.flutterwave_public_key}
                        onChange={(e) => handleChange("flutterwave_public_key", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Secret Key</label>
                      <input
                        type="password"
                        value={settings.flutterwave_secret_key}
                        onChange={(e) => handleChange("flutterwave_secret_key", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Encryption Key</label>
                      <input
                        type="password"
                        value={settings.flutterwave_encryption_key}
                        onChange={(e) => handleChange("flutterwave_encryption_key", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              {activeTab === "email" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">SMTP Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">SMTP Host</label>
                      <input
                        type="text"
                        value={settings.smtp_host}
                        onChange={(e) => handleChange("smtp_host", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">SMTP Port</label>
                      <input
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => handleChange("smtp_port", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">SMTP User</label>
                      <input
                        type="text"
                        value={settings.smtp_user}
                        onChange={(e) => handleChange("smtp_user", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">SMTP Password</label>
                      <input
                        type="password"
                        value={settings.smtp_pass}
                        onChange={(e) => handleChange("smtp_pass", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">From Email</label>
                      <input
                        type="email"
                        value={settings.from_email}
                        onChange={(e) => handleChange("from_email", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">From Name</label>
                      <input
                        type="text"
                        value={settings.from_name}
                        onChange={(e) => handleChange("from_name", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">Security & Access</h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between text-white">
                      <span>Require Email Verification</span>
                      <input
                        type="checkbox"
                        checked={settings.require_email_verification}
                        onChange={(e) => handleChange("require_email_verification", e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white">
                      <span>Allow Organizer Signup</span>
                      <input
                        type="checkbox"
                        checked={settings.allow_organizer_signup}
                        onChange={(e) => handleChange("allow_organizer_signup", e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-white">
                      <span>Allow Attendee Signup</span>
                      <input
                        type="checkbox"
                        checked={settings.allow_attendee_signup}
                        onChange={(e) => handleChange("allow_attendee_signup", e.target.checked)}
                        className="w-5 h-5 accent-purple-500"
                      />
                    </label>
                    <div>
                      <label className="text-white font-medium mb-2 block">Max Event Duration (days)</label>
                      <input
                        type="number"
                        value={settings.max_event_duration_days}
                        onChange={(e) => handleChange("max_event_duration_days", parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-white mb-4">Branding</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-white font-medium mb-2 block">Primary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.primary_color}
                          onChange={(e) => handleChange("primary_color", e.target.value)}
                          className="w-12 h-12 rounded border-0"
                        />
                        <input
                          type="text"
                          value={settings.primary_color}
                          onChange={(e) => handleChange("primary_color", e.target.value)}
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Secondary Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={settings.secondary_color}
                          onChange={(e) => handleChange("secondary_color", e.target.value)}
                          className="w-12 h-12 rounded border-0"
                        />
                        <input
                          type="text"
                          value={settings.secondary_color}
                          onChange={(e) => handleChange("secondary_color", e.target.value)}
                          className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white font-mono text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Logo URL</label>
                      <input
                        type="url"
                        value={settings.logo_url}
                        onChange={(e) => handleChange("logo_url", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white font-medium mb-2 block">Favicon URL</label>
                      <input
                        type="url"
                        value={settings.favicon_url}
                        onChange={(e) => handleChange("favicon_url", e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}