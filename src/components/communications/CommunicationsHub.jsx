import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Phone,
  MessageSquare,
  Search,
  Filter,
  Send,
  Archive,
  Clock,
  User,
} from "lucide-react";
import { format } from "date-fns";
import LoadingState from "@/components/shared/LoadingState";
import EmptyState from "@/components/shared/EmptyState";

export default function CommunicationsHub() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contactAttempts = [] } = useQuery({
    queryKey: ["allContactAttempts"],
    queryFn: () => base44.entities.ContactAttempt.list("-created_date", 100),
    staleTime: 60000,
  });

  const { data: portalMessages = [] } = useQuery({
    queryKey: ["allPortalMessages"],
    queryFn: () => base44.entities.PortalMessage.list("-created_date", 100),
    staleTime: 60000,
  });

  const filteredAttempts = contactAttempts.filter(a =>
    a.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.contact_method?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMessages = portalMessages.filter(m =>
    m.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.sender_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allCommunications = [
    ...filteredAttempts.map(a => ({ ...a, type: "contact_attempt" })),
    ...filteredMessages.map(m => ({ ...m, type: "portal_message" })),
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const unreadCount = portalMessages.filter(m => !m.is_read && m.sender_type === "client").length;

  const getIcon = (type, method) => {
    if (type === "contact_attempt") {
      if (method === "phone") return <Phone className="w-4 h-4" />;
      if (method === "email") return <Mail className="w-4 h-4" />;
      if (method === "text") return <MessageSquare className="w-4 h-4" />;
    }
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Communications Hub</h1>
          <p className="text-slate-500 mt-1">All client communications in one place</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Send className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{allCommunications.length}</p>
                <p className="text-sm text-slate-500">Total Messages</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-slate-500">Unread</p>
              </div>
              <Mail className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{contactAttempts.length}</p>
                <p className="text-sm text-slate-500">Contact Attempts</p>
              </div>
              <Phone className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{portalMessages.length}</p>
                <p className="text-sm text-slate-500">Portal Messages</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All ({allCommunications.length})
          </TabsTrigger>
          <TabsTrigger value="attempts">
            Contact Attempts ({filteredAttempts.length})
          </TabsTrigger>
          <TabsTrigger value="messages">
            Messages ({filteredMessages.length})
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-6">
          {allCommunications.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No communications yet"
              description="Communications will appear here as you contact clients"
            />
          ) : (
            allCommunications.map((item) => (
              <Card key={item.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      {getIcon(item.type, item.contact_method)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {item.type === "portal_message" ? item.sender_name : item.contact_method}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {item.type === "portal_message" ? "Message" : item.attempt_type}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {format(new Date(item.created_date), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {item.type === "portal_message" ? item.message : item.notes}
                      </p>
                      {item.type === "contact_attempt" && (
                        <Badge className="mt-2 text-xs" variant="secondary">
                          {item.result?.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="attempts" className="space-y-3 mt-6">
          {filteredAttempts.length === 0 ? (
            <EmptyState
              icon={Phone}
              title="No contact attempts"
              description="Contact attempts will appear here"
            />
          ) : (
          filteredAttempts.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    {getIcon("contact_attempt", attempt.contact_method)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium capitalize">{attempt.contact_method}</p>
                      <span className="text-xs text-slate-500">
                        {format(new Date(attempt.created_date), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{attempt.notes}</p>
                    <Badge className="mt-2 text-xs" variant="secondary">
                      {attempt.result?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-3 mt-6">
          {filteredMessages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No portal messages"
              description="Messages from clients will appear here"
            />
          ) : (
          filteredMessages.map((message) => (
            <Card key={message.id} className={!message.is_read ? "border-blue-200 bg-blue-50" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.sender_name}</p>
                        {!message.is_read && (
                          <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(message.created_date), "MMM d, h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{message.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}