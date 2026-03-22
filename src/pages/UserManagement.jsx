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
import InviteAgentDialog from "@/components/admin/InviteAgentDialog";
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

  const suspendAgentMutation = useMutation({
    mutationFn: async (profileId) => {
      const profile = allProfiles.find(p => p.id === profileId);
      const isSuspended = profile?.plan_status === "suspended";
      return base44.entities.AgentProfile.update(profileId, {
        plan_status: isSuspended ? "active" : "suspended",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allAgentProfiles"] });
      toast.success("Agent status updated");
    },
    onError: () => toast.error("Failed to update agent status"),
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

  // MRR calculation from AgentProfile plans
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["allAgentProfiles"],
    queryFn: () => base44.entities.AgentProfile.list(),
    staleTime: 30000,
  });
  const starterAgents = allProfiles.filter(p => !p.plan || p.plan === "starter").length;
  const proAgents = allProfiles.filter(p => p.plan === "pro").length;
  const mrr = starterAgents * 50 + proAgents * 97;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div>
                <p className="text-2xl font-bold">{starterAgents}</p>
                <p className="text-sm text-slate-500">Starter × $50</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-2xl font-bold text-amber-600">{proAgents}</p>
                <p className="text-sm text-slate-500">Pro × $97</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-2xl font-bold text-emerald-600">${mrr.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Monthly MRR</p>
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <TableHead>Agent</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 && searchQuery ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No users match your search
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const agentProfile = allProfiles.find(p => p.email === user.email);
                    return (
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
                        {agentProfile ? (
                          <Badge className={agentProfile.plan === "pro" ? "bg-amber-100 text-amber-700 border-0" : "bg-slate-100 text-slate-600 border-0"}>
                            {agentProfile.plan || "starter"}
                          </Badge>
                        ) : (
                          <PermissionBadge role={user.role} />
                        )}
                      </TableCell>
                      <TableCell>
                        {agentProfile ? (
                          <Badge className={
                            agentProfile.plan_status === "active" ? "bg-green-100 text-green-700 border-0" :
                            agentProfile.plan_status === "past_due" ? "bg-red-100 text-red-700 border-0" :
                            "bg-slate-100 text-slate-500 border-0"
                          }>
                            {agentProfile.plan_status || "active"}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-0">—</Badge>
                        )}
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
                           {agentProfile && (
                             <DropdownMenuItem
                               onClick={() => suspendAgentMutation.mutate(agentProfile.id)}
                             >
                               <Shield className="w-4 h-4 mr-2" />
                               {agentProfile.plan_status === "suspended" ? "Unsuspend Agent" : "Suspend Agent"}
                             </DropdownMenuItem>
                           )}
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
                  );
                  }))
                }
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