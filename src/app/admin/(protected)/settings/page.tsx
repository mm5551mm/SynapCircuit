import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Store Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Configure store-wide preferences and view integration status</p>
      <div className="mt-6">
        <AdminSettingsForm />
      </div>
    </div>
  );
}
