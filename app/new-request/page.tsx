import NewRequestForm from "./NewRequestForm";

export default function NewRequestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <NewRequestForm />
        </div>
      </div>
    </div>
  );
}
