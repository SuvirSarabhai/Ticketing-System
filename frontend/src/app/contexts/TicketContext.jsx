import { createContext, useContext, useState, useCallback } from 'react';
import { api, parseResponse } from '../utils/api';

const TicketContext = createContext(null);

export function TicketProvider({ children }) {
  const [tickets, setTickets]                 = useState([]);
  const [comments, setComments]               = useState({});    // { [ticketId]: Comment[] }
  const [assignmentRules, setAssignmentRules] = useState([]);
  const [autoCloseConfig, setAutoCloseConfig] = useState({ high: 24, medium: 48, low: 72 });
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);

  // ── Tickets ────────────────────────────────────────────────────────────────

  const fetchTickets = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status)  params.set('status',  filters.status);
      if (filters.urgency) params.set('urgency', filters.urgency);
      if (filters.search)  params.set('search',  filters.search);
      const query = params.toString();
      const res   = await api.get(`/api/tickets${query ? `?${query}` : ''}`);
      const data  = await parseResponse(res);
      setTickets(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTicket = useCallback(async (id) => {
    const res  = await api.get(`/api/tickets/${id}`);
    const data = await parseResponse(res);
    // Update local tickets array with the fresh version
    setTickets((prev) =>
      prev.some((t) => t.id === id)
        ? prev.map((t) => (t.id === id ? data : t))
        : [...prev, data]
    );
    return data;
  }, []);

  const createTicket = useCallback(async (ticketData) => {
    const res  = await api.post('/api/tickets', ticketData);
    const data = await parseResponse(res);
    setTickets((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateTicket = useCallback(async (id, updates) => {
    const res  = await api.patch(`/api/tickets/${id}`, updates);
    const data = await parseResponse(res);
    setTickets((prev) => prev.map((t) => (t.id === id ? data : t)));
    return data;
  }, []);

  const assignTicket = useCallback(async (ticketId, agentId) => {
    const res  = await api.post(`/api/tickets/${ticketId}/assign`, { agentId });
    const data = await parseResponse(res);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)));
    return data;
  }, []);

  const autoAssignTicket = useCallback(async (ticketId) => {
    const res  = await api.post(`/api/tickets/${ticketId}/auto-assign`, {});
    const data = await parseResponse(res);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)));
    return data;
  }, []);

  const resolveTicket = useCallback(async (ticketId) => {
    const res  = await api.post(`/api/tickets/${ticketId}/resolve`, {});
    const data = await parseResponse(res);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)));
    return data;
  }, []);

  const closeTicket = useCallback(async (ticketId) => {
    const res  = await api.post(`/api/tickets/${ticketId}/close`, {});
    const data = await parseResponse(res);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? data : t)));
    return data;
  }, []);

  // ── Comments ───────────────────────────────────────────────────────────────

  const fetchComments = useCallback(async (ticketId) => {
    const res  = await api.get(`/api/tickets/${ticketId}/comments`);
    const data = await parseResponse(res);
    setComments((prev) => ({ ...prev, [ticketId]: data }));
    return data;
  }, []);

  const addComment = useCallback(async (ticketId, content) => {
    const res  = await api.post(`/api/tickets/${ticketId}/comments`, { content });
    const data = await parseResponse(res);
    setComments((prev) => ({
      ...prev,
      [ticketId]: [...(prev[ticketId] || []), data],
    }));
    return data;
  }, []);

  // ── Admin config ───────────────────────────────────────────────────────────

  const fetchAssignmentRules = useCallback(async () => {
    const res  = await api.get('/api/config/assignment-rules');
    const data = await parseResponse(res);
    setAssignmentRules(data);
    return data;
  }, []);

  const updateAssignmentRules = useCallback(async (rules) => {
    const res  = await api.post('/api/config/assignment-rules', { rules });
    const data = await parseResponse(res);
    setAssignmentRules(data);
    return data;
  }, []);

  const fetchAutoCloseConfig = useCallback(async () => {
    const res  = await api.get('/api/config/auto-close');
    const data = await parseResponse(res);
    setAutoCloseConfig(data);
    return data;
  }, []);

  const updateAutoCloseConfig = useCallback(async (config) => {
    const res  = await api.put('/api/config/auto-close', config);
    const data = await parseResponse(res);
    setAutoCloseConfig(data);
    return data;
  }, []);

  const value = {
    // State
    tickets,
    comments,
    assignmentRules,
    autoCloseConfig,
    loading,
    error,

    // Ticket actions
    fetchTickets,
    fetchTicket,
    createTicket,
    updateTicket,
    assignTicket,
    autoAssignTicket,
    resolveTicket,
    closeTicket,

    // Comment actions
    fetchComments,
    addComment,

    // Admin config actions
    fetchAssignmentRules,
    updateAssignmentRules,
    fetchAutoCloseConfig,
    updateAutoCloseConfig,
  };

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
}

export function useTickets() {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used within TicketProvider');
  return ctx;
}
