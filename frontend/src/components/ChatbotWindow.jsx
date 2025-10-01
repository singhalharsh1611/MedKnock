import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Bot, User, Mic } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export const ChatbotWindow = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: '1',
      content:
        "Hello! I'm your AI wellness assistant. How can I help you with your medication journey today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef(null);
  const [isListening, setIsListening] = useState(false); //for speech to text
  const speechInputRef = useRef(false); //refrence to track if speech is used

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollableView = scrollAreaRef.current.querySelector('div');
      if (scrollableView) {
        scrollableView.scrollTop = scrollableView.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${backendUrl}/api/v1/chatbot`,
        { question: inputValue, history: messages },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const botMessage = {
        id: (Date.now() + 1).toString(),
        content: response.data.answer,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    }
    catch (error) {
      console.error("Error fetching bot response:", error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "My apologies, the connection to the arcane realm has failed. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
    finally {
      setIsLoading(false);
    }
  };

  //for auto submit when speech stops
  useEffect(() => {
    if (!isListening && speechInputRef.current) {
      handleSendMessage();
      speechInputRef.current = false; 
    }
  }, [isListening]);

   const handleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => {
      speechInputRef.current=true;
      setIsListening(true);
    }
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      speechInputRef.current=false;
    }
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setInputValue(transcript);
    };
    recognition.start();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-[90vw] max-w-md h-[80vh] flex flex-col shadow-2xl border-2 border-magical-purple/30 bg-card/95 backdrop-blur-sm sm:w-96 sm:h-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-magical-purple/20 to-magical-blue/20 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-magical-purple" />
          <h3 className="font-semibold text-foreground">AI Wellness Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-magical-purple/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-magical-purple" />
                </div>
              )}

              <div
                className={`max-w-[75%] p-3 rounded-lg ${message.sender === 'user'
                  ? 'bg-magical-purple text-white ml-auto'
                  : 'bg-muted text-foreground'
                  }`}
              >
                <div className="text-sm prose dark:prose-invert">
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-magical-gold/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-magical-gold" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Ask me about your wellness..."}
            className="flex-1"
          />
          <Button onClick={handleListen} size="icon" variant="outline" disabled={isLoading || isListening}>
            <Mic className={`h-4 w-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
          </Button>
          <Button onClick={handleSendMessage} size="sm" className="magical-button">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
