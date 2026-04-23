// Mock companies
export const mockCompanies = [
  { id: 'c1', name: 'Acme Corporation' },
  { id: 'c2', name: 'TechStart Inc' },
  { id: 'c3', name: 'Global Solutions Ltd' },
];

// Mock domains (industries)
export const mockDomains = [
  { id: 'd1', name: 'Technology' },
  { id: 'd2', name: 'Finance' },
  { id: 'd3', name: 'Healthcare' },
  { id: 'd4', name: 'Manufacturing' },
];

// Mock categories (departments)
export const mockCategories = [
  { id: 'cat1', name: 'IT Support', domainId: 'd1' },
  { id: 'cat2', name: 'HR', domainId: 'd1' },
  { id: 'cat3', name: 'Facilities', domainId: 'd1' },
  { id: 'cat4', name: 'Finance', domainId: 'd2' },
  { id: 'cat5', name: 'Payroll', domainId: 'd2' },
  { id: 'cat6', name: 'Medical Equipment', domainId: 'd3' },
];

// Mock subcategories with dynamic forms
export const mockSubcategories = [
  {
    id: 'sub1',
    name: 'Software Bug',
    categoryId: 'cat1',
    formFields: [
      { id: 'f1', label: 'Software Version', type: 'text', required: true },
      { id: 'f2', label: 'Operating System', type: 'select', required: true, options: ['Windows', 'macOS', 'Linux'] },
      { id: 'f3', label: 'Steps to Reproduce', type: 'textarea', required: true },
      { id: 'f4', label: 'Expected Behavior', type: 'textarea', required: false },
    ],
  },
  {
    id: 'sub2',
    name: 'Hardware Issue',
    categoryId: 'cat1',
    formFields: [
      { id: 'f5', label: 'Asset Tag', type: 'text', required: true },
      { id: 'f6', label: 'Device Model', type: 'text', required: true },
      { id: 'f7', label: 'Location', type: 'text', required: true },
      { id: 'f8', label: 'Error Message', type: 'textarea', required: false },
    ],
  },
  {
    id: 'sub3',
    name: 'Network/Connectivity',
    categoryId: 'cat1',
    formFields: [
      { id: 'f9', label: 'Location', type: 'text', required: true },
      { id: 'f10', label: 'Device Type', type: 'select', required: true, options: ['Desktop', 'Laptop', 'Mobile', 'Other'] },
      { id: 'f11', label: 'Connection Type', type: 'select', required: false, options: ['WiFi', 'Ethernet', 'VPN'] },
    ],
  },
  {
    id: 'sub4',
    name: 'Payroll Issue',
    categoryId: 'cat5',
    formFields: [
      { id: 'f12', label: 'Employee ID', type: 'text', required: true },
      { id: 'f13', label: 'Pay Period', type: 'date', required: true },
      { id: 'f14', label: 'Amount Affected', type: 'number', required: true },
      { id: 'f15', label: 'Issue Details', type: 'textarea', required: true },
    ],
  },
  {
    id: 'sub5',
    name: 'Leave Request',
    categoryId: 'cat2',
    formFields: [
      { id: 'f16', label: 'Employee ID', type: 'text', required: true },
      { id: 'f17', label: 'Leave Type', type: 'select', required: true, options: ['Annual', 'Sick', 'Personal', 'Parental'] },
      { id: 'f18', label: 'Start Date', type: 'date', required: true },
      { id: 'f19', label: 'End Date', type: 'date', required: true },
    ],
  },
  {
    id: 'sub6',
    name: 'Building Maintenance',
    categoryId: 'cat3',
    formFields: [
      { id: 'f20', label: 'Building', type: 'text', required: true },
      { id: 'f21', label: 'Floor/Room', type: 'text', required: true },
      { id: 'f22', label: 'Issue Type', type: 'select', required: true, options: ['Plumbing', 'Electrical', 'HVAC', 'Cleaning', 'Other'] },
    ],
  },
];

