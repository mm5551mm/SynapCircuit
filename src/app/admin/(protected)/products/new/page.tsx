import AdminProductForm from "@/components/admin/AdminProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add Product</h1>
      <p className="mt-1 text-sm text-slate-500">Create a new product in your catalog</p>
      <div className="mt-6">
        <AdminProductForm />
      </div>
    </div>
  );
}
