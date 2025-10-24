import { useEffect, useState, useRef } from 'react';
import { Send, MessageCircle, Users, Search, X, Circle, Paperclip, Download, FileText, Image as ImageIcon, Smile, Plus, Languages } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

type PresenceState = {
  [key: string]: Array<{
    user_id: string;
    online_at: string;
    typing: boolean;
  }>;
};

type UserProfile = {
  id: string;
  full_name: string;
  role: 'student' | 'staff' | 'librarian';
  enrollment_id?: string;
};

type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  other_user: UserProfile;
  unread_count: number;
};

type Message = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  attachment_url?: string;
  attachment_name?: string;
  attachment_size?: number;
  attachment_type?: string;
};

type Reaction = {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
};

type MessageWithReactions = Message & {
  reactions?: Array<{
    emoji: string;
    count: number;
    users: string[];
    hasReacted: boolean;
  }>;
};

export function ChatMessaging() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMessageEmojiPicker, setShowMessageEmojiPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingMessage, setTranslatingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presenceChannelRef = useRef<any>(null);

  useEffect(() => {
    if (profile) {
      loadConversations();
      loadAvailableUsers();
    }
  }, [profile]);

  // Separate useEffect for realtime subscriptions to avoid channel conflicts
  useEffect(() => {
    if (!profile) return;
    
    // Set up real-time subscription for conversations (global)
    const conversationsChannel = supabase
      .channel('user-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          console.log('� Conversation updated');
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      conversationsChannel.unsubscribe();
    };
  }, [profile]);

  // Separate useEffect for message subscriptions per conversation
  useEffect(() => {
    if (!selectedConversation) return;

    console.log('🔌 Setting up realtime for conversation:', selectedConversation);

    // Set up real-time subscription for messages in this specific conversation
    const messagesChannel = supabase
      .channel(`conversation-${selectedConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          console.log('� New message received:', payload);
          const newMsg = payload.new as Message;
          
          // Only add if not already in the list (avoid duplicates)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            return exists ? prev : [...prev, newMsg];
          });
          
          // Reload conversations to update last message time
          loadConversations();
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from conversation:', selectedConversation);
      messagesChannel.unsubscribe();
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      markAsRead(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Presence tracking for online/typing indicators
  useEffect(() => {
    if (!selectedConversation || !profile) return;

    const channel = supabase.channel(`presence-${selectedConversation}`, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    // Store channel reference for handleTyping to use
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>();
        const onlineUserIds = new Set<string>();
        const typingUserIds = new Set<string>();

        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            onlineUserIds.add(presence.user_id);
            if (presence.typing) {
              typingUserIds.add(presence.user_id);
            }
          });
        });

        setOnlineUsers(onlineUserIds);
        setTypingUsers(typingUserIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👋 User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      channel.unsubscribe();
    };
  }, [selectedConversation, profile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1_profile:user_profiles!conversations_participant_1_fkey(id, full_name, role, enrollment_id),
        participant_2_profile:user_profiles!conversations_participant_2_fkey(id, full_name, role, enrollment_id)
      `)
      .or(`participant_1.eq.${profile.id},participant_2.eq.${profile.id}`)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      // Get unread counts
      const { data: unreadData } = await supabase
        .from('unread_counts')
        .select('*')
        .eq('user_id', profile.id);

      const unreadMap = new Map(unreadData?.map(u => [u.conversation_id, u.count]) || []);

      const formatted = data.map(conv => {
        const otherUser = conv.participant_1 === profile.id 
          ? conv.participant_2_profile 
          : conv.participant_1_profile;
        
        return {
          id: conv.id,
          participant_1: conv.participant_1,
          participant_2: conv.participant_2,
          last_message_at: conv.last_message_at || conv.created_at,
          other_user: otherUser,
          unread_count: unreadMap.get(conv.id) || 0,
        };
      });

      setConversations(formatted);
    }

    setLoading(false);
  };

  const loadAvailableUsers = async () => {
    if (!profile) return;

    let query = supabase
      .from('user_profiles')
      .select('id, full_name, role, enrollment_id')
      .neq('id', profile.id); // Don't show self

    // Apply role-based filtering
    if (profile.role === 'student') {
      // Students can chat with librarians, other students, and staff
      query = query.in('role', ['librarian', 'student', 'staff']);
    } else if (profile.role === 'staff') {
      // Staff can chat with librarians, other staff, and students
      query = query.in('role', ['librarian', 'staff', 'student']);
    }
    // Librarians can chat with everyone (no filter needed)

    const { data, error } = await query.order('full_name');

    if (!error && data) {
      setAvailableUsers(data);
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      loadReactions(data.map(m => m.id));
    }
  };

  const loadReactions = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (!error && data) {
      const reactionsMap: Record<string, Reaction[]> = {};
      data.forEach((reaction: Reaction) => {
        if (!reactionsMap[reaction.message_id]) {
          reactionsMap[reaction.message_id] = [];
        }
        reactionsMap[reaction.message_id].push(reaction);
      });
      setReactions(reactionsMap);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: profile.id,
        reaction: emoji,
      });

    if (!error) {
      loadReactions([messageId]);
    } else {
      toast.error('Failed to add reaction');
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!profile) return;

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', profile.id)
      .eq('reaction', emoji);

    if (!error) {
      loadReactions([messageId]);
    } else {
      toast.error('Failed to remove reaction');
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!profile) return;

    const messageReactions = reactions[messageId] || [];
    const userReaction = messageReactions.find(
      r => r.user_id === profile.id && r.reaction === emoji
    );

    if (userReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  const getReactionSummary = (messageId: string) => {
    const messageReactions = reactions[messageId] || [];
    const summary: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};

    messageReactions.forEach(reaction => {
      if (!summary[reaction.reaction]) {
        summary[reaction.reaction] = { count: 0, users: [], hasReacted: false };
      }
      summary[reaction.reaction].count++;
      summary[reaction.reaction].users.push(reaction.user_id);
      if (reaction.user_id === profile?.id) {
        summary[reaction.reaction].hasReacted = true;
      }
    });

    return summary;
  };

  const translateMessage = async (messageId: string, text: string, targetLang: string = 'en') => {
    // Check cache first
    const cacheKey = `${messageId}-${targetLang}`;
    if (translations[cacheKey]) {
      return translations[cacheKey];
    }

    setTranslatingMessage(messageId);

    try {
      // Using MyMemory Translation API (free, no key required)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`
      );
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        
        // Cache the translation
        setTranslations(prev => ({
          ...prev,
          [cacheKey]: translated
        }));
        
        return translated;
      } else {
        toast.error('Translation failed');
        return null;
      }
    } catch (error) {
      toast.error('Translation service unavailable');
      return null;
    } finally {
      setTranslatingMessage(null);
    }
  };

  const handleTranslate = async (messageId: string, text: string) => {
    const cacheKey = `${messageId}-en`;
    
    if (translations[cacheKey]) {
      // Already translated, show original
      setTranslations(prev => {
        const newTranslations = { ...prev };
        delete newTranslations[cacheKey];
        return newTranslations;
      });
    } else {
      // Translate to English
      await translateMessage(messageId, text, 'en');
    }
  };

  const markAsRead = async (conversationId: string) => {
    if (!profile) return;

    // Reset unread count
    await supabase
      .from('unread_counts')
      .upsert({ 
        user_id: profile.id, 
        conversation_id: conversationId, 
        count: 0 
      });

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', profile.id);

    // Refresh conversations to update unread count
    loadConversations();
  };

  const startNewConversation = async (userId: string) => {
    if (!profile) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(participant_1.eq.${profile.id},participant_2.eq.${userId}),and(participant_1.eq.${userId},participant_2.eq.${profile.id})`)
      .maybeSingle();

    if (existing) {
      setSelectedConversation(existing.id);
      setShowNewChat(false);
      return;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        participant_1: profile.id,
        participant_2: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setSelectedConversation(data.id);
      setShowNewChat(false);
      loadConversations();
    } else {
      toast.error('Failed to start conversation');
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !profile || !presenceChannelRef.current) return;

    const channel = presenceChannelRef.current;
    
    channel.track({
      user_id: profile.id,
      online_at: new Date().toISOString(),
      typing: true,
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of no activity
    typingTimeoutRef.current = setTimeout(() => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track({
          user_id: profile.id,
          online_at: new Date().toISOString(),
          typing: false,
        });
      }
    }, 3000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !profile) return;

    setUploading(true);
    let attachmentData = null;

    try {
      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${selectedConversation}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) {
          toast.error('Failed to upload file');
          setUploading(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(filePath);

        attachmentData = {
          attachment_url: urlData.publicUrl,
          attachment_name: selectedFile.name,
          attachment_size: selectedFile.size,
          attachment_type: selectedFile.type,
        };
      }

      // Send message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: profile.id,
          message: newMessage.trim() || '📎 Attachment',
          ...attachmentData,
        });

      if (!error) {
        setNewMessage('');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        loadMessages(selectedConversation);
        loadConversations(); // Refresh to update last message time
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    } finally {
      setUploading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.enrollment_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConvData = conversations.find(c => c.id === selectedConversation);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      {/* Conversations List */}
      <div className="w-80 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Messages
            </h2>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              New Chat
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {profile?.role === 'student' && 'Chat with librarians and other students'}
            {profile?.role === 'staff' && 'Chat with librarians and other staff'}
            {profile?.role === 'librarian' && 'Chat with students and staff'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  selectedConversation === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{conv.other_user.full_name}</h3>
                      {conv.unread_count > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">{conv.other_user.role}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conv.last_message_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
        {selectedConvData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="relative">
                  {onlineUsers.has(selectedConvData.other_user.id) && (
                    <Circle className="h-3 w-3 text-green-500 fill-green-500 absolute -top-1 -right-1" />
                  )}
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {selectedConvData.other_user.full_name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedConvData.other_user.full_name}</h3>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(selectedConvData.other_user.id) ? (
                      <span className="text-green-600">● Online</span>
                    ) : (
                      <span className="capitalize">{selectedConvData.other_user.role}</span>
                    )}
                  </p>
                </div>
              </div>
              {typingUsers.has(selectedConvData.other_user.id) && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  typing...
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map(msg => {
                  const reactionSummary = getReactionSummary(msg.id);
                  const hasReactions = Object.keys(reactionSummary).length > 0;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            msg.sender_id === profile?.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {msg.attachment_url && (
                            <div className="mb-2">
                              {msg.attachment_type?.startsWith('image/') ? (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={msg.attachment_url} 
                                    alt={msg.attachment_name} 
                                    className="max-w-full rounded max-h-64 object-cover"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={msg.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded ${
                                    msg.sender_id === profile?.id ? 'bg-blue-700' : 'bg-gray-200'
                                  }`}
                                >
                                  <FileText className="h-5 w-5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{msg.attachment_name}</p>
                                    <p className={`text-xs ${
                                      msg.sender_id === profile?.id ? 'text-blue-200' : 'text-gray-500'
                                    }`}>
                                      {msg.attachment_size && `${(msg.attachment_size / 1024).toFixed(1)} KB`}
                                    </p>
                                  </div>
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          )}
                          {msg.message && msg.message !== '📎 Attachment' && (
                            <div>
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {translations[`${msg.id}-en`] || msg.message}
                              </p>
                              {msg.message.length > 10 && (
                                <button
                                  onClick={() => handleTranslate(msg.id, msg.message)}
                                  disabled={translatingMessage === msg.id}
                                  className={`flex items-center gap-1 mt-1 text-xs ${
                                    msg.sender_id === profile?.id
                                      ? 'text-blue-100 hover:text-white'
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                  title={translations[`${msg.id}-en`] ? 'Show original' : 'Translate to English'}
                                >
                                  <Languages className="h-3 w-3" />
                                  {translatingMessage === msg.id ? (
                                    'Translating...'
                                  ) : translations[`${msg.id}-en`] ? (
                                    'Show original'
                                  ) : (
                                    'Translate'
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          <p className={`text-xs mt-1 ${
                            msg.sender_id === profile?.id ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>

                        {/* Reactions Display */}
                        {hasReactions && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(reactionSummary).map(([emoji, data]) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                                  data.hasReacted
                                    ? 'bg-blue-100 border border-blue-300'
                                    : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="font-medium">{data.count}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Quick Reactions */}
                        <div className="flex items-center gap-1 mt-1 relative">
                          {['👍', '❤️', '😊', '🎉'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity text-lg hover:scale-125 transform"
                              title={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                            className="opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                            title="More reactions"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          
                          {/* Emoji Picker */}
                          {showEmojiPicker === msg.id && (
                            <div className="absolute bottom-full left-0 mb-2 z-50">
                              <EmojiPicker
                                onEmojiClick={(emojiData: EmojiClickData) => {
                                  toggleReaction(msg.id, emojiData.emoji);
                                  setShowEmojiPicker(null);
                                }}
                                width={300}
                                height={400}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
              {selectedFile && (
                <div className="mb-2 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-gray-700 flex-1 truncate">{selectedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Max 10MB
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('File size must be less than 10MB');
                        return;
                      }
                      setSelectedFile(file);
                    }
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowMessageEmojiPicker(!showMessageEmojiPicker)}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Add emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showMessageEmojiPicker && (
                    <div className="absolute bottom-full mb-2 left-0 z-50">
                      <EmojiPicker
                        onEmojiClick={(emojiData: EmojiClickData) => {
                          setNewMessage(prev => prev + emojiData.emoji);
                          setShowMessageEmojiPicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose a chat from the list or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Start New Chat
              </h3>
              <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No users found</p>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => startNewConversation(user.id)}
                    className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                    {user.enrollment_id && (
                      <div className="text-xs text-gray-400">{user.enrollment_id}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
