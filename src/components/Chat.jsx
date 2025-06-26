import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Message = {
  id: Number,
  content: String,
  isUser: Boolean,
  timestamp: Date,
  isError: Boolean,
};

const sampleQueries = [
  "For each invoice, show the related purchase order.",
  "What is the total value of all purchase orders from po_collection?",
  "List all Vendors."
];

export default function Chat() {
  const baseUrl = import.meta.env.VITE_CHAT_BASE_URL;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        content: data.response || data.error || 'Sorry, I encountered an error.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Failed to get response from the server. Please try again.',
        isUser: false,
        timestamp: new Date(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSampleQueryClick = (query) => {
    sendMessage(query);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
  };

  // // Cleanup on unmount
  // useEffect(() => {
  //   return () => {
  //     // Close session when component unmounts
  //     fetch(`${baseUrl}/close-session`, { method: 'POST' }).catch(console.error);
  //   };
  // }, []);

  return (
    <div className="flex flex-col h-full bg-background text-foreground relative">
      {/* Theme Toggle Button */}
      
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <h1 className="text-xl font-semibold">Reconciliation Chat</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2 max-w-3xl mx-auto w-full">
              <h2 className="text-2xl font-bold text-foreground">How can I help you today?</h2>
              <p className="mb-8">Ask me anything, or start with an example below.</p>
              
              <div 
                className="w-full overflow-hidden group"
                style={{ maskImage: 'linear-gradient(to right, transparent 0, black 10%, black 90%, transparent 100%)'}}
              >
                <div className="flex flex-nowrap animate-scroll group-hover:[animation-play-state:paused]">
                    {[...sampleQueries, ...sampleQueries].map((query, index) => (
                      <div 
                        key={index} 
                        className="bg-secondary p-4 rounded-lg cursor-pointer flex-shrink-0 w-[250px] text-left hover:bg-primary/10 transition-colors text-card-foreground mx-2"
                        onClick={() => handleSampleQueryClick(query)}
                      >
                        <p className="text-sm font-medium">{query}</p>
                      </div>
                    ))}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 w-full">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[80%] ${
                    message.isUser ? 'flex-row-reverse' : 'flex-row'
                  } ${message.isError ? 'w-full' : ''}`}
                >
                  {!message.isError && (
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                      }`}
                    >
                      {message.isUser ? <User size={16} /> : <Bot size={16} />}
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      message.isError 
                        ? 'bg-destructive/45 border border-destructive/100 rounded-lg w-full' 
                        : message.isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-secondary text-foreground rounded-tl-none'
                    }`}
                  >
                    {/* <p className="whitespace-pre-wrap">{message.content}</p> */}
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                    <div
                      className={`text-xs mt-1 ${
                        message.isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-lg bg-secondary rounded-tl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <footer className="border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
        <p className="text-xs text-center text-muted-foreground mt-2">
        Reconcilation Chat may produce inaccurate information about people, places, or facts.
        </p>
      </footer>
    </div>
  );
}