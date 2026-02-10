"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Reply,
  Link as LinkIcon,
  FileText,
  Send,
} from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";

interface Attachment {
  id: string;
  type: "link" | "file";
  name: string;
  url: string;
}

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
  attachments?: Attachment[];
  createdAt: string;
  readAt: string | null;
  replies?: Message[];
}

export default function MessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch(`/api/messages/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setMessage(data);

          // Mark as read if recipient is viewing
          if (user?.email === data.recipientEmail && data.status !== "read") {
            await fetch(`/api/messages/${params.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "read" }),
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch message:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [params.id, user?.email]);

  const handleSendReply = async () => {
    if (!replyText.trim() || !user?.email || !message) return;

    try {
      setSending(true);
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user.id || "user-" + Date.now(),
          senderName: user.fullName || user.name || "User",
          senderEmail: user.email,
          recipientEmail: message.senderEmail,
          subject: `Re: ${message.subject}`,
          message: replyText,
          priority: "normal",
          parentMessageId: message.id,
        }),
      });

      if (response.ok) {
        setReplyText("");
        setShowReplyForm(false);
        alert("Reply sent successfully!");
        // Refresh message to show reply
        const updated = await fetch(`/api/messages/${params.id}`);
        if (updated.ok) {
          const data = await updated.json();
          setMessage(data);
        }
      }
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Loading message...</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="outline"
            onClick={() => router.push("/messages")}
            className="mb-4 gap-2 bg-transparent"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Messages
          </Button>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Message not found</p>
          </Card>
        </div>
      </div>
    );
  }

  const priorityColors = {
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="outline"
          onClick={() => router.push("/messages")}
          className="mb-6 gap-2 bg-transparent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Messages
        </Button>

        <Card className="p-6 mb-6">
          {/* Message Header */}
          <div className="border-b border-border pb-4 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{message.subject}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {message.senderName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{message.senderName}</p>
                    <p className="text-sm text-muted-foreground">
                      {message.senderEmail}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${priorityColors[message.priority]}`}
                >
                  {message.priority.charAt(0).toUpperCase() +
                    message.priority.slice(1)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(message.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Message Body */}
          <div className="mb-6 whitespace-pre-wrap leading-relaxed text-foreground">
            {message.message}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-6 border-t border-border pt-6">
              <h3 className="font-semibold mb-4">Attachments & Links</h3>
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    {attachment.type === "link" ? (
                      <LinkIcon className="w-5 h-5 text-blue-500" />
                    ) : (
                      <FileText className="w-5 h-5 text-orange-500" />
                    )}
                    <span className="text-sm font-medium text-blue-600 hover:underline">
                      {attachment.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Reply Button */}
          {!showReplyForm && (
            <Button onClick={() => setShowReplyForm(true)} className="gap-2">
              <Reply className="w-4 h-4" />
              Reply to Message
            </Button>
          )}
        </Card>

        {/* Reply Form */}
        {showReplyForm && (
          <Card className="p-6 bg-muted/50">
            <h3 className="font-semibold mb-4">
              Reply to {message.senderName}
            </h3>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply here..."
              className="w-full px-3 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground mb-4 resize-none"
              rows={6}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSendReply}
                disabled={!replyText.trim() || sending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {sending ? "Sending..." : "Send Reply"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText("");
                }}
                className="bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Reply Thread */}
        {message.replies && message.replies.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold mb-4">
              Replies ({message.replies.length})
            </h3>
            <div className="space-y-4">
              {message.replies.map((reply) => (
                <Card key={reply.id} className="p-4 bg-muted/30">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                      {reply.senderName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{reply.senderName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {reply.message}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
