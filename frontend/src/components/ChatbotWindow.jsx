import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Send, Bot, User } from 'lucide-react';

export const ChatbotWindow = ({ isOpen, onClose }) => {
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Thank you for your question! I'm here to help with medication reminders, side effects, and wellness tips. This is a demo response.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-96 flex flex-col shadow-2xl border-2 border-magical-purple/30 bg-card/95 backdrop-blur-sm">
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
              className={`flex gap-3 ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-magical-purple/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-magical-purple" />
                </div>
              )}

              <div
                className={`max-w-[75%] p-3 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-magical-purple text-white ml-auto'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm">{message.content}</p>
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
            placeholder="Ask me anything about your wellness..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} size="sm" className="magical-button">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
