import React, { useState, useEffect } from "react";
import LineItemsModal from './LineItemsModal';
import { useWebSocket } from './WebSocketProvider'; // Import the hook

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // return original string if formatting fails
  }
};

const HumanReview = () => {
  const { lastMessage, isConnected } = useWebSocket(); // Use the shared WebSocket context
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState({});
  const [ruleInputs, setRuleInputs] = useState({});
  const [comments, setComments] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLineItems, setSelectedLineItems] = useState([]);

  useEffect(() => {
    const fetchPendingReviews = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/reviews/pending`);
        if (!response.ok) {
          throw new Error('Failed to fetch pending reviews');
        }
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingReviews();
  }, []);
  
  // Listen for messages from the shared WebSocket
  useEffect(() => {
    if (lastMessage) {
      try {
        const msg = JSON.parse(lastMessage.data);

        // A new review is available
        if (msg.type === 'new_review' && msg.data) {
          setReviews(prevReviews => [msg.data, ...prevReviews]);
        }
        
        // A review has been completed
        if (msg.type === 'completed_review' && msg.data) {
          setReviews(prevReviews => 
            prevReviews.filter(r => r.request_id !== msg.data.request_id)
          );
        }
        
        // Initial set of reviews on connection
        if (msg.type === 'initial_reviews' && msg.data) {
          setReviews(msg.data);
        }

      } catch (e) {
        console.error("Error parsing WebSocket message in HumanReview:", e);
      }
    }
  }, [lastMessage]);

  const handleViewLineItems = (lineItems) => {
    setSelectedLineItems(lineItems);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLineItems([]);
  };

  const handleInputChange = (id, value) => {
    setRuleInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleCommentsChange = (id, value) => {
    setComments((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (reviewId, decision, reasoning) => {
    setSubmitting((prev) => ({ ...prev, [reviewId]: true }));
    try {
      await fetch(`${API_BASE_URL}/api/reviews/${reviewId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reasoning,
          reviewer_id: "user123" // Example user
        }),
      });
      // The websocket message `completed_review` will handle removal from the UI
    } catch (err) {
      console.error("Failed to submit review:", err);
    }
    setSubmitting((prev) => ({ ...prev, [reviewId]: false }));
  };

  if (loading) return <div className="p-4">Loading reviews...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="h-full w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Human Review Queue</h1>
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 text-sm font-bold rounded-full ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            WS: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vendor Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PO Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {reviews.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No pending reviews.
                </td>
              </tr>
            )}
            {reviews.map((review) => (
              <tr key={review.request_id}>
                <td className="px-6 py-4 align-top">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{review.title}</div>
                  <div className="text-xs text-gray-400 mt-1 mb-2">ID: {review.request_id}</div>
                  <button
                    onClick={() => handleViewLineItems(review.data.line_items)}
                    className="text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline text-sm my-2"
                    disabled={!review.data.line_items || review.data.line_items.length === 0}
                  >
                    View Line Items
                  </button>
                  {Array.isArray(review.description) ? (
                    <div className="flex flex-col gap-1 mt-2">
                      {review.description.map((desc, index) => (
                        <div key={index} className="p-1.5 bg-orange-100 border border-orange-200 text-orange-800 text-xs rounded-md">
                          {desc}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-1.5 bg-orange-100 border border-orange-200 text-orange-800 text-xs rounded-md">
                          {review.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{review.data.invoice_number}</td>
                <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(review.data.invoice_date)}</td>
                <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{review.data.vendor_name}</td>
                <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${review.data.invoice_amount}</td>
                <td className="px-6 py-4 align-top whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{review.data.po_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <textarea 
                      placeholder="Add comments..."
                      className="w-full p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={comments[review.request_id] || ''}
                      onChange={(e) => handleCommentsChange(review.request_id, e.target.value)}
                      rows="1"
                    />
                    <textarea 
                      placeholder="Define new business rule (optional)..."
                      className="w-full p-2 border rounded-md text-sm bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={ruleInputs[review.request_id] || ''}
                      onChange={(e) => handleInputChange(review.request_id, e.target.value)}
                      rows="1"
                    />
                    <div className="flex gap-2">
                      {review.required_decision.map(decision => (
                        <button
                          key={decision}
                          onClick={() => handleSubmit(review.request_id, decision, comments[review.request_id] || `${decision} via UI`)}
                          disabled={submitting[review.request_id]}
                          className={`px-3 py-1 text-sm font-medium rounded-md text-white ${
                            decision.toLowerCase() === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                            decision.toLowerCase() === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                            'bg-yellow-500 hover:bg-yellow-600'
                          } disabled:opacity-50`}
                        >
                          {submitting[review.request_id] ? 'Submitting...' : decision}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LineItemsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        lineItems={selectedLineItems}
      />
    </div>
  );
};

export default HumanReview; 