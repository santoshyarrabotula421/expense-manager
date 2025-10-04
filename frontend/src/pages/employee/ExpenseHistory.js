import React from 'react';

const ExpenseHistory = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            My Expenses
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            View and manage your submitted expenses.
          </p>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <p className="text-gray-500">Expense history interface coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseHistory;