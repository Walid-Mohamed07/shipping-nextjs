"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  message: string;
  status: "sent" | "read" | "unread";
  priority: "normal" | "high" | "urgent";
  createdAt: string;
  readAt: string | null;
}

export function MessageNotification() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!user?.email) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/messages?recipientEmail=${encodeURIComponent(user.email)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-muted rounded-lg transition-colors"
      >
        <Mail className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Messages
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No messages
              </div>
            ) : (
              <div className="divide-y divide-border">
                {messages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 hover:bg-muted/50 transition-colors ${
                      msg.status === "unread"
                        ? "bg-blue-50 dark:bg-blue-950/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {msg.senderName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {msg.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(msg.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {msg.status === "unread" && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border">
            <Link href="/messages" className="w-full">
              <Button
                className="w-full bg-transparent"
                variant="outline"
                size="sm"
              >
                Go to Messages
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