// Mock users
export const mockUsers = [
  { id: 'u1', email: 'admin@acme.com', name: 'Admin User', role: 'admin', createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', email: 'agent@acme.com', name: 'John Agent', role: 'agent', department: 'IT Support', createdAt: '2026-01-02T00:00:00Z' },
  { id: 'u3', email: 'agent2@acme.com', name: 'Sarah Support', role: 'agent', department: 'IT Support', createdAt: '2026-01-03T00:00:00Z' },
  { id: 'u4', email: 'user@acme.com', name: 'Regular User', role: 'user', createdAt: '2026-01-04T00:00:00Z' },
  { id: 'u5', email: 'hr.agent@acme.com', name: 'HR Agent', role: 'agent', department: 'HR', createdAt: '2026-01-05T00:00:00Z' },
];

// Default password for demo: "password123"
export const DEMO_PASSWORD = 'password123';

// Mock initial tickets
export const mockInitialTickets = [
  {
    id: 't1',
    ticketNumber: 'TKT-1001',
    companyId: 'c1',
    domainId: 'd1',
    categoryId: 'cat1',
    subcategoryId: 'sub1',
    urgency: 'high',
    status: 'in_progress',
    title: 'Login page crashes on submit',
    description: 'When I try to log in, the page crashes immediately after clicking submit.',
    formData: {
      f1: '2.1.5',
      f2: 'Windows',
      f3: '1. Go to login page\n2. Enter credentials\n3. Click submit\n4. Page crashes',
      f4: 'Should log in successfully',
    },
    createdBy: 'u4',
    assignedTo: 'u2',
    createdAt: '2026-04-05T09:00:00Z',
    updatedAt: '2026-04-05T09:30:00Z',
  },
  {
    id: 't2',
    ticketNumber: 'TKT-1002',
    companyId: 'c1',
    domainId: 'd1',
    categoryId: 'cat1',
    subcategoryId: 'sub2',
    urgency: 'medium',
    status: 'assigned',
    title: 'Laptop keyboard not working',
    description: 'Several keys on my laptop keyboard have stopped responding.',
    formData: {
      f5: 'LAP-0042',
      f6: 'Dell Latitude 5420',
      f7: 'Building A, Floor 3, Desk 42',
      f8: '',
    },
    createdBy: 'u4',
    assignedTo: 'u3',
    createdAt: '2026-04-05T10:15:00Z',
    updatedAt: '2026-04-05T10:15:00Z',
  },
  {
    id: 't3',
    ticketNumber: 'TKT-1003',
    companyId: 'c1',
    domainId: 'd2',
    categoryId: 'cat5',
    subcategoryId: 'sub4',
    urgency: 'high',
    status: 'open',
    title: 'Missing overtime payment',
    description: 'I worked 10 hours of overtime last pay period but it does not appear on my payslip.',
    formData: {
      f12: 'EMP-2891',
      f13: '2026-03-31',
      f14: '500',
      f15: 'Overtime hours from March 25-28 not included in payment',
    },
    createdBy: 'u4',
    createdAt: '2026-04-06T08:00:00Z',
    updatedAt: '2026-04-06T08:00:00Z',
  },
  {
    id: 't4',
    ticketNumber: 'TKT-1004',
    companyId: 'c1',
    domainId: 'd1',
    categoryId: 'cat1',
    subcategoryId: 'sub3',
    urgency: 'low',
    status: 'resolved',
    title: 'WiFi slow in meeting room',
    description: 'WiFi connection is very slow in meeting room B.',
    formData: {
      f9: 'Building A, Meeting Room B',
      f10: 'Laptop',
      f11: 'WiFi',
    },
    createdBy: 'u4',
    assignedTo: 'u2',
    createdAt: '2026-04-04T14:00:00Z',
    updatedAt: '2026-04-04T16:30:00Z',
    resolvedAt: '2026-04-04T16:30:00Z',
    resolutionTime: 150,
  },
];

// Mock comments
export const mockInitialComments = [
  {
    id: 'c1',
    ticketId: 't1',
    userId: 'u2',
    content: 'I have started investigating this issue. Can you tell me which browser you are using?',
    createdAt: '2026-04-05T09:30:00Z',
  },
  {
    id: 'c2',
    ticketId: 't1',
    userId: 'u4',
    content: 'I am using Chrome version 122.',
    createdAt: '2026-04-05T10:00:00Z',
  },
  {
    id: 'c3',
    ticketId: 't4',
    userId: 'u2',
    content: 'I have reset the access point in Meeting Room B. Please test and confirm if the issue is resolved.',
    createdAt: '2026-04-04T16:15:00Z',
  },
  {
    id: 'c4',
    ticketId: 't4',
    userId: 'u4',
    content: 'Working perfectly now, thank you!',
    createdAt: '2026-04-04T16:25:00Z',
  },
];

// Mock assignment rules
export const mockInitialRules = [
  { id: 'r1', categoryId: 'cat1', urgency: 'high', assignToUserId: 'u2', priority: 1 },
  { id: 'r2', categoryId: 'cat1', urgency: 'medium', assignToUserId: 'u3', priority: 2 },
  { id: 'r3', categoryId: 'cat1', urgency: 'low', assignToUserId: 'u3', priority: 3 },
  { id: 'r4', categoryId: 'cat2', assignToUserId: 'u5', priority: 1 },
];

// Auto-close configuration (in hours)
export const defaultAutoCloseConfig = {
  high: 24,
  medium: 48,
  low: 72,
};
