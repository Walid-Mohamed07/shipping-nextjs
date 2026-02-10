"use client";

import React from "react";

import { useState, useEffect } from "react";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/app/context/AuthContext";
import { Mail, Send, X, Plus, Upload, Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { User } from "@/types";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName: string;
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

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "sent" | "read" | "unread"
  >("all");
  const [filterPriority, setFilterPriority] = useState<
    "all" | "normal" | "high" | "urgent"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    recipientEmail: "",
    recipientName: "",
    subject: "",
    message: "",
    priority: "normal" as const,
    attachments: [] as string[],
    links: [] as string[],
  });

  const [newLink, setNewLink] = useState("");
  const [newAttachment, setNewAttachment] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [messagesRes, usersRes] = await Promise.all([
          fetch("/api/messages"),
          fetch("/api/admin/users"),
        ]);

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          setMessages(messagesData);
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(
            usersData.map((u: any) => ({
              id: u.id,
              email: u.email,
              fullName: u.fullName,
              profilePicture: u.profilePicture || null,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const filteredMessages = messages.filter((msg) => {
    const matchesStatus = filterStatus === "all" || msg.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || msg.priority === filterPriority;
    const matchesSearch =
      msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.recipientName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const totalPages = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
  const paginatedMessages = filteredMessages.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.recipientEmail || !formData.subject || !formData.message) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          senderName: user?.name,
          senderEmail: user?.email,
          recipientEmail: formData.recipientEmail,
          recipientName: formData.recipientName,
          subject: formData.subject,
          message: formData.message,
          priority: formData.priority,
          attachments: formData.attachments,
          links: formData.links,
        }),
      });

      if (response.ok) {
        const newMessage = await response.json();
        setMessages([newMessage, ...messages]);
        setShowCompose(false);
        resetForm();
        alert("Message sent successfully!");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
    }
  };

  const resetForm = () => {
    setFormData({
      recipientEmail: "",
      recipientName: "",
      subject: "",
      message: "",
      priority: "normal",
      attachments: [],
      links: [],
    });
    setNewLink("");
    setNewAttachment("");
  };

  const addLink = () => {
    if (newLink.trim()) {
      setFormData({
        ...formData,
        links: [...formData.links, newLink.trim()],
      });
      setNewLink("");
    }
  };

  const removeLink = (index: number) => {
    setFormData({
      ...formData,
      links: formData.links.filter((_, i) => i !== index),
    });
  };

  const addAttachment = () => {
    if (newAttachment.trim()) {
      setFormData({
        ...formData,
        attachments: [...formData.attachments, newAttachment.trim()],
      });
      setNewAttachment("");
    }
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <span className="text-muted-foreground">Loading messages...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Messages
            </h1>
            <p className="text-muted-foreground">Send and receive messages</p>
          </div>
          <Button
            onClick={() => setShowCompose(!showCompose)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Send New Mail
          </Button>
        </div>

        {showCompose && (
          <Card className="p-6 mb-8 bg-muted/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Compose New Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Recipient *
                  </label>
                  <select
                    value={formData.recipientEmail}
                    onChange={(e) => {
                      const selected = users.find(
                        (u) => u.email === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        recipientEmail: e.target.value,
                        recipientName: selected?.fullName || "",
                      });
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    required
                  >
                    <option value="">Select recipient or add new...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.email}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Or Enter Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="external@example.com"
                    value={formData.recipientEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientEmail: e.target.value,
                        recipientName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  placeholder="Message subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Message *
                </label>
                <textarea
                  placeholder="Write your message here..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={6}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium mb-3">Add Links</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                  />
                  <Button
                    type="button"
                    onClick={addLink}
                    size="sm"
                    variant="outline"
                    className="gap-1 bg-transparent"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.links.map((link, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-sm"
                    >
                      <span className="truncate max-w-xs">{link}</span>
                      <button
                        type="button"
                        onClick={() => removeLink(idx)}
                        className="text-xs hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-medium mb-3">Add Attachments</h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="filename.pdf"
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
                  />
                  <Button
                    type="button"
                    onClick={addAttachment}
                    size="sm"
                    variant="outline"
                    className="gap-1 bg-transparent"
                  >
                    <Upload className="w-4 h-4" />
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-sm"
                    >
                      <span>{file}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-xs hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 gap-2">
                  <Send className="w-4 h-4" />
                  Send Message
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 bg-transparent"
                >
                  Clear
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4 mb-6 lg:grid-cols-4">
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
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="read">Read</option>
            <option value="unread">Unread</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-border rounded-lg bg-background"
          >
            <option value="all">All Priorities</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
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
              <p className="text-muted-foreground">No messages found</p>
            </Card>
          ) : (
            paginatedMessages.map((msg) => (
              <Card
                key={msg.id}
                className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/messages/${msg.id}`)}
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
                      {msg.message.substring(0, 100)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>To: {msg.recipientEmail}</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                      {msg.links.length > 0 && (
                        <span>📎 {msg.links.length} link(s)</span>
                      )}
                      {msg.attachments.length > 0 && (
                        <span>📎 {msg.attachments.length} file(s)</span>
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
