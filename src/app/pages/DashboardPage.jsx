import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, LogOut, Settings, Search, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';


export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { tickets, fetchTickets } = useTickets();
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isAgent = user?.role === 'agent' || user?.role === 'admin';

  // Fetch tickets on mount — the server already role-filters them
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Client-side filter for the already role-filtered list from the server
  const userTickets = tickets;


  // Client-side search/filter on top of server-filtered list
  const filteredTickets = useMemo(() => {
    return userTickets.filter((ticket) => {
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || ticket.urgency === urgencyFilter;
      const matchesSearch =
        searchQuery === '' ||
        (ticket.ticket_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesUrgency && matchesSearch;
    });
  }, [userTickets, statusFilter, urgencyFilter, searchQuery]);


  const getStatusBadge = (status) => {
    const variants = {
      open: 'destructive',
      assigned: 'outline',
      in_progress: 'default',
      resolved: 'secondary',
      closed: 'secondary',
    };

    return (
      <Badge variant={variants[status]}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[urgency]} variant="outline">
        {urgency}
      </Badge>
    );
  };

  // API tickets have names joined in — no lookup helpers needed

  // Statistics
  const stats = useMemo(() => {
    return {
      open: userTickets.filter((t) => t.status === 'open').length,
      inProgress: userTickets.filter((t) => t.status === 'in_progress' || t.status === 'assigned').length,
      resolved: userTickets.filter((t) => t.status === 'resolved').length,
      closed: userTickets.filter((t) => t.status === 'closed').length,
    };
  }, [userTickets]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold">
                {user?.role === 'admin'
                  ? 'Admin Dashboard'
                  : user?.role === 'agent'
                    ? 'Agent Dashboard'
                    : 'User Dashboard'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome back, {user?.name}
              </p>
            </div>
            <div className="flex gap-2">
              {user?.role === 'admin' && (
                <Button variant="outline" onClick={() => navigate('/admin')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              )}
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Open</CardDescription>
              <CardTitle className="text-3xl">{stats.open}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Resolved</CardDescription>
              <CardTitle className="text-3xl">{stats.resolved}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Closed</CardDescription>
              <CardTitle className="text-3xl">{stats.closed}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={urgencyFilter} onValueChange={(value) => setUrgencyFilter(value)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => navigate('/tickets/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No tickets found</p>
                <Button onClick={() => navigate('/tickets/new')} className="mt-4">
                  Create Your First Ticket
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Status</TableHead>
                    {isAgent && <TableHead>Created By</TableHead>}
                    {isAgent && <TableHead>Assigned To</TableHead>}
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <TableCell>{ticket.ticket_number}</TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.title}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{ticket.category_name || '—'}</div>
                          <div className="text-gray-500 text-xs">{ticket.subcategory_name || '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getUrgencyBadge(ticket.urgency)}</TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      {isAgent && <TableCell>{ticket.created_by_name || '—'}</TableCell>}
                      {isAgent && <TableCell>{ticket.assigned_to_name || 'Unassigned'}</TableCell>}
                      <TableCell className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
