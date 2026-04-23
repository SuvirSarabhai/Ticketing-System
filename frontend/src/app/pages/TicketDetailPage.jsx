import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ArrowLeft, Clock, User, MessageSquare, CheckCircle, XCircle, Send } from 'lucide-react';
import { api, parseResponse } from '../utils/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const {
    fetchTicket,
    fetchComments,
    addComment,
    updateTicket,
    assignTicket,
    resolveTicket,
    closeTicket,
    tickets,
    comments: allComments,
  } = useTickets();

  const [agents, setAgents]                     = useState([]);
  const [selectedAgent, setSelectedAgent]         = useState('unassigned');
  const [newComment, setNewComment]               = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [loadingTicket, setLoadingTicket]         = useState(true);

  const isAgent = user?.role === 'agent' || user?.role === 'admin';

  // Fetch ticket, comments, and agent list on mount
  useEffect(() => {
    async function load() {
      setLoadingTicket(true);
      try {
        await fetchTicket(id);
        await fetchComments(id);
        if (isAgent) {
          const res   = await api.get('/api/users/agents');
          const data  = await parseResponse(res);
          setAgents(data || []);
        }
      } catch (err) {
        console.error('Failed to load ticket:', err);
      } finally {
        setLoadingTicket(false);
      }
    }
    load();
  }, [id, isAgent]);

  const ticket   = tickets.find((t) => t.id === id);
  const comments = allComments[id] || [];

  // Sync the agent picker to current assigned_to when ticket loads
  useEffect(() => {
    if (ticket) setSelectedAgent(ticket.assigned_to || 'unassigned');
  }, [ticket?.assigned_to]);


  if (loadingTicket) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center py-20 text-gray-500">Loading ticket...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Ticket not found</p>
              <Button onClick={() => navigate('/dashboard')} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addComment(ticket.id, newComment);
      setNewComment('');
    } catch (err) {
      alert('Failed to add comment: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      if (newStatus === 'resolved') {
        await resolveTicket(ticket.id);
      } else if (newStatus === 'closed') {
        await closeTicket(ticket.id);
      } else {
        await updateTicket(ticket.id, { status: newStatus });
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleAssign = async (agentId) => {
    try {
      await assignTicket(ticket.id, agentId === 'unassigned' ? null : agentId);
      toast.success('Ticket assigned successfully');
    } catch (err) {
      toast.error('Failed to assign: ' + err.message);
    }
  };

  const canModifyTicket = isAgent || ticket.created_by === user?.id;


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Header */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{ticket.ticket_number}</Badge>
                      {getUrgencyBadge(ticket.urgency)}
                      {getStatusBadge(ticket.status)}
                    </div>
                    <CardTitle className="text-2xl">{ticket.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4" />
                  {ticket.created_at
                    ? <>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</>
                    : 'Just created'
                  }
                  {ticket.resolved_at && (
                    <>
                      {' • Resolved in '}
                      {Math.floor((ticket.resolution_time || 0) / 60)} hours
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm mb-2">Description</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                  </div>

                  {ticket.subcategory_form_fields && Object.keys(ticket.form_data || {}).length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm mb-3">Additional Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {ticket.subcategory_form_fields.map((field) => {
                            const value = (ticket.form_data || {})[field.id];
                            if (!value) return null;
                            
                            return (
                              <div key={field.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                                <div className="text-sm">{value}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Activity &amp; Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No comments yet</p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const name     = comment.user_name || 'Unknown';
                      const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar>
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm">{comment.user_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {comment.user_role}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {comment.created_at
                                  ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })
                                  : ''}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 text-sm">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {ticket.status !== 'closed' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || isSubmittingComment}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Company</div>
                  <div className="text-sm">{ticket.company_name || '—'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Domain</div>
                  <div className="text-sm">{ticket.domain_name || '—'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Category</div>
                  <div className="text-sm">{ticket.category_name || '—'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Subcategory</div>
                  <div className="text-sm">{ticket.subcategory_name || '—'}</div>
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-gray-500 mb-1">Created By</div>
                  <div className="text-sm flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {ticket.created_by_name}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions (Agent/Admin only) */}
            {isAgent && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">

                  {/* Assign — inline agent picker */}
                  {ticket.status !== 'closed' && (
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">Assign To Agent</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Select
                            value={selectedAgent}
                            onValueChange={(val) => setSelectedAgent(val)}
                            disabled={ticket.status === 'closed'}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.name} ({agent.department || agent.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="outline"
                          className="shrink-0"
                          onClick={() => handleAssign(selectedAgent)}
                          disabled={ticket.status === 'closed'}
                        >
                          <User className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                    <Button
                      className="w-full"
                      onClick={() => resolveTicket(ticket.id)}
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </Button>
                  )}

                  {ticket.status === 'resolved' && (
                    <Button
                      className="w-full"
                      onClick={() => closeTicket(ticket.id)}
                      variant="secondary"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Close Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* User confirmation (if resolved) */}
            {!isAgent && ticket.status === 'resolved' && ticket.created_by === user?.id && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Confirm Resolution</CardTitle>
                  <CardDescription>
                    Has your issue been resolved?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => closeTicket(ticket.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Yes, Close Ticket
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => updateTicket(ticket.id, { status: 'in_progress' })}
                  >
                    Not Yet, Reopen
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
