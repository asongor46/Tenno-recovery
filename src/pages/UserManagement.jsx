import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  UserPlus,
  Shield,
  MoreHorizontal,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import RoleGuard from "@/components/rbac/RoleGuard";
import PermissionBadge from "@/components/rbac/PermissionBadge";
import { useStandardToast } from "@/components/shared/useStandardToast";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import LoadingState from "@/components/shared/LoadingState";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deleteUser, setDeleteUser] = useState(null);
  const toast = useStandardToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    staleTime: 30000,
  });

  const { data: pendingApplications = [] } = useQuery({
    queryKey: ["pendingAgents"],
    queryFn: () => base44.entities.AgentProfile.filter({ status: "pending" }, "-applied_at"),
    staleTime: 30000,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => 
      base44.entities.User.update(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("User role updated");
    },
    onError: () => toast.error("Failed to update user role"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("User deleted");
      setDeleteUser(null);
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const approveAgentMutation = useMutation({
    mutationFn: async (profileId) => {
      const profile = pendingApplications.find(p => p.id === profileId);
      const currentUser = await base44.auth.me();
      
      await base44.entities.AgentProfile.update(profileId, {
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: currentUser.email,
      });
      
      // Generate email content for Outlook
      const emailSubject = encodeURIComponent("Your TENNO Agent Application - Approved!");
      const emailBody = encodeURIComponent(
        `Hi ${profile.full_name},\n\nGreat news! Your application to join TENNO Asset Recovery has been approved.\n\nYou can now access the agent dashboard:\n1. Go to our website\n2. Click "Agent Login"\n3. Sign in with your account\n\nWelcome to the team!\n\nBest regards,\nTENNO Asset Recovery`
      );
      const outlookLink = `https://outlook.office.com/mail/deeplink/compose?to=${profile.email}&subject=${emailSubject}&body=${emailBody}`;
      
      return { outlookLink };
    },
    onSuccess: ({ outlookLink }) => {
      queryClient.invalidateQueries({ queryKey: ["pendingAgents"] });
      toast.success("Agent approved");
      window.open(outlookLink, "_blank");
    },
    onError: () => toast.error("Failed to approve agent"),
  });

  const rejectAgentMutation = useMutation({
    mutationFn: (profileId) => 
      base44.entities.AgentProfile.update(profileId, {
        status: "rejected",
        rejection_reason: "Application did not meet our current requirements",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingAgents"] });
      toast.success("Application rejected");
    },
    onError: () => toast.error("Failed to reject application"),
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const adminCount = users.filter(u => u.role === "admin").length;
  const userCount = users.filter(u => u.role === "user").length;

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["admin"]}>
        <LoadingState message="Loading users..." />
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">User Management</h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">Manage user accounts and permissions</p>
            </div>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-slate-500">Total Users</p>
                </div>
                <Users className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{adminCount}</p>
                  <p className="text-sm text-slate-500">Administrators</p>
                </div>
                <Shield className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{userCount}</p>
                  <p className="text-sm text-slate-500">Standard Users</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pending Agent Applications ({pendingApplications.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.email}</TableCell>
                      <TableCell>{app.location}</TableCell>
                      <TableCell className="text-slate-500">
                        {format(new Date(app.applied_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveAgentMutation.mutate(app.id)}
                          >
                            ✓ Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => rejectAgentMutation.mutate(app.id)}
                          >
                            ✗ Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">
                              {user.full_name?.charAt(0) || "U"}
                            </span>
                          </div>
                          <span className="font-medium">{user.full_name || "Unknown"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <PermissionBadge role={user.role} />
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {user.created_date ? format(new Date(user.created_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                const newRole = user.role === "admin" ? "user" : "admin";
                                updateRoleMutation.mutate({ userId: user.id, role: newRole });
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Change to {user.role === "admin" ? "User" : "Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteUser(user)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteUser}
          onOpenChange={(open) => !open && setDeleteUser(null)}
          title="Delete User"
          description={`Are you sure you want to delete ${deleteUser?.full_name}? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteUserMutation.mutate(deleteUser.id)}
        />
      </div>
    </RoleGuard>
  );
}