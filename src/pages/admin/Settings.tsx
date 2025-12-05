// src/pages/admin/Settings.tsx
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/AdminNavbar";

export default function Settings() {
  return (
    <div className="flex">
      <Sidebar role="admin" />
      <div className="flex-1 min-h-screen ml-0 md:ml-64">
        <Navbar role="admin" />
        <main className="p-6">
          <h1 className="text-3xl font-bold text-white mb-4">Settings</h1>
          <p className="text-white">Admin settings go here.</p>
        </main>
      </div>
    </div>
  );
}
