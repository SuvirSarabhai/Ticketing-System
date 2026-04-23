import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Plus, Trash2, Save, Settings } from 'lucide-react';
import { api, parseResponse } from '../utils/api';
import { toast } from 'sonner';

export default function AdminPage() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { updateAssignmentRules, updateAutoCloseConfig } = useTickets();

  const isAgent = user?.role === 'agent' || user?.role === 'admin';

  // Catalog + agent data fetched from API
  const [agents, setAgents]             = useState([]);
  const [categories, setCategories]     = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [allUsers, setAllUsers]         = useState([]);

  // Editable config state (initialised from API)
  const [rules, setRules]               = useState([]);
  const [closeConfig, setCloseConfig]   = useState({ high: 24, medium: 48, low: 72 });

  // Redirect if not agent/admin
  if (!isAgent) {
    navigate('/dashboard');
    return null;
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [ag, ca, sub, us, ru, ac] = await Promise.all([
          parseResponse(await api.get('/api/users/agents')),
          parseResponse(await api.get('/api/categories')),
          parseResponse(await api.get('/api/subcategories')),
          parseResponse(await api.get('/api/users')),
          parseResponse(await api.get('/api/config/assignment-rules')),
          parseResponse(await api.get('/api/config/auto-close')),
        ]);
        setAgents(ag          || []);
        setCategories(ca      || []);
        setSubcategories(sub  || []);
        setAllUsers(us        || []);
        setRules(ru           || []);
        setCloseConfig(ac     || { high: 24, medium: 48, low: 72 });
      } catch (err) {
        console.error('AdminPage load error:', err);
      }
    }
    loadData();
  }, []);

  const handleAddRule = () => {
    const newRule = {
      id:             `temp-${Date.now()}`,
      assignToUserId: agents[0]?.id || '',
      priority:       rules.length + 1,
    };
    setRules([...rules, newRule]);
  };

  const handleUpdateRule = (ruleId, updates) => {
    setRules(rules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule)));
  };

  const handleDeleteRule = (ruleId) => {
    setRules(rules.filter((rule) => rule.id !== ruleId));
  };

  const handleSaveRules = async () => {
    try {
      // Map local rule objects to the API shape (camelCase -> snake expected by config route)
      const payload = rules.map((r) => ({
        categoryId:    r.categoryId    || r.category_id    || null,
        subcategoryId: r.subcategoryId || r.subcategory_id || null,
        urgency:       r.urgency       || null,
        assignToUserId: r.assignToUserId || r.assign_to_user_id,
        priority:      r.priority,
      }));
      await updateAssignmentRules(payload);
      toast.success('Assignment rules saved successfully');
    } catch (err) {
      toast.error('Failed to save rules: ' + err.message);
    }
  };

  const handleSaveCloseConfig = async () => {
    try {
      await updateAutoCloseConfig(closeConfig);
      toast.success('Auto-close configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save config: ' + err.message);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-8 w-8" />
          <div>
            <h1 className="text-3xl">Admin Settings</h1>
            <p className="text-gray-600">Manage assignment rules and system configuration</p>
          </div>
        </div>

        <Tabs defaultValue="assignment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="assignment">Assignment Rules</TabsTrigger>
            <TabsTrigger value="autoclose">Auto-Close Settings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Assignment Rules Tab */}
          <TabsContent value="assignment" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Automatic Assignment Rules</CardTitle>
                <CardDescription>
                  Define rules for automatically assigning tickets to agents based on category,
                  subcategory, and urgency. Rules are evaluated in priority order (lower number = higher priority).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Priority</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Subcategory</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead>Assign To</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-600 py-8">
                            No assignment rules configured. Add one below.
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules
                          .sort((a, b) => a.priority - b.priority)
                          .map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={rule.priority}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, {
                                      priority: parseInt(e.target.value) || 1,
                                    })
                                  }
                                  className="w-16"
                                  min="1"
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={rule.categoryId || 'any'}
                                  onValueChange={(value) =>
                                    handleUpdateRule(rule.id, {
                                      categoryId: value === 'any' ? undefined : value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Category</SelectItem>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={rule.subcategoryId || 'any'}
                                  onValueChange={(value) =>
                                    handleUpdateRule(rule.id, {
                                      subcategoryId: value === 'any' ? undefined : value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Subcategory</SelectItem>
                                    {subcategories
                                      .filter((sub) => !rule.categoryId || sub.category_id === rule.categoryId)
                                      .map((sub) => (
                                        <SelectItem key={sub.id} value={sub.id}>
                                          {sub.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={rule.urgency || 'any'}
                                  onValueChange={(value) =>
                                    handleUpdateRule(rule.id, {
                                      urgency: value === 'any' ? undefined : value,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="any">Any Urgency</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={rule.assignToUserId}
                                  onValueChange={(value) =>
                                    handleUpdateRule(rule.id, { assignToUserId: value })
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents.map((agent) => (
                                      <SelectItem key={agent.id} value={agent.id}>
                                        {agent.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRule(rule.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleAddRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                  <Button onClick={handleSaveRules}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Rules
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Auto-Close Settings Tab */}
          <TabsContent value="autoclose" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Auto-Close Configuration</CardTitle>
                <CardDescription>
                  Configure how long to wait before automatically closing resolved tickets.
                  If users don't respond within this timeframe, tickets will be closed automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="high-urgency">
                      <Badge className="bg-red-100 text-red-800 mb-2" variant="outline">
                        High Urgency
                      </Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="high-urgency"
                        type="number"
                        value={closeConfig.high}
                        onChange={(e) =>
                          setCloseConfig({ ...closeConfig, high: parseInt(e.target.value) || 24 })
                        }
                        min="1"
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">hours</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {closeConfig.high} hours after resolution
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medium-urgency">
                      <Badge className="bg-yellow-100 text-yellow-800 mb-2" variant="outline">
                        Medium Urgency
                      </Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="medium-urgency"
                        type="number"
                        value={closeConfig.medium}
                        onChange={(e) =>
                          setCloseConfig({ ...closeConfig, medium: parseInt(e.target.value) || 48 })
                        }
                        min="1"
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">hours</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {closeConfig.medium} hours after resolution
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="low-urgency">
                      <Badge className="bg-green-100 text-green-800 mb-2" variant="outline">
                        Low Urgency
                      </Badge>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="low-urgency"
                        type="number"
                        value={closeConfig.low}
                        onChange={(e) =>
                          setCloseConfig({ ...closeConfig, low: parseInt(e.target.value) || 72 })
                        }
                        min="1"
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">hours</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Current: {closeConfig.low} hours after resolution
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveCloseConfig}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  View all system users. In a production system, admins would be able to invite new users
                  and manage permissions here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.role === 'admin'
                                ? 'default'
                                : u.role === 'agent'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.department || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4">
                  <Button variant="outline" disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite User (V2 Feature)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
