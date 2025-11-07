import React, { useState, useEffect } from 'react';
import { 
  Send, Megaphone, Mail, Bell, Calendar, Users, Eye, 
  TrendingUp, FileText, Plus, Edit, Trash2, Clock, Check,
  AlertCircle, Settings, Copy, Download, Filter, Search
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';

type BroadcastAnnouncement = {
  id: string;
  title: string;
  message: string;
  broadcast_type: string;
  target_audience: string;
  priority: string;
  status: string;
  view_count: number;
  published_at?: string;
  scheduled_for?: string;
  created_at: string;
};

type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  sent_at?: string;
  scheduled_for?: string;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  category: string;
  is_system: boolean;
};

type Institution = {
  id: string;
  name: string;
};

export function CommunicationsCenter() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'campaigns' | 'templates'>('broadcasts');
  const [loading, setLoading] = useState(false);
  
  // Broadcasts
  const [broadcasts, setBroadcasts] = useState<BroadcastAnnouncement[]>([]);
  const [broadcastsLoading, setBroadcastsLoading] = useState(false);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    broadcast_type: 'global',
    target_institutions: [] as string[],
    target_audience: 'all',
    priority: 'normal',
    scheduled_for: ''
  });
  
  // Campaigns
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    template_id: '',
    html_content: '',
    recipient_type: 'all_users',
    recipient_institutions: [] as string[],
    scheduled_for: ''
  });
  
  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    id: '',
    name: '',
    subject: '',
    html_content: '',
    plain_text_content: '',
    category: 'general'
  });
  
  // Institutions list for targeting
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (activeTab === 'broadcasts') {
      fetchBroadcasts();
    } else if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  const fetchInstitutions = async () => {
    try {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setInstitutions(data || []);
    } catch (error: any) {
      console.error('Error fetching institutions:', error);
    }
  };

  const fetchBroadcasts = async () => {
    setBroadcastsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch broadcasts: ' + error.message);
    } finally {
      setBroadcastsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch campaigns: ' + error.message);
    } finally {
      setCampaignsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch templates: ' + error.message);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const createBroadcast = async () => {
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }

    const loadingToast = toast.loading('Creating broadcast...');
    try {
      const { error } = await supabase.rpc('create_broadcast_announcement', {
        p_title: broadcastForm.title,
        p_message: broadcastForm.message,
        p_broadcast_type: broadcastForm.broadcast_type,
        p_target_institutions: broadcastForm.target_institutions.length > 0 
          ? broadcastForm.target_institutions 
          : null,
        p_target_audience: broadcastForm.target_audience,
        p_priority: broadcastForm.priority,
        p_scheduled_for: broadcastForm.scheduled_for || null
      });

      if (error) throw error;

      toast.success('Broadcast created successfully!', { id: loadingToast });
      setShowBroadcastForm(false);
      setBroadcastForm({
        title: '',
        message: '',
        broadcast_type: 'global',
        target_institutions: [],
        target_audience: 'all',
        priority: 'normal',
        scheduled_for: ''
      });
      fetchBroadcasts();
    } catch (error: any) {
      toast.error('Failed to create broadcast: ' + error.message, { id: loadingToast });
    }
  };

  const createCampaign = async () => {
    if (!campaignForm.name.trim() || !campaignForm.subject.trim()) {
      toast.error('Please fill in campaign name and subject');
      return;
    }

    const loadingToast = toast.loading('Creating campaign...');
    try {
      const { error } = await supabase
        .from('email_campaigns')
        .insert({
          name: campaignForm.name,
          subject: campaignForm.subject,
          template_id: campaignForm.template_id || null,
          html_content: campaignForm.html_content,
          recipient_type: campaignForm.recipient_type,
          recipient_institutions: campaignForm.recipient_institutions.length > 0 
            ? campaignForm.recipient_institutions 
            : null,
          scheduled_for: campaignForm.scheduled_for || null,
          status: campaignForm.scheduled_for ? 'scheduled' : 'draft'
        });

      if (error) throw error;

      toast.success('Campaign created successfully!', { id: loadingToast });
      setShowCampaignForm(false);
      setCampaignForm({
        name: '',
        subject: '',
        template_id: '',
        html_content: '',
        recipient_type: 'all_users',
        recipient_institutions: [],
        scheduled_for: ''
      });
      fetchCampaigns();
    } catch (error: any) {
      toast.error('Failed to create campaign: ' + error.message, { id: loadingToast });
    }
  };

  const saveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.html_content.trim()) {
      toast.error('Please fill in template name and content');
      return;
    }

    const loadingToast = toast.loading('Saving template...');
    try {
      if (templateForm.id) {
        // Update existing
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: templateForm.name,
            subject: templateForm.subject,
            html_content: templateForm.html_content,
            plain_text_content: templateForm.plain_text_content,
            category: templateForm.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateForm.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: templateForm.name,
            subject: templateForm.subject,
            html_content: templateForm.html_content,
            plain_text_content: templateForm.plain_text_content,
            category: templateForm.category
          });

        if (error) throw error;
      }

      toast.success('Template saved successfully!', { id: loadingToast });
      setShowTemplateForm(false);
      setTemplateForm({
        id: '',
        name: '',
        subject: '',
        html_content: '',
        plain_text_content: '',
        category: 'general'
      });
      fetchTemplates();
    } catch (error: any) {
      toast.error('Failed to save template: ' + error.message, { id: loadingToast });
    }
  };

  const deleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast?')) return;

    const loadingToast = toast.loading('Deleting broadcast...');
    try {
      const { error } = await supabase
        .from('broadcast_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Broadcast deleted', { id: loadingToast });
      fetchBroadcasts();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message, { id: loadingToast });
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    const loadingToast = toast.loading('Deleting template...');
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template deleted', { id: loadingToast });
      fetchTemplates();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message, { id: loadingToast });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
      case 'sent':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-600" />;
      case 'sending':
        return <Send className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-blue-600" />
            Communications Center
          </h2>
          <p className="text-gray-600 mt-1">Broadcast announcements, email campaigns, and notifications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'broadcasts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Megaphone className="w-5 h-5 inline mr-2" />
            Broadcast Announcements
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Mail className="w-5 h-5 inline mr-2" />
            Email Campaigns
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Email Templates
          </button>
        </nav>
      </div>

      {/* Broadcast Announcements Tab */}
      {activeTab === 'broadcasts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Broadcast Announcements</h3>
            <button
              onClick={() => setShowBroadcastForm(!showBroadcastForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Broadcast
            </button>
          </div>

          {/* Broadcast Form */}
          {showBroadcastForm && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold mb-4">Create Broadcast Announcement</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Your announcement message"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Broadcast Type</label>
                    <select
                      value={broadcastForm.broadcast_type}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, broadcast_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="global">Global (All Institutions)</option>
                      <option value="multi_institution">Multiple Institutions</option>
                      <option value="single_institution">Single Institution</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                    <select
                      value={broadcastForm.target_audience}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, target_audience: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all">Everyone</option>
                      <option value="librarians">Librarians Only</option>
                      <option value="staff">Staff Only</option>
                      <option value="students">Students Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={broadcastForm.priority}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {(broadcastForm.broadcast_type === 'multi_institution' || broadcastForm.broadcast_type === 'single_institution') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Institutions</label>
                    <select
                      multiple
                      value={broadcastForm.target_institutions}
                      onChange={(e) => setBroadcastForm({ 
                        ...broadcastForm, 
                        target_institutions: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      size={5}
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule For Later (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={broadcastForm.scheduled_for}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduled_for: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={createBroadcast}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Broadcast
                  </button>
                  <button
                    onClick={() => setShowBroadcastForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Broadcasts List */}
          {broadcastsLoading ? (
            <LoadingSkeleton count={5} />
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No broadcasts yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{broadcast.title}</h4>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(broadcast.status)}`}>
                          {getStatusIcon(broadcast.status)}
                          {broadcast.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(broadcast.priority)}`}>
                          {broadcast.priority}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{broadcast.message}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {broadcast.broadcast_type} - {broadcast.target_audience}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {broadcast.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {broadcast.published_at 
                            ? new Date(broadcast.published_at).toLocaleDateString()
                            : 'Not published'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteBroadcast(broadcast.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Campaigns</h3>
            <button
              onClick={() => setShowCampaignForm(!showCampaignForm)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>

          {/* Campaign Form */}
          {showCampaignForm && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold mb-4">Create Email Campaign</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Monthly newsletter"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                    <input
                      type="text"
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Your monthly update"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Content (HTML)</label>
                  <textarea
                    value={campaignForm.html_content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, html_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    rows={6}
                    placeholder="<h1>Hello!</h1><p>Your email content here...</p>"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                    <select
                      value={campaignForm.recipient_type}
                      onChange={(e) => setCampaignForm({ ...campaignForm, recipient_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="all_users">All Users</option>
                      <option value="librarians">All Librarians</option>
                      <option value="staff">All Staff</option>
                      <option value="students">All Students</option>
                      <option value="institution">Specific Institution(s)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule For Later (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={campaignForm.scheduled_for}
                      onChange={(e) => setCampaignForm({ ...campaignForm, scheduled_for: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {campaignForm.recipient_type === 'institution' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Institutions</label>
                    <select
                      multiple
                      value={campaignForm.recipient_institutions}
                      onChange={(e) => setCampaignForm({ 
                        ...campaignForm, 
                        recipient_institutions: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      size={5}
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={createCampaign}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Campaign
                  </button>
                  <button
                    onClick={() => setShowCampaignForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Campaigns List */}
          {campaignsLoading ? (
            <LoadingSkeleton count={5} />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No email campaigns yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{campaign.name}</h4>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{campaign.subject}</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Recipients:</span>
                      <span className="font-medium">{campaign.total_recipients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sent:</span>
                      <span className="font-medium">{campaign.sent_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Open Rate:</span>
                      <span className="font-medium">
                        {campaign.sent_count > 0 
                          ? `${Math.round((campaign.opened_count / campaign.sent_count) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                    {campaign.sent_at && (
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span className="font-medium">{new Date(campaign.sent_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Templates</h3>
            <button
              onClick={() => {
                setTemplateForm({
                  id: '',
                  name: '',
                  subject: '',
                  html_content: '',
                  plain_text_content: '',
                  category: 'general'
                });
                setShowTemplateForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          {/* Template Form */}
          {showTemplateForm && (
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h4 className="font-semibold mb-4">
                {templateForm.id ? 'Edit Template' : 'Create Template'}
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Welcome Email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={templateForm.category}
                      onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="general">General</option>
                      <option value="notification">Notification</option>
                      <option value="announcement">Announcement</option>
                      <option value="marketing">Marketing</option>
                      <option value="transactional">Transactional</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject Line</label>
                  <input
                    type="text"
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Welcome to {{institution_name}}"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {'{{user_name}}, {{institution_name}}, {{current_date}}'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">HTML Content</label>
                  <textarea
                    value={templateForm.html_content}
                    onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                    rows={8}
                    placeholder="<h1>Hello {{user_name}}</h1>"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plain Text Content</label>
                  <textarea
                    value={templateForm.plain_text_content}
                    onChange={(e) => setTemplateForm({ ...templateForm, plain_text_content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={4}
                    placeholder="Hello {{user_name}}"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={saveTemplate}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Template
                  </button>
                  <button
                    onClick={() => setShowTemplateForm(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Templates List */}
          {templatesLoading ? (
            <LoadingSkeleton count={5} />
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No templates yet. Create your first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{template.name}</h4>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                      {template.is_system && (
                        <span className="inline-block px-2 py-0.5 mt-1 ml-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          System
                        </span>
                      )}
                    </div>
                    {!template.is_system && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setTemplateForm({
                              id: template.id,
                              name: template.name,
                              subject: template.subject,
                              html_content: template.html_content,
                              plain_text_content: '',
                              category: template.category
                            });
                            setShowTemplateForm(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                  <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded max-h-20 overflow-hidden">
                    {template.html_content.substring(0, 100)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
