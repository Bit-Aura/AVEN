'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DiagnosticChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to PathFinder. To build your deterministic skill graph, tell me: what role are you aiming for, and how many hours per week can you dedicate?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      
      if (data.isComplete) {
        // Redirect to dashboard once diagnostic is complete
        router.push('/learner');
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'assistant', content: '[Error connecting to Diagnoser Agent]' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg text-neo-text flex flex-col p-4 md:p-8">
      <header className="mb-8 border-b-4 border-black pb-4">
        <h1 className="text-3xl font-black uppercase">Initial Diagnostic</h1>
        <p className="text-lg font-bold">Diagnoser Agent is parsing your cold-start baseline.</p>
      </header>
      
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full gap-6">
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 border-4 border-black p-4 bg-white shadow-brutal">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] border-4 border-black p-4 font-bold text-lg ${msg.role === 'user' ? 'bg-neo-blue text-white shadow-brutal' : 'bg-neo-yellow text-black shadow-brutal'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] border-4 border-black p-4 font-bold text-lg bg-neo-yellow text-black shadow-brutal animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="E.g., I want to be a Backend SWE and have 10 hours/week..."
            className="flex-1 border-4 border-black p-4 font-bold text-xl focus:outline-none focus:ring-4 focus:ring-neo-blue shadow-brutal-active"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="bg-neo-green border-4 border-black text-2xl font-black uppercase px-8 py-4 shadow-brutal hover:shadow-brutal-active hover:translate-y-1 hover:translate-x-1 transition-all disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
