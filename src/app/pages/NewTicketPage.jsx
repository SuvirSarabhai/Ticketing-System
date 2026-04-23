import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useTickets } from '../contexts/TicketContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, ArrowRight, Sparkles, Check, Loader2 } from 'lucide-react';
import { api, parseResponse } from '../utils/api';
import { suggestFormFields } from '../utils/ai-suggestions';


export default function NewTicketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createTicket } = useTickets();

  // Catalog data fetched from API (no companies — fixed to user's company)
  const [domains, setDomains] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  // Form state
  const [step, setStep] = useState('context');
  const [companyId, setCompanyId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formData, setFormData] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch catalog data on mount
  // Auto-set company from logged-in user's profile
  useEffect(() => {
    if (user?.company_id) setCompanyId(user.company_id);
  }, [user?.company_id]);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [do_, ca, sub] = await Promise.all([
          parseResponse(await api.get('/api/domains')),
          parseResponse(await api.get('/api/categories')),
          parseResponse(await api.get('/api/subcategories')),
        ]);
        setDomains(do_ || []);
        setCategories(ca || []);
        setSubcategories(sub || []);
      } catch (err) {
        console.error('Failed to load catalog:', err);
      }
    }
    loadCatalog();
  }, []);

  // Filter categories based on selected domain
  const availableCategories = domainId
    ? categories.filter((cat) => cat.domain_id === domainId)
    : [];

  // Filter subcategories based on selected category
  const availableSubcategories = categoryId
    ? subcategories.filter((sub) => sub.category_id === categoryId)
    : [];

  // Get selected subcategory (form_fields comes from DB as snake_case)
  const selectedSubcategory = subcategories.find((s) => s.id === subcategoryId);
  const selectedFormFields = selectedSubcategory?.form_fields || [];

  // Generate AI suggestions (now async — calls the backend)
  const generateAiSuggestions = async () => {
    if (!description || !subcategoryId) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await suggestFormFields(description, subcategoryId);
      setAiSuggestions(suggestions);
      setFormData((prev) => ({ ...prev, ...suggestions }));
    } catch (err) {
      console.warn('AI suggestions failed:', err.message);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };


  const handleNext = () => {
    if (step === 'context') {
      // if (!domainId || !categoryId || !subcategoryId) {
      //   alert('Please complete all context fields');
      //   return;
      // }
      setStep('urgency');
    } else if (step === 'urgency') {
      setStep('description');
    } else if (step === 'description') {
      if (!title || !description) {
        alert('Please provide a title and description');
        return;
      }
      generateAiSuggestions(); // fire-and-forget, suggestions fill in async
      setStep('form');
    } else if (step === 'form') {
      // Validate required fields using DB form_fields (snake_case)
      const missingFields = selectedFormFields.filter(
        (field) => field.required && !formData[field.id]
      );
      if (missingFields && missingFields.length > 0) {
        alert(`Please complete all required fields: ${missingFields.map((f) => f.label).join(', ')}`);
        return;
      }
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'urgency') setStep('context');
    else if (step === 'description') setStep('urgency');
    else if (step === 'form') setStep('description');
    else if (step === 'review') setStep('form');
  };

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ticket = await createTicket({
        companyId,
        domainId,
        categoryId,
        subcategoryId,
        urgency,
        title,
        description,
        formData,
      });
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      alert(`Failed to create ticket: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getStepNumber = () => {
    const steps = ['context', 'urgency', 'description', 'form', 'review'];
    return steps.indexOf(step) + 1;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center mb-2">
              <CardTitle>Create New Ticket</CardTitle>
              <Badge variant="outline">
                Step {getStepNumber()} of 5
              </Badge>
            </div>
            <CardDescription>
              {step === 'context' && 'Select the context for your issue'}
              {step === 'urgency' && 'Set the urgency level'}
              {step === 'description' && 'Describe your issue'}
              {step === 'form' && 'Complete the details'}
              {step === 'review' && 'Review and submit'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'context' && (
              <div className="space-y-4">
                {/* Company is fixed to the logged-in user's company — no dropdown */}
                <div className="rounded-lg border bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Company</span>
                  <span className="text-sm font-medium">{user?.company_name || 'Your Company'}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain">Domain (Industry)</Label>
                  <Select value={domainId} onValueChange={setDomainId}>
                    <SelectTrigger id="domain">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>
                          {domain.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category (Department)</Label>
                  <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                    disabled={!domainId}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory (Issue Type)</Label>
                  <Select
                    value={subcategoryId}
                    onValueChange={setSubcategoryId}
                    disabled={!categoryId}
                  >
                    <SelectTrigger id="subcategory">
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 'urgency' && (
              <div className="space-y-4">
                <Label>Select Urgency Level</Label>
                <RadioGroup value={urgency} onValueChange={(value) => setUrgency(value)}>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="low" id="low" />
                      <Label htmlFor="low" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div>Low</div>
                            <div className="text-sm text-gray-600">
                              Minor issues, can wait for resolution
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800" variant="outline">
                            Low
                          </Badge>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="medium" id="medium" />
                      <Label htmlFor="medium" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div>Medium</div>
                            <div className="text-sm text-gray-600">
                              Important issues affecting productivity
                            </div>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800" variant="outline">
                            Medium
                          </Badge>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="high" id="high" />
                      <Label htmlFor="high" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <div>High</div>
                            <div className="text-sm text-gray-600">
                              Critical issues requiring immediate attention
                            </div>
                          </div>
                          <Badge className="bg-red-100 text-red-800" variant="outline">
                            High
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 'description' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Issue Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Issue Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your issue in detail. The AI will use this to help fill out the form in the next step."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                  />
                  <p className="text-sm text-gray-600">
                    <Sparkles className="inline h-3 w-3 mr-1" />
                    Include specific details like version numbers, device models, locations, or error messages.
                    Our AI will automatically suggest form values based on your description.
                  </p>
                </div>
              </div>
            )}

            {step === 'form' && selectedSubcategory && (
              <div className="space-y-4">
                {isGeneratingSuggestions && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div>
                      <div className="text-sm">Analyzing your description...</div>
                      <div className="text-xs text-gray-600">AI is suggesting form values</div>
                    </div>
                  </div>
                )}

                {!isGeneratingSuggestions && Object.keys(aiSuggestions).length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-green-600" />
                    <div className="text-sm">
                      AI has pre-filled some fields based on your description. Please review and adjust as needed.
                    </div>
                  </div>
                )}

                {selectedFormFields.map((field) => {
                  const isAiSuggested = aiSuggestions[field.id] !== undefined;

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                        {isAiSuggested && (
                          <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Suggested
                          </Badge>
                        )}
                      </Label>

                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.id}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.id]: e.target.value })
                          }
                          required={field.required}
                          className={isAiSuggested ? 'border-purple-300 bg-purple-50/30' : ''}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={formData[field.id] || ''}
                          onValueChange={(value) =>
                            setFormData({ ...formData, [field.id]: value })
                          }
                        >
                          <SelectTrigger
                            id={field.id}
                            className={isAiSuggested ? 'border-purple-300 bg-purple-50/30' : ''}
                          >
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.id}
                          type={field.type}
                          value={formData[field.id] || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, [field.id]: e.target.value })
                          }
                          required={field.required}
                          className={isAiSuggested ? 'border-purple-300 bg-purple-50/30' : ''}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {step === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-gray-600 mb-2">Context</h3>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <div className="text-xs text-gray-500">Company</div>
                      <div className="text-sm">
                        {user?.company_name || 'Your Company'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Domain</div>
                      <div className="text-sm">
                        {domains.find((d) => d.id === domainId)?.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Category</div>
                      <div className="text-sm">
                        {categories.find((c) => c.id === categoryId)?.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Subcategory</div>
                      <div className="text-sm">
                        {subcategories.find((s) => s.id === subcategoryId)?.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-600 mb-2">Urgency</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <Badge
                      className={
                        urgency === 'high'
                          ? 'bg-red-100 text-red-800'
                          : urgency === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }
                      variant="outline"
                    >
                      {urgency.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-600 mb-2">Issue</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <div className="text-sm">{title}</div>
                    </div>
                    <div className="text-sm text-gray-600 whitespace-pre-wrap">
                      {description}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-gray-600 mb-2">Additional Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {selectedFormFields.map((field) => (
                      <div key={field.id}>
                        <div className="text-xs text-gray-500">{field.label}</div>
                        <div className="text-sm">{formData[field.id] || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            {step !== 'context' && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {step === 'context' && <div />}

            {step !== 'review' ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Check className="h-4 w-4 mr-2" />
                Submit Ticket
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
