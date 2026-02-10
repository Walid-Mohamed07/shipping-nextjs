"use client";

import { useState, useEffect } from "react";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/context/AuthContext";
import { Mail, Reply, Archive } from "lucide-react";
import { useRouter } from "next/navigation";

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
  attachments: string[];
  links: string[];
  createdAt: string;
  readAt: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function ProviderInboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "read" | "unread">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user || user.role !== "provider") {
      router.push("/login");
      return;
    }

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/messages?recipientEmail=${encodeURIComponent(user.email)}`,
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data);

          data.forEach((msg: Message) => {
            if (msg.status === "unread") {
              markAsRead(msg.id);
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user, router]);

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          status: "read",
          readAt: new Date().toISOString(),
        }),
      });

      setMessages(
        messages.map((m) =>
          m.id === messageId ? { ...m, status: "read" as const } : m,
        ),
      );
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus;
    const matchesSearch =
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">Loading inbox...</span>
          </div>
        </main>
      </div>
    );
  }

  if (selectedMessage) {
    return (
      <div className="min-h-screen bg-background">
        <Header />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            onClick={() => setSelectedMessage(null)}
            variant="outline"
            className="mb-6 bg-transparent"
          >
            ← Back to Inbox
          </Button>

          <Card className="p-8">
            <div className="border-b border-border pb-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {selectedMessage.subject}
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    From: {selectedMessage.senderName}
                  </p>
                </div>
                <span
                  className={`text-sm px-3 py-1 rounded ${
                    selectedMessage.priority === "urgent"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : selectedMessage.priority === "high"
                        ? "bg-orange-100 dark:bg-orange-900/30"
                        : "bg-gray-100 dark:bg-gray-900/30"
                  }`}
                >
                  {selectedMessage.priority}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  <p>
                    <strong>From:</strong> {selectedMessage.senderName} (
                    {selectedMessage.senderEmail})
                  </p>
                  <p className="mt-1">
                    <strong>Date:</strong>{" "}
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="whitespace-pre-wrap text-foreground text-lg leading-relaxed">
                {selectedMessage.message}
              </p>
            </div>

            {(selectedMessage.links.length > 0 ||
              selectedMessage.attachments.length > 0) && (
              <div className="border-t border-border pt-6 mb-6">
                {selectedMessage.links.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Links</h3>
                    <div className="space-y-2">
                      {selectedMessage.links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:underline break-all"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMessage.attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Attachments</h3>
                    <div className="space-y-1">
                      {selectedMessage.attachments.map((file, idx) => (
                        <p key={idx} className="text-foreground">
                          📎 {file}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-border">
              <Button className="gap-2">
                <Reply className="w-4 h-4" />
                Reply to Message
              </Button>
              <Button variant="outline" className="gap-2 bg-transparent">
                <Archive className="w-4 h-4" />
                Archive
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Provider Inbox
          </h1>
          <p className="text-muted-foreground">
            Messages sent to you by clients and partners
          </p>
        </div>

        <div className="grid gap-4 mb-6 lg:grid-cols-3">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border rounded-lg bg-background"
          />

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border rounded-lg bg-background"
          >
            <option value="all">All Messages</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <div className="text-sm text-muted-foreground flex items-center">
            {filteredMessages.length} message
            {filteredMessages.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="space-y-2">
          {paginatedMessages.length === 0 ? (
            <Card className="p-12 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No messages in your inbox</p>
            </Card>
          ) : (
            paginatedMessages.map((msg) => (
              <Card
                key={msg.id}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                  msg.status === "unread"
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50"
                    : ""
                }`}
                onClick={() => setSelectedMessage(msg)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">
                        {msg.senderName}
                      </p>
                      {msg.status === "unread" && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          msg.priority === "urgent"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700"
                            : msg.priority === "high"
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700"
                              : "bg-gray-100 dark:bg-gray-900/30 text-gray-700"
                        }`}
                      >
                        {msg.priority}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium truncate">
                      {msg.subject}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {msg.message.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>From: {msg.senderEmail}</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                      {(msg.links.length > 0 || msg.attachments.length > 0) && (
                        <span>
                          📎 {msg.links.length + msg.attachments.length}{" "}
                          attachment(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="bg-transparent"
            >
              Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                onClick={() => setCurrentPage(page)}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={currentPage === page ? "" : "bg-transparent"}
              >
                {page}
              </Button>
            ))}

            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="bg-transparent"
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
