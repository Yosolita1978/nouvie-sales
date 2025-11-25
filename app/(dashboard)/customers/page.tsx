export default function CustomersPage() {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Customers</h2>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + New Customer
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">
            Customer list will go here...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            We have 614 real customers ready to display!
          </p>
        </div>
      </div>
    )
  }