import React from 'react';

const LineItemsModal = ({ isOpen, onClose, lineItems }) => {
  if (!isOpen) {
    return null;
  }

  let parsedItems = [];
  let parseError = null;

  if (typeof lineItems === 'string' && lineItems) {
    try {
      const jsonString = lineItems
        .replace(/'/g, '"')
        .replace(/None/g, 'null')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false');
      parsedItems = JSON.parse(jsonString);
    } catch (e) {
      console.error("Could not parse line items:", e);
      console.error("Original string:", lineItems);
      parseError = "Failed to display line items. Data is not in a recognized format.";
    }
  } else if (Array.isArray(lineItems)) {
    parsedItems = lineItems;
  }

  const formatHeader = (key) => {
    const result = key.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
  };

  const headers = parsedItems.length > 0 ? Object.keys(parsedItems[0]) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Line Items</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-2xl font-bold">&times;</button>
        </div>
        <div className="p-4 overflow-auto">
          {parseError ? (
            <div className="text-red-500">{parseError}</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {headers.map((key) => (
                    <th key={key} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {formatHeader(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {parsedItems.map((item, index) => (
                  <tr key={index}>
                    {headers.map((header) => (
                      <td key={`${index}-${header}`} className="px-6 py-4 whitespace-normal text-sm text-gray-500 dark:text-gray-400 break-words">
                        {String(item[header] === null ? 'N/A' : item[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default LineItemsModal; 