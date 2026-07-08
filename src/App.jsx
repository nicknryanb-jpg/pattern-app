import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { Home, TrendingUp, Calendar, Activity, BookOpen, Users, Search, MessageSquare, Settings, Plus, X, ChevronRight, ChevronLeft, Moon, Sun, Zap, Target, Flame, Clock, Check, ArrowUp, ArrowDown, Minus, Edit3, Trash2, Filter, Download, FileText } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// Utility functions
const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const formatTime = (date) => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
const getDayName = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' });

// Convert 24-hour time string (HH:mm) to 12-hour format (h:mm AM/PM)
const formatTime12Hour = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Convert hour number (0-23) to 12-hour format
const formatHour12 = (hour) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${period}`;
};
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Event utility functions
const getDayOfWeekName = (date) => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date(date).getDay()];
};

const isEventOnDate = (event, date) => {
  if (event.type === 'one-time') {
    return event.date === new Date(date).toISOString().split('T')[0];
  }
  if (event.type === 'recurring') {
    const dayName = getDayOfWeekName(date);
    return event.daysOfWeek.includes(dayName);
  }
  return false;
};

const isEventActive = (event, datetime) => {
  const date = new Date(datetime);
  const timeStr = date.toTimeString().slice(0, 5); // HH:mm

  if (!isEventOnDate(event, date)) return false;

  if (!event.startTime || !event.endTime) return true;
  return timeStr >= event.startTime && timeStr <= event.endTime;
};

const getEventsForDate = (events, date) => {
  return events.filter(event => isEventOnDate(event, date));
};

const getActiveEvents = (events, datetime = new Date()) => {
  return events.filter(event => isEventActive(event, datetime));
};

// Calendar utility functions
const getWeekDates = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const isSameDay = (date1, date2) => {
  return new Date(date1).toDateString() === new Date(date2).toDateString();
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Storage helpers
const storage = {
  get: (key, defaultValue) => {
    try {
      const item = localStorage.getItem(`pattern_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`pattern_${key}`, JSON.stringify(value));
    } catch (e) { console.error('Storage error:', e); }
  }
};

// Default data structures
const defaultProfile = {
  name: '',
  setupComplete: false,
  createdAt: null,
  factors: ['school', 'sports', 'social', 'health', 'sleep'],
  customTags: [], // Tags selected from preset library
  userCreatedTags: [], // Custom tags created by user { id, label, emoji, color }
  locationPreset: null, // 'single', 'two-homes', 'college', 'custom'
  locations: [], // Array of { id, label, emoji }
  eventCategories: [], // User creates their own categories
  aiAssistantEnabled: false, // AI Assistant feature toggle
  openAIApiKey: '', // User's OpenAI API key
  habits: [] // Daily habits to track { id, label, emoji, color }
};

const defaultEvents = [];

// Default event categories (empty - users create their own)
const defaultEventCategories = [];

// Event colors (kept for backward compatibility and color picker)
const eventColors = [
  { id: 'blue', color: '#4a9eff', label: 'Blue' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'yellow', color: '#eab308', label: 'Yellow' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
  { id: 'teal', color: '#14b8a6', label: 'Teal' }
];

const defaultSettings = {
  theme: 'dark',
  reminderTime: '21:00',
  weekStartsOn: 'monday'
};

// Preset tag library organized by category
const presetTags = {
  emotions: [
    { id: 'stressed', label: 'Stressed', emoji: '😰', color: '#ef4444' },
    { id: 'anxious', label: 'Anxious', emoji: '😟', color: '#ec4899' },
    { id: 'happy', label: 'Happy', emoji: '😊', color: '#eab308' },
    { id: 'frustrated', label: 'Frustrated', emoji: '😤', color: '#f97316' },
    { id: 'calm', label: 'Calm', emoji: '😌', color: '#06b6d4' },
    { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😵', color: '#ef4444' },
    { id: 'motivated', label: 'Motivated', emoji: '💪', color: '#84cc16' },
    { id: 'sad', label: 'Sad', emoji: '😢', color: '#8b5cf6' },
    { id: 'excited', label: 'Excited', emoji: '🤩', color: '#eab308' },
    { id: 'lonely', label: 'Lonely', emoji: '🥀', color: '#8b5cf6' },
    { id: 'grateful', label: 'Grateful', emoji: '🙏', color: '#06b6d4' },
    { id: 'confident', label: 'Confident', emoji: '😎', color: '#14b8a6' }
  ],
  physical: [
    { id: 'tired', label: 'Tired', emoji: '😴', color: '#6366f1' },
    { id: 'sick', label: 'Sick', emoji: '🤒', color: '#f97316' },
    { id: 'well-rested', label: 'Well Rested', emoji: '🌟', color: '#22c55e' },
    { id: 'hungry', label: 'Hungry', emoji: '🍽️', color: '#f97316' },
    { id: 'energized', label: 'Energized', emoji: '⚡', color: '#eab308' },
    { id: 'sore', label: 'Sore', emoji: '🤕', color: '#ef4444' },
    { id: 'headache', label: 'Headache', emoji: '🤯', color: '#ef4444' },
    { id: 'pain', label: 'In Pain', emoji: '😖', color: '#ef4444' }
  ],
  activities: [
    { id: 'studying', label: 'Studying', emoji: '📚', color: '#4a9eff' },
    { id: 'working-out', label: 'Working Out', emoji: '🏃', color: '#22c55e' },
    { id: 'socializing', label: 'Socializing', emoji: '💬', color: '#a855f7' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮', color: '#8b5cf6' },
    { id: 'relaxing', label: 'Relaxing', emoji: '🛋️', color: '#06b6d4' },
    { id: 'reading', label: 'Reading', emoji: '📖', color: '#4a9eff' },
    { id: 'creative', label: 'Being Creative', emoji: '🎨', color: '#ec4899' },
    { id: 'productive', label: 'Productive', emoji: '🎯', color: '#14b8a6' }
  ],
  context: [
    { id: 'test-day', label: 'Test Day', emoji: '📝', color: '#ef4444' },
    { id: 'game-day', label: 'Game Day', emoji: '🏆', color: '#eab308' },
    { id: 'deadline', label: 'Deadline', emoji: '⏰', color: '#f97316' },
    { id: 'conflict', label: 'Conflict', emoji: '⚔️', color: '#ef4444' },
    { id: 'good-news', label: 'Good News', emoji: '🎉', color: '#22c55e' },
    { id: 'bad-news', label: 'Bad News', emoji: '📉', color: '#ef4444' },
    { id: 'achievement', label: 'Achievement', emoji: '✨', color: '#eab308' },
    { id: 'challenge', label: 'Challenge', emoji: '🎯', color: '#f97316' }
  ]
};

// Get all preset tags as a flat array
const getAllPresetTags = () => {
  return Object.values(presetTags).flat();
};

// Helper to get user's active tags from profile (merges preset + custom tags)
const getUserTags = (profile) => {
  const presetSelectedTags = profile.customTags || [];
  const userCustomTags = profile.userCreatedTags || [];

  // Merge preset tags with user-created tags
  const allTags = [...presetSelectedTags, ...userCustomTags];

  if (allTags.length > 0) {
    return allTags;
  }

  // Default tags if none selected
  return [
    { id: 'stressed', label: 'Stressed', emoji: '😰', color: '#ef4444' },
    { id: 'happy', label: 'Happy', emoji: '😊', color: '#eab308' },
    { id: 'tired', label: 'Tired', emoji: '😴', color: '#6366f1' },
    { id: 'productive', label: 'Productive', emoji: '🎯', color: '#14b8a6' },
    { id: 'studying', label: 'Studying', emoji: '📚', color: '#4a9eff' },
    { id: 'socializing', label: 'Socializing', emoji: '💬', color: '#a855f7' }
  ];
};

// Default location tags (used as fallback if profile.locations is empty)
const getLocationTags = (profile) => {
  if (profile.locations && profile.locations.length > 0) {
    return profile.locations;
  }
  // Fallback for existing users who haven't set up locations yet
  return [
    { id: 'home', label: 'Home', emoji: '🏠' },
    { id: 'school-loc', label: 'School', emoji: '🏫' },
    { id: 'gym', label: 'Gym', emoji: '🏋️' },
    { id: 'other', label: 'Other', emoji: '📍' }
  ];
};

// Components
const Slider = ({ value, onChange, color, label, icon: Icon }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = React.useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    onChange(Math.round(percent / 10));
  }, [onChange]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleTouchMove = useCallback((e) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', () => setIsDragging(false));
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', () => setIsDragging(false));
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', () => setIsDragging(false));
    };
  }, [isDragging, handleMouseMove, handleTouchMove]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        {Icon && <Icon size={14} />}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-mono font-bold" style={{ color }}>{value}</div>
      <div
        ref={sliderRef}
        className="w-full h-2 bg-zinc-800 rounded-full cursor-pointer relative"
        onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
        onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX); }}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${value * 10}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-transform hover:scale-110"
          style={{ left: `${value * 10}%`, transform: `translate(-50%, -50%)` }}
        />
      </div>
    </div>
  );
};

const Tag = ({ tag, selected, onClick, size = 'normal' }) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-1.5 rounded-lg transition-all duration-200 border
      ${size === 'small' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'}
      ${selected
        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white'
        : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}
    `}
  >
    <span>{tag.emoji}</span>
    <span>{tag.label}</span>
  </button>
);

const MetricCard = ({ label, value, change, icon: Icon, color }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-zinc-500 text-sm">{label}</span>
      {Icon && <Icon size={16} className="text-zinc-600" />}
    </div>
    <div className="flex items-end gap-2">
      <span className="text-2xl font-mono font-bold" style={{ color }}>{value}</span>
      {change !== undefined && (
        <span className={`text-sm flex items-center gap-0.5 ${change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
          {change > 0 ? <ArrowUp size={14} /> : change < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
          {Math.abs(change)}%
        </span>
      )}
    </div>
  </div>
);

const InsightCard = ({ type, title, children }) => {
  const styles = {
    correlation: 'border-l-purple-500',
    warning: 'border-l-orange-500',
    positive: 'border-l-green-500',
    neutral: 'border-l-blue-500'
  };

  return (
    <div className={`bg-zinc-800/50 rounded-lg p-4 border-l-4 ${styles[type]}`}>
      <div className="font-medium text-sm mb-1">{title}</div>
      <div className="text-zinc-400 text-sm leading-relaxed">{children}</div>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
      ${active
        ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15 border border-blue-500/30 text-white'
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}
    `}
  >
    <Icon size={18} className={active ? 'text-blue-400' : ''} />
    <span className="flex-1 text-left">{label}</span>
    {badge && (
      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded-full">{badge}</span>
    )}
  </button>
);

// Onboarding Component
const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [selectedFactors, setSelectedFactors] = useState(['school', 'sports', 'sleep']);
  const [locationPreset, setLocationPreset] = useState(null);
  const [customLocation1, setCustomLocation1] = useState('');
  const [customLocation2, setCustomLocation2] = useState('');
  const [selectedTags, setSelectedTags] = useState([
    'stressed', 'happy', 'tired', 'productive', 'studying', 'socializing'
  ]);

  const factors = [
    { id: 'school', label: 'School/Work', emoji: '📚', desc: 'Classes, homework, tests' },
    { id: 'sports', label: 'Sports/Exercise', emoji: '🏃', desc: 'Training, games, workouts' },
    { id: 'social', label: 'Relationships', emoji: '💬', desc: 'Friends, family, dating' },
    { id: 'health', label: 'Physical Health', emoji: '❤️', desc: 'Illness, energy, nutrition' },
    { id: 'sleep', label: 'Sleep', emoji: '😴', desc: 'Quality and duration' },
    { id: 'mental', label: 'Mental Health', emoji: '🧠', desc: 'Anxiety, mood, motivation' },
    { id: 'home', label: 'Home Life', emoji: '🏠', desc: 'Family dynamics, environment' },
    { id: 'hobbies', label: 'Hobbies', emoji: '🎮', desc: 'Free time, interests' }
  ];

  const locationPresets = [
    {
      id: 'single',
      label: 'Single home',
      emoji: '🏠',
      desc: 'I live in one place',
      locations: [
        { id: 'home', label: 'Home', emoji: '🏠' },
        { id: 'school-loc', label: 'School', emoji: '🏫' },
        { id: 'gym', label: 'Gym', emoji: '🏋️' },
        { id: 'other', label: 'Other', emoji: '📍' }
      ]
    },
    {
      id: 'two-homes',
      label: 'Two homes',
      emoji: '🏡',
      desc: 'Divorced/separated parents',
      locations: [] // Will be customized
    },
    {
      id: 'college',
      label: 'College student',
      emoji: '🎓',
      desc: 'Home + dorm/apartment',
      locations: [
        { id: 'home', label: 'Home', emoji: '🏠' },
        { id: 'dorm', label: 'Dorm', emoji: '🏢' },
        { id: 'campus', label: 'Campus', emoji: '🎓' },
        { id: 'gym', label: 'Gym', emoji: '🏋️' },
        { id: 'other', label: 'Other', emoji: '📍' }
      ]
    },
    {
      id: 'custom',
      label: 'Custom',
      emoji: '⚙️',
      desc: 'I\'ll set it up myself',
      locations: [
        { id: 'location1', label: 'Location 1', emoji: '📍' },
        { id: 'location2', label: 'Location 2', emoji: '📍' },
        { id: 'other', label: 'Other', emoji: '📍' }
      ]
    }
  ];

  const toggleFactor = (id) => {
    setSelectedFactors(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleTag = (id) => {
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const getLocationsForPreset = () => {
    const preset = locationPresets.find(p => p.id === locationPreset);
    if (!preset) return [];

    if (locationPreset === 'two-homes') {
      const loc1 = customLocation1.trim() || "Mom's";
      const loc2 = customLocation2.trim() || "Dad's";
      return [
        { id: 'home-1', label: loc1, emoji: '🏠' },
        { id: 'home-2', label: loc2, emoji: '🏡' },
        { id: 'school-loc', label: 'School', emoji: '🏫' },
        { id: 'other', label: 'Other', emoji: '📍' }
      ];
    }

    return preset.locations;
  };

  const handleComplete = () => {
    const allPresetTags = getAllPresetTags();
    const customTags = selectedTags.map(tagId => {
      return allPresetTags.find(t => t.id === tagId) || tagId;
    });

    onComplete({
      name,
      factors: selectedFactors,
      locationPreset,
      locations: getLocationsForPreset(),
      customTags,
      setupComplete: true,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-zinc-800'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-fadeIn">
            <div className="text-5xl mb-6">👋</div>
            <h1 className="text-3xl font-bold mb-3">Welcome to Pattern</h1>
            <p className="text-zinc-400 text-lg mb-8">
              Understand yourself better by tracking what affects your energy, mood, and life.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Zap size={20} className="text-blue-400" /></div>
                <div>
                  <div className="font-medium mb-1">Track daily metrics</div>
                  <div className="text-sm text-zinc-500">Quick check-ins on energy, mood, stress, and sleep</div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <div className="p-2 bg-purple-500/20 rounded-lg"><Search size={20} className="text-purple-400" /></div>
                <div>
                  <div className="font-medium mb-1">Discover patterns</div>
                  <div className="text-sm text-zinc-500">See how different factors affect how you feel</div>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                <div className="p-2 bg-green-500/20 rounded-lg"><TrendingUp size={20} className="text-green-400" /></div>
                <div>
                  <div className="font-medium mb-1">Improve over time</div>
                  <div className="text-sm text-zinc-500">Use insights to make better decisions</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium text-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-2">What should we call you?</h2>
            <p className="text-zinc-400 mb-6">This is just for personalization.</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-lg focus:outline-none focus:border-blue-500 transition-colors mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-2">Where do you spend your time?</h2>
            <p className="text-zinc-400 mb-6">Choose a preset that fits your situation. You can customize this later.</p>
            <div className="grid gap-3 mb-6">
              {locationPresets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setLocationPreset(preset.id)}
                  className={`
                    p-4 rounded-xl border text-left transition-all duration-200
                    ${locationPreset === preset.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{preset.emoji}</div>
                    <div className="flex-1">
                      <div className="font-medium mb-0.5">{preset.label}</div>
                      <div className="text-xs text-zinc-500">{preset.desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom naming for two homes */}
            {locationPreset === 'two-homes' && (
              <div className="mb-6 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                <div>
                  <label className="text-sm text-zinc-400 block mb-2">First home name</label>
                  <input
                    type="text"
                    value={customLocation1}
                    onChange={(e) => setCustomLocation1(e.target.value)}
                    placeholder="e.g., Mom's, Dad's, Home"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-2">Second home name</label>
                  <input
                    type="text"
                    value={customLocation2}
                    onChange={(e) => setCustomLocation2(e.target.value)}
                    placeholder="e.g., Dad's, Mom's, Apartment"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-zinc-500">Leave blank to use defaults (Mom's and Dad's)</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!locationPreset}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-2">What affects your life most?</h2>
            <p className="text-zinc-400 mb-6">Select the factors you want to track. You can change these later.</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {factors.map(factor => (
                <button
                  key={factor.id}
                  onClick={() => toggleFactor(factor.id)}
                  className={`
                    p-4 rounded-xl border text-left transition-all duration-200
                    ${selectedFactors.includes(factor.id)
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
                  `}
                >
                  <div className="text-xl mb-1">{factor.emoji}</div>
                  <div className="font-medium text-sm">{factor.label}</div>
                  <div className="text-xs text-zinc-500">{factor.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={selectedFactors.length < 2}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fadeIn">
            <h2 className="text-2xl font-bold mb-2">Customize your tags</h2>
            <p className="text-zinc-400 mb-6">Choose tags you'll use to describe your days. Select from presets or add your own later.</p>

            <div className="space-y-6 mb-6 max-h-96 overflow-y-auto">
              {Object.entries(presetTags).map(([category, tags]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-zinc-500 mb-3 capitalize">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`
                          flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 border
                          ${selectedTags.includes(tag.id)
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white'
                            : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}
                        `}
                      >
                        <span>{tag.emoji}</span>
                        <span>{tag.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-zinc-400">
                <span className="text-blue-400 font-medium">{selectedTags.length} tags selected</span> - You can add custom tags and edit these anytime in Settings.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                disabled={selectedTags.length < 3}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Start Tracking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Event Modal Component
const EventModal = ({ isOpen, onClose, onSave, editEvent = null, initialDate = null, initialStartTime = null, initialEndTime = null, categories = [], onCreateCategory }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('recurring');
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [emoji, setEmoji] = useState('📅');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#4a9eff');

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || '');
      setType(editEvent.type || 'recurring');
      setDaysOfWeek(editEvent.daysOfWeek || []);
      setDate(editEvent.date || '');
      setStartTime(editEvent.startTime || '');
      setEndTime(editEvent.endTime || '');
      setCategoryId(editEvent.categoryId || (categories.length > 0 ? categories[0].id : ''));
      setEmoji(editEvent.emoji || '📅');
    } else {
      setTitle('');
      setType(initialDate ? 'one-time' : 'recurring');
      setDaysOfWeek([]);
      setDate(initialDate ? new Date(initialDate).toISOString().split('T')[0] : '');
      setStartTime(initialStartTime || '');
      setEndTime(initialEndTime || '');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setEmoji('📅');
    }
  }, [editEvent, isOpen, initialDate, initialStartTime, initialEndTime, categories]);

  const toggleDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory = {
      id: `cat-${Date.now()}`,
      name: newCategoryName.trim(),
      color: newCategoryColor
    };

    if (onCreateCategory) {
      onCreateCategory(newCategory);
    }

    // Auto-select the new category
    setCategoryId(newCategory.id);

    // Reset form
    setNewCategoryName('');
    setNewCategoryColor('#4a9eff');
    setShowCategoryForm(false);
  };

  const handleSave = () => {
    const event = {
      id: editEvent?.id || Date.now().toString(),
      title,
      type,
      categoryId,
      emoji,
      startTime,
      endTime,
      ...(type === 'recurring' ? { daysOfWeek } : { date })
    };
    onSave(event);
    onClose();
  };

  if (!isOpen) return null;

  const days = [
    { id: 'monday', label: 'Mon', full: 'Monday' },
    { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
    { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
    { id: 'thursday', label: 'Thu', full: 'Thursday' },
    { id: 'friday', label: 'Fri', full: 'Friday' },
    { id: 'saturday', label: 'Sat', full: 'Saturday' },
    { id: 'sunday', label: 'Sun', full: 'Sunday' }
  ];

  const emojiOptions = ['📅', '📚', '🏃', '💼', '🎮', '🎨', '🎵', '⚽', '🏀', '🏋️', '🧘', '👥', '💡', '🔬', '🎭', '✏️'];

  const isValid = title.trim() && ((type === 'recurring' && daysOfWeek.length > 0) || (type === 'one-time' && date));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{editEvent ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title and Emoji */}
          <div>
            <label className="text-sm font-medium text-zinc-400 block mb-3">Event Details</label>
            <div className="flex gap-3">
              <select
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                className="px-3 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-xl focus:outline-none focus:border-blue-500"
              >
                {emojiOptions.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event name (e.g., Wrestling practice)"
                className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="text-sm font-medium text-zinc-400 block mb-3">Event Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('recurring')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  type === 'recurring'
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium mb-1">Recurring</div>
                <div className="text-xs text-zinc-500">Repeats weekly</div>
              </button>
              <button
                onClick={() => setType('one-time')}
                className={`p-4 rounded-xl border text-left transition-all ${
                  type === 'one-time'
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium mb-1">One-time</div>
                <div className="text-xs text-zinc-500">Single date</div>
              </button>
            </div>
          </div>

          {/* Days of Week (Recurring) */}
          {type === 'recurring' && (
            <div>
              <label className="text-sm font-medium text-zinc-400 block mb-3">Days</label>
              <div className="grid grid-cols-7 gap-2">
                {days.map(day => (
                  <button
                    key={day.id}
                    onClick={() => toggleDay(day.id)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                      daysOfWeek.includes(day.id)
                        ? 'bg-blue-500/20 border border-blue-500/50 text-blue-400'
                        : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                    title={day.full}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date (One-time) */}
          {type === 'one-time' && (
            <div>
              <label className="text-sm font-medium text-zinc-400 block mb-3">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Time Range */}
          <div>
            <label className="text-sm font-medium text-zinc-400 block mb-3">Time (optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-2">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-zinc-400 block mb-3">Category</label>

            {categories.length === 0 && !showCategoryForm ? (
              <div className="p-6 bg-zinc-800/30 border border-dashed border-zinc-700 rounded-xl text-center">
                <p className="text-sm text-zinc-500 mb-3">No categories yet. Create your first category to organize your events!</p>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  Create Category
                </button>
              </div>
            ) : showCategoryForm ? (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Create category</h4>
                  <button onClick={() => setShowCategoryForm(false)} className="text-zinc-500 hover:text-zinc-400">
                    <X size={16} />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Category name</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                    placeholder="Category name"
                    autoFocus
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-500 block mb-2">Color</label>
                  <div className="flex gap-2">
                    {eventColors.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setNewCategoryColor(c.color)}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          newCategoryColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCategoryForm(false);
                      setNewCategoryName('');
                      setNewCategoryColor('#4a9eff');
                    }}
                    className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="flex-1 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      className={`px-4 py-3 rounded-xl transition-all border-2 ${
                        categoryId === cat.id
                          ? 'border-white/30 shadow-lg'
                          : 'border-transparent hover:border-white/10'
                      }`}
                      style={{
                        backgroundColor: categoryId === cat.id ? cat.color : `${cat.color}40`,
                        color: categoryId === cat.id ? 'white' : '#a1a1aa'
                      }}
                    >
                      <span className="font-medium">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowCategoryForm(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 hover:bg-zinc-800 transition-colors text-sm text-zinc-500"
                >
                  <Plus size={14} />
                  <span>Add category</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editEvent ? 'Save Changes' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Entry Modal Component
const EntryModal = ({ isOpen, onClose, onSave, editEntry = null, locationTags = [], events = [], userTags = [], allEntries = [], onCreateCustomTag, categories = [], habits = [] }) => {
  const [metrics, setMetrics] = useState({ energy: 5, mood: 5, stress: 5, sleep: 5 });
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [showCustomTagForm, setShowCustomTagForm] = useState(false);
  const [customTagName, setCustomTagName] = useState('');
  const [customTagEmoji, setCustomTagEmoji] = useState('🏷️');

  useEffect(() => {
    if (editEntry) {
      setMetrics(editEntry.metrics || { energy: 5, mood: 5, stress: 5, sleep: 5 });
      setSelectedTags(editEntry.tags || []);
      setSelectedEvents(editEntry.events || []);
      setSelectedHabits(editEntry.habits || []);
      setLocation(editEntry.location || '');
      setNote(editEntry.note || '');
    } else {
      setMetrics({ energy: 5, mood: 5, stress: 5, sleep: 5 });
      setSelectedTags([]);
      setSelectedEvents([]);
      setSelectedHabits([]);
      setLocation('');
      setNote('');
    }
  }, [editEntry, isOpen]);

  const toggleTag = (id) => {
    setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleEvent = (id) => {
    setSelectedEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const toggleHabit = (id) => {
    setSelectedHabits(prev => prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]);
  };

  const handleCreateCustomTag = () => {
    if (!customTagName.trim()) return;

    const newTag = {
      id: `custom-${Date.now()}`,
      label: customTagName.trim(),
      emoji: customTagEmoji,
      color: '#a855f7' // Default purple color for custom tags
    };

    if (onCreateCustomTag) {
      onCreateCustomTag(newTag);
    }

    // Auto-select the new tag
    setSelectedTags(prev => [...prev, newTag.id]);

    // Reset form
    setCustomTagName('');
    setCustomTagEmoji('🏷️');
    setShowCustomTagForm(false);
  };

  const handleSave = () => {
    onSave({
      id: editEntry?.id || Date.now().toString(),
      timestamp: editEntry?.timestamp || new Date().toISOString(),
      metrics,
      tags: selectedTags,
      events: selectedEvents,
      habits: selectedHabits,
      location,
      note
    });
    onClose();
  };

  // Get suggested events based on current time
  const now = new Date();
  const activeEvents = getActiveEvents(events, now);
  const todayEvents = getEventsForDate(events, now);
  const suggestedEvents = activeEvents.length > 0 ? activeEvents : todayEvents.slice(0, 5);

  // Sort tags by usage frequency
  const sortedTags = React.useMemo(() => {
    if (!allEntries || allEntries.length === 0) return userTags;

    const tagCounts = {};
    allEntries.forEach(entry => {
      entry.tags?.forEach(tagId => {
        tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
      });
    });

    return [...userTags].sort((a, b) => {
      const countA = tagCounts[a.id] || 0;
      const countB = tagCounts[b.id] || 0;
      return countB - countA; // Sort by most used first
    });
  }, [userTags, allEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{editEntry ? 'Edit Entry' : 'New Entry'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Metrics */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-4">How are you feeling?</h3>
            <div className="grid grid-cols-2 gap-6">
              <Slider value={metrics.energy} onChange={v => setMetrics(m => ({ ...m, energy: v }))} color="#f97316" label="Energy" icon={Zap} />
              <Slider value={metrics.mood} onChange={v => setMetrics(m => ({ ...m, mood: v }))} color="#a855f7" label="Mood" icon={Target} />
              <Slider value={metrics.stress} onChange={v => setMetrics(m => ({ ...m, stress: v }))} color="#ef4444" label="Stress" icon={Flame} />
              <Slider value={metrics.sleep} onChange={v => setMetrics(m => ({ ...m, sleep: v }))} color="#4a9eff" label="Sleep" icon={Moon} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">What's going on?</h3>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(tag => (
                <Tag key={tag.id} tag={tag} selected={selectedTags.includes(tag.id)} onClick={() => toggleTag(tag.id)} size="small" />
              ))}

              {/* Create custom tag button */}
              {!showCustomTagForm && (
                <button
                  onClick={() => setShowCustomTagForm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create custom</span>
                </button>
              )}
            </div>

            {/* Custom tag creation form */}
            {showCustomTagForm && (
              <div className="mt-3 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Create custom tag</h4>
                  <button onClick={() => setShowCustomTagForm(false)} className="text-zinc-500 hover:text-zinc-400">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagEmoji}
                    onChange={(e) => setCustomTagEmoji(e.target.value)}
                    placeholder="🏷️"
                    maxLength={2}
                    className="w-16 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xl focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={customTagName}
                    onChange={(e) => setCustomTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomTag()}
                    placeholder="Tag name"
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCustomTagForm(false);
                      setCustomTagName('');
                      setCustomTagEmoji('🏷️');
                    }}
                    className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomTag}
                    disabled={!customTagName.trim()}
                    className="flex-1 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Events */}
          {suggestedEvents.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">
                {activeEvents.length > 0 ? 'Happening now' : "Today's schedule"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedEvents.map(event => {
                  const category = categories.find(c => c.id === event.categoryId);
                  return (
                    <button
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 border
                        ${selectedEvents.includes(event.id)
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-white'
                          : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}
                      `}
                      style={selectedEvents.includes(event.id) ? { borderLeftWidth: '3px', borderLeftColor: category?.color } : {}}
                    >
                      <span>{event.emoji}</span>
                      <span>{event.title}</span>
                      {event.startTime && (
                        <span className="text-xs opacity-70">• {formatTime12Hour(event.startTime)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Habits */}
          {habits && habits.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Daily Habits</h3>
              <div className="grid grid-cols-2 gap-2">
                {habits.map(habit => (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border
                      ${selectedHabits.includes(habit.id)
                        ? 'border-2'
                        : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'}
                    `}
                    style={selectedHabits.includes(habit.id) ? {
                      backgroundColor: `${habit.color}20`,
                      borderColor: habit.color,
                      color: 'white'
                    } : {}}
                  >
                    <span className="text-lg">{habit.emoji}</span>
                    <span className="flex-1 text-left">{habit.label}</span>
                    {selectedHabits.includes(habit.id) && (
                      <Check size={16} className="flex-shrink-0" style={{ color: habit.color }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Where are you?</h3>
            <div className="flex flex-wrap gap-2">
              {locationTags.map(tag => (
                <Tag key={tag.id} tag={tag} selected={location === tag.id} onClick={() => setLocation(location === tag.id ? '' : tag.id)} size="small" />
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Notes (optional)</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm resize-none h-24 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity">
            {editEntry ? 'Save Changes' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Dashboard View
const DashboardView = ({ entries, profile, events = [], onNewEntry, userTags = [], categories = [] }) => {
  const today = new Date().toDateString();
  const todayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === today);
  const last7Days = entries.filter(e => new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const prev7Days = entries.filter(e => {
    const d = new Date(e.timestamp);
    return d > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) && d <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  });

  const avgMetric = (arr, key) => arr.length ? (arr.reduce((s, e) => s + (e.metrics?.[key] || 0), 0) / arr.length).toFixed(1) : '-';
  const calcChange = (curr, prev, key) => {
    const c = parseFloat(avgMetric(curr, key));
    const p = parseFloat(avgMetric(prev, key));
    if (isNaN(c) || isNaN(p) || p === 0) return 0;
    return Math.round(((c - p) / p) * 100);
  };

  // Weekly heatmap data
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const getWeekData = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    return weekDays.map((day, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === date.toDateString());
      const avg = dayEntries.length
        ? (dayEntries.reduce((s, e) => s + (e.metrics?.energy || 0) + (e.metrics?.mood || 0), 0) / (dayEntries.length * 2))
        : 0;
      return { day, date: date.toDateString(), avg, count: dayEntries.length };
    });
  };

  const weekData = getWeekData();
  const streak = (() => {
    let count = 0;
    let d = new Date();
    while (true) {
      const dayStr = d.toDateString();
      if (entries.some(e => new Date(e.timestamp).toDateString() === dayStr)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else break;
    }
    return count;
  })();

  // Generate multi-factor correlation insights
  const generateInsights = () => {
    const insights = [];

    if (last7Days.length >= 3) {
      // Helper to find tag by ID
      const getTagName = (tagId) => {
        const tag = userTags.find(t => t.id === tagId);
        return tag ? tag.label : tagId;
      };

      // Helper to find location name
      const getLocationName = (locId) => {
        const loc = profile.locations?.find(l => l.id === locId);
        return loc ? `${loc.emoji} ${loc.label}` : locId;
      };

      // 1. Sleep + Events correlations
      if (events.length > 0) {
        const eventCounts = {};
        last7Days.forEach(entry => {
          if (entry.events?.length > 0) {
            entry.events.forEach(eventId => {
              eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
            });
          }
        });

        const commonEventIds = Object.keys(eventCounts).filter(id => eventCounts[id] >= 2);

        commonEventIds.forEach(eventId => {
          const event = events.find(e => e.id === eventId);
          if (!event) return;

          // Good sleep WITH this event
          const goodSleepWithEvent = last7Days.filter(e =>
            e.metrics?.sleep >= 7 && e.events?.includes(eventId)
          );

          // Good sleep WITHOUT this event
          const goodSleepWithoutEvent = last7Days.filter(e =>
            e.metrics?.sleep >= 7 && !e.events?.includes(eventId)
          );

          if (goodSleepWithEvent.length >= 2 && goodSleepWithoutEvent.length >= 2) {
            const moodWith = avgMetric(goodSleepWithEvent, 'mood');
            const moodWithout = avgMetric(goodSleepWithoutEvent, 'mood');
            const diff = parseFloat(moodWith) - parseFloat(moodWithout);

            if (Math.abs(diff) >= 1.5) {
              insights.push({
                type: diff > 0 ? 'positive' : 'correlation',
                title: `Sleep + ${event.title} Pattern`,
                text: `When you sleep 7+ hours ${diff > 0 ? 'WITH' : 'WITHOUT'} ${event.title}, your mood averages ${diff > 0 ? moodWith : moodWithout} vs ${diff > 0 ? moodWithout : moodWith}.`
              });
            }
          }
        });
      }

      // 2. Location + Tags correlations
      if (profile.locations?.length > 0) {
        profile.locations.forEach(location => {
          const atLocation = last7Days.filter(e => e.location === location.id);

          if (atLocation.length >= 2) {
            // Check for stressed at this location
            const stressedAtLocation = atLocation.filter(e =>
              e.tags?.some(t => getTagName(t).toLowerCase().includes('stress'))
            );

            if (stressedAtLocation.length >= 2) {
              const energyWithStress = avgMetric(stressedAtLocation, 'energy');
              const atLocationNoStress = atLocation.filter(e =>
                !e.tags?.some(t => getTagName(t).toLowerCase().includes('stress'))
              );

              if (atLocationNoStress.length >= 1) {
                const energyNoStress = avgMetric(atLocationNoStress, 'energy');
                const diff = parseFloat(energyWithStress) - parseFloat(energyNoStress);

                if (Math.abs(diff) >= 1) {
                  insights.push({
                    type: 'correlation',
                    title: `${location.emoji} ${location.label} + Stress`,
                    text: `Days at ${location.label} with stress, your energy drops to ${energyWithStress} (vs ${energyNoStress} without stress).`
                  });
                }
              }
            }

            // Check for specific tag combinations at location
            const commonTags = {};
            atLocation.forEach(entry => {
              entry.tags?.forEach(tag => {
                commonTags[tag] = (commonTags[tag] || 0) + 1;
              });
            });

            const frequentTags = Object.keys(commonTags).filter(t => commonTags[t] >= 2);
            frequentTags.forEach(tagId => {
              const withTag = atLocation.filter(e => e.tags?.includes(tagId));
              const withoutTag = atLocation.filter(e => !e.tags?.includes(tagId));

              if (withTag.length >= 2 && withoutTag.length >= 1) {
                const moodWith = avgMetric(withTag, 'mood');
                const moodWithout = avgMetric(withoutTag, 'mood');
                const diff = parseFloat(moodWith) - parseFloat(moodWithout);

                if (Math.abs(diff) >= 1.5) {
                  insights.push({
                    type: diff > 0 ? 'positive' : 'warning',
                    title: `${location.emoji} ${location.label} Pattern`,
                    text: `At ${location.label} with ${getTagName(tagId)}, your mood averages ${moodWith} vs ${moodWithout} without.`
                  });
                }
              }
            });
          }
        });
      }

      // 3. Events + Metrics combinations (stress, energy)
      if (events.length > 0) {
        const eventCounts = {};
        last7Days.forEach(entry => {
          entry.events?.forEach(eventId => {
            eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
          });
        });

        const commonEvents = Object.keys(eventCounts).filter(id => eventCounts[id] >= 3);

        commonEvents.forEach(eventId => {
          const event = events.find(e => e.id === eventId);
          if (!event) return;

          const withEvent = last7Days.filter(e => e.events?.includes(eventId));
          const withoutEvent = last7Days.filter(e => !e.events?.includes(eventId));

          if (withEvent.length >= 2 && withoutEvent.length >= 2) {
            const stressWith = avgMetric(withEvent, 'stress');
            const stressWithout = avgMetric(withoutEvent, 'stress');
            const diff = parseFloat(stressWith) - parseFloat(stressWithout);

            if (Math.abs(diff) >= 1.5) {
              insights.push({
                type: diff > 0 ? 'warning' : 'positive',
                title: `${event.title} Stress Level`,
                text: `Your stress averages ${stressWith} on days with ${event.title} vs ${stressWithout} on days without.`
              });
            }
          }
        });
      }

      // 4. Location + Metrics (without tags)
      if (profile.locations?.length > 0) {
        profile.locations.forEach(location => {
          const atLocation = last7Days.filter(e => e.location === location.id);
          const notAtLocation = last7Days.filter(e => e.location !== location.id && e.location);

          if (atLocation.length >= 2 && notAtLocation.length >= 2) {
            const energyAt = avgMetric(atLocation, 'energy');
            const energyAway = avgMetric(notAtLocation, 'energy');
            const diff = parseFloat(energyAt) - parseFloat(energyAway);

            if (Math.abs(diff) >= 1.5) {
              insights.push({
                type: diff > 0 ? 'positive' : 'correlation',
                title: `${location.emoji} ${location.label} Energy`,
                text: `Your energy at ${location.label} averages ${energyAt} vs ${energyAway} at other locations.`
              });
            }
          }
        });
      }

      // 5. Multiple tags combinations
      const tagCombos = {};
      last7Days.forEach(entry => {
        if (entry.tags && entry.tags.length >= 2) {
          // Check all pairs of tags
          for (let i = 0; i < entry.tags.length; i++) {
            for (let j = i + 1; j < entry.tags.length; j++) {
              const key = [entry.tags[i], entry.tags[j]].sort().join('+');
              if (!tagCombos[key]) {
                tagCombos[key] = [];
              }
              tagCombos[key].push(entry);
            }
          }
        }
      });

      Object.keys(tagCombos).forEach(combo => {
        const entries = tagCombos[combo];
        if (entries.length >= 2) {
          const [tag1, tag2] = combo.split('+');
          const avgEnergy = avgMetric(entries, 'energy');
          const avgMood = avgMetric(entries, 'mood');

          // Compare to overall average
          const overallEnergy = avgMetric(last7Days, 'energy');
          const energyDiff = parseFloat(avgEnergy) - parseFloat(overallEnergy);

          if (Math.abs(energyDiff) >= 2) {
            insights.push({
              type: energyDiff < 0 ? 'warning' : 'positive',
              title: `Tag Combination Pattern`,
              text: `When you log both ${getTagName(tag1)} and ${getTagName(tag2)}, your energy averages ${avgEnergy} (${energyDiff > 0 ? '+' : ''}${energyDiff.toFixed(1)} vs usual).`
            });
          }
        }
      });

      // 6. Basic single-factor fallbacks (if no multi-factor insights found)
      if (insights.length < 2) {
        const highSleepEntries = last7Days.filter(e => e.metrics?.sleep >= 7);
        const lowSleepEntries = last7Days.filter(e => e.metrics?.sleep < 6);
        if (highSleepEntries.length > 0 && lowSleepEntries.length > 0) {
          const highSleepEnergy = avgMetric(highSleepEntries, 'energy');
          const lowSleepEnergy = avgMetric(lowSleepEntries, 'energy');
          if (parseFloat(highSleepEnergy) > parseFloat(lowSleepEnergy)) {
            insights.push({
              type: 'correlation',
              title: 'Sleep → Energy Connection',
              text: `When you rate sleep 7+, your energy averages ${highSleepEnergy} vs ${lowSleepEnergy} on lower sleep days.`
            });
          }
        }
      }
    }

    if (streak >= 3 && insights.length < 5) {
      insights.push({
        type: 'positive',
        title: 'Consistency Wins',
        text: `You're on a ${streak}-day logging streak! More data = deeper insights into your patterns.`
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'neutral',
        title: 'Building Your Baseline',
        text: 'Keep logging daily to start seeing meaningful patterns. We need about 2 weeks of data for multi-factor insights.'
      });
    }

    return insights.slice(0, 6); // Limit to top 6 insights
  };

  const insights = generateInsights();

  // Generate Tomorrow's Forecast
  const generateTomorrowForecast = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEvents = getEventsForDate(events, tomorrow);

    if (tomorrowEvents.length === 0) {
      return null; // No forecast if no events scheduled
    }

    // Find historical entries that had similar events
    const tomorrowEventIds = tomorrowEvents.map(e => e.id);
    const similarDays = entries.filter(entry => {
      if (!entry.events || entry.events.length === 0) return false;
      // Check if entry has at least one of tomorrow's events
      return entry.events.some(eventId => tomorrowEventIds.includes(eventId));
    });

    if (similarDays.length < 2) {
      // Not enough data for prediction
      return {
        tomorrowEvents,
        prediction: null,
        confidence: 'low',
        message: 'Not enough historical data to predict - this is a new schedule combination.'
      };
    }

    // Calculate averages from similar days
    const avgEnergy = similarDays.reduce((s, e) => s + (e.metrics?.energy || 0), 0) / similarDays.length;
    const avgMood = similarDays.reduce((s, e) => s + (e.metrics?.mood || 0), 0) / similarDays.length;
    const avgStress = similarDays.reduce((s, e) => s + (e.metrics?.stress || 0), 0) / similarDays.length;

    // Calculate confidence based on sample size and consistency
    let confidence = 'medium';
    if (similarDays.length >= 5) confidence = 'high';
    else if (similarDays.length < 3) confidence = 'low';

    // Calculate variance to adjust confidence
    const energyVariance = similarDays.reduce((s, e) => s + Math.pow((e.metrics?.energy || 0) - avgEnergy, 2), 0) / similarDays.length;
    if (energyVariance > 6 && confidence === 'high') confidence = 'medium';

    // Generate descriptive message
    let message = '';
    const eventNames = tomorrowEvents.map(e => e.title).join(' and ');

    if (avgEnergy < 5) {
      message = `Tomorrow might be tough - you have ${eventNames}, and your energy usually dips to ${avgEnergy.toFixed(1)} on days like this.`;
    } else if (avgEnergy >= 7) {
      message = `Tomorrow looks good! With ${eventNames}, your energy typically stays high at ${avgEnergy.toFixed(1)}.`;
    } else {
      message = `Tomorrow looks manageable - ${eventNames} on your schedule, energy usually around ${avgEnergy.toFixed(1)}.`;
    }

    // Add stress warning if high
    if (avgStress >= 7) {
      message += ` Stress tends to spike to ${avgStress.toFixed(1)} on days with this schedule.`;
    }

    return {
      tomorrowEvents,
      prediction: {
        energy: avgEnergy.toFixed(1),
        mood: avgMood.toFixed(1),
        stress: avgStress.toFixed(1)
      },
      confidence,
      sampleSize: similarDays.length,
      message
    };
  };

  const tomorrowForecast = generateTomorrowForecast();

  // Calculate habit streaks
  const calculateHabitStreaks = () => {
    if (!profile.habits || profile.habits.length === 0) return [];

    return profile.habits.map(habit => {
      let streak = 0;
      let d = new Date();
      d.setHours(0, 0, 0, 0);
      const todayStr = new Date().toDateString();
      let isFirstDay = true;
      let maxDaysToCheck = 365; // Prevent infinite loops

      // Count consecutive days from today backwards
      while (maxDaysToCheck > 0) {
        const dayStr = d.toDateString();
        const dayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === dayStr);

        // Check if habit was completed on this day
        const habitCompleted = dayEntries.some(entry => entry.habits?.includes(habit.id));

        if (habitCompleted) {
          streak++;
          d.setDate(d.getDate() - 1);
          isFirstDay = false;
        } else {
          // If it's today and no entry yet, don't break the streak if we have a streak going
          if (dayStr === todayStr && streak > 0) {
            d.setDate(d.getDate() - 1);
            isFirstDay = false;
            maxDaysToCheck--;
            continue;
          }
          // If it's the first day (today) and no entry, streak is 0
          break;
        }
        maxDaysToCheck--;
      }

      // Check if completed today
      const todayEntries = entries.filter(e => new Date(e.timestamp).toDateString() === todayStr);
      const completedToday = todayEntries.some(entry => entry.habits?.includes(habit.id));

      return {
        habit,
        streak,
        completedToday
      };
    });
  };

  const habitStreaks = calculateHabitStreaks();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-zinc-500 text-sm">{formatDate(new Date())}</div>
          <h1 className="text-2xl font-semibold">Hey {profile.name} 👋</h1>
        </div>
        <button
          onClick={onNewEntry}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Log Entry
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Avg Energy" value={avgMetric(last7Days, 'energy')} change={calcChange(last7Days, prev7Days, 'energy')} icon={Zap} color="#f97316" />
        <MetricCard label="Avg Mood" value={avgMetric(last7Days, 'mood')} change={calcChange(last7Days, prev7Days, 'mood')} icon={Target} color="#a855f7" />
        <MetricCard label="Avg Stress" value={avgMetric(last7Days, 'stress')} change={calcChange(last7Days, prev7Days, 'stress')} icon={Flame} color="#ef4444" />
        <MetricCard label="Streak" value={`${streak}d`} icon={Calendar} color="#22c55e" />
      </div>

      {/* Habit Streaks */}
      {habitStreaks.length > 0 && (
        <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-6">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Target size={18} className="text-green-400" />
            Habit Streaks
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {habitStreaks.map(({ habit, streak, completedToday }) => (
              <div
                key={habit.id}
                className="p-4 rounded-xl border transition-all"
                style={{
                  backgroundColor: `${habit.color}15`,
                  borderColor: completedToday ? habit.color : `${habit.color}40`
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{habit.emoji}</span>
                    <span className="font-medium">{habit.label}</span>
                  </div>
                  {completedToday && (
                    <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: `${habit.color}30`, color: habit.color }}>
                      <Check size={12} />
                      Today
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: habit.color }}>
                    {streak}
                  </span>
                  <span className="text-zinc-400 text-sm">
                    {streak === 1 ? 'day' : 'days'} streak
                  </span>
                </div>
                {streak > 0 && !completedToday && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Log an entry today to continue!
                  </div>
                )}
                {streak === 0 && (
                  <div className="mt-2 text-xs text-zinc-500">
                    Start your streak today!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week Overview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">This Week</h2>
            <p className="text-sm text-zinc-500">Daily energy & mood average</p>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekData.map((d, i) => (
            <div key={i} className="text-center">
              <div className="text-xs text-zinc-500 mb-2">{d.day}</div>
              <div
                className={`h-16 rounded-lg flex items-center justify-center text-sm font-mono transition-all ${d.count > 0 ? 'bg-gradient-to-b from-blue-500/30 to-purple-500/30' : 'bg-zinc-800/50'}`}
                style={{ opacity: d.count > 0 ? 0.4 + (d.avg / 10) * 0.6 : 0.3 }}
              >
                {d.count > 0 ? d.avg.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-zinc-600 mt-1">{d.count > 0 ? `${d.count}` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Search size={18} className="text-zinc-400" />
          Insights
        </h2>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={i} type={insight.type} title={insight.title}>
              {insight.text}
            </InsightCard>
          ))}
        </div>
      </div>

      {/* Tomorrow's Forecast */}
      {tomorrowForecast && (
        <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/30 rounded-2xl p-6">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-400" />
            Tomorrow's Forecast
            <span className={`ml-auto text-xs px-2 py-1 rounded-full ${
              tomorrowForecast.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
              tomorrowForecast.confidence === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-zinc-500/20 text-zinc-400'
            }`}>
              {tomorrowForecast.confidence === 'high' ? '🎯 High Confidence' :
               tomorrowForecast.confidence === 'medium' ? '📊 Medium Confidence' :
               '🔮 Low Confidence'}
            </span>
          </h2>

          <div className="space-y-4">
            {/* Schedule Preview */}
            <div className="space-y-2">
              {tomorrowForecast.tomorrowEvents.map(event => {
                const category = categories.find(c => c.id === event.categoryId);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-lg border-l-2"
                    style={{ borderLeftColor: category?.color || '#6366f1' }}
                  >
                    <span className="text-lg">{event.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.startTime && event.endTime && (
                        <div className="text-xs text-zinc-500">{formatTime12Hour(event.startTime)} - {formatTime12Hour(event.endTime)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prediction */}
            <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-700">
              <p className="text-sm text-zinc-300 mb-3">{tomorrowForecast.message}</p>

              {tomorrowForecast.prediction && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400">⚡</span>
                    <span className="text-zinc-500">Energy</span>
                    <span className="font-mono font-bold text-orange-400">{tomorrowForecast.prediction.energy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400">🎯</span>
                    <span className="text-zinc-500">Mood</span>
                    <span className="font-mono font-bold text-purple-400">{tomorrowForecast.prediction.mood}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">🔥</span>
                    <span className="text-zinc-500">Stress</span>
                    <span className="font-mono font-bold text-red-400">{tomorrowForecast.prediction.stress}</span>
                  </div>
                </div>
              )}

              <div className="text-xs text-zinc-600 mt-3">
                Based on {tomorrowForecast.sampleSize} similar day{tomorrowForecast.sampleSize !== 1 ? 's' : ''} in your history
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      {(() => {
        const todayEvents = getEventsForDate(events, new Date());
        if (todayEvents.length === 0) return null;

        return (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-zinc-400" />
              Today's Schedule
            </h2>
            <div className="space-y-2">
              {todayEvents.map(event => {
                const category = categories.find(c => c.id === event.categoryId);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border-l-4"
                    style={{ borderLeftColor: category?.color || '#6366f1' }}
                  >
                    <span className="text-xl">{event.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{event.title}</div>
                      {event.startTime && event.endTime && (
                        <div className="text-xs text-zinc-500">{formatTime12Hour(event.startTime)} - {formatTime12Hour(event.endTime)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Today's Entries */}
      {todayEntries.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-medium mb-4">Today's Entries</h2>
          <div className="space-y-3">
            {todayEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-xl">
                <div className="text-sm text-zinc-500 font-mono">{formatTime(entry.timestamp)}</div>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-orange-400">⚡{entry.metrics?.energy}</span>
                  <span className="text-purple-400">🎯{entry.metrics?.mood}</span>
                  <span className="text-red-400">🔥{entry.metrics?.stress}</span>
                </div>
                {entry.tags?.length > 0 && (
                  <div className="flex gap-1">
                    {entry.tags.slice(0, 3).map(t => {
                      const allTags = getAllPresetTags();
                      const tag = userTags.find(ut => ut.id === t) || allTags.find(at => at.id === t);
                      return tag ? <span key={t} title={tag.label}>{tag.emoji}</span> : null;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Trends View
const TrendsView = ({ entries, userTags = [], events = [] }) => {
  const [viewMode, setViewMode] = useState('trends'); // 'trends' or 'compare'
  const [timeRange, setTimeRange] = useState('7d');
  const [weekA, setWeekA] = useState(0); // 0 = current week, 1 = last week, etc.
  const [weekB, setWeekB] = useState(1); // Compare current week to last week by default

  // Helper: Get week date range
  const getWeekRange = (weeksAgo = 0) => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() - now.getDay() + (weeksAgo === 0 ? 0 : -7 * weeksAgo));
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    return { start: startOfWeek, end: endOfWeek };
  };

  const getRangeDate = () => {
    const now = new Date();
    switch (timeRange) {
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  };

  const filteredEntries = entries.filter(e => new Date(e.timestamp) >= getRangeDate());

  // Prepare chart data - group by day and average
  const chartData = (() => {
    const grouped = {};
    filteredEntries.forEach(e => {
      const day = new Date(e.timestamp).toLocaleDateString();
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    });

    return Object.entries(grouped).map(([day, dayEntries]) => ({
      date: day,
      shortDate: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      energy: +(dayEntries.reduce((s, e) => s + (e.metrics?.energy || 0), 0) / dayEntries.length).toFixed(1),
      mood: +(dayEntries.reduce((s, e) => s + (e.metrics?.mood || 0), 0) / dayEntries.length).toFixed(1),
      stress: +(dayEntries.reduce((s, e) => s + (e.metrics?.stress || 0), 0) / dayEntries.length).toFixed(1),
      sleep: +(dayEntries.reduce((s, e) => s + (e.metrics?.sleep || 0), 0) / dayEntries.length).toFixed(1),
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  })();

  // Tag frequency
  const tagFrequency = (() => {
    const freq = {};
    filteredEntries.forEach(e => {
      e.tags?.forEach(t => {
        freq[t] = (freq[t] || 0) + 1;
      });
    });
    const allTags = getAllPresetTags();
    return Object.entries(freq)
      .map(([id, count]) => {
        const tag = userTags.find(t => t.id === id) || allTags.find(t => t.id === id);
        return tag ? { ...tag, count } : null;
      })
      .filter(t => t && t.label)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  })();

  // Correlation data for radar chart
  const radarData = [
    { factor: 'Sleep', value: chartData.length > 0 ? (chartData.reduce((s, d) => s + d.sleep, 0) / chartData.length) : 0 },
    { factor: 'Energy', value: chartData.length > 0 ? (chartData.reduce((s, d) => s + d.energy, 0) / chartData.length) : 0 },
    { factor: 'Mood', value: chartData.length > 0 ? (chartData.reduce((s, d) => s + d.mood, 0) / chartData.length) : 0 },
    { factor: 'Low Stress', value: chartData.length > 0 ? (10 - chartData.reduce((s, d) => s + d.stress, 0) / chartData.length) : 0 },
  ];

  if (entries.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2">Not enough data yet</h2>
        <p className="text-zinc-400 max-w-sm">Log at least 3 entries to start seeing your trends. The more data, the better the insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold">Trends</h1>

        {/* Mode Toggle */}
        <div className="flex gap-2 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('trends')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'trends' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            📊 Trends
          </button>
          <button
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === 'compare' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
          >
            ⚖️ Compare Weeks
          </button>
        </div>

        {/* Time Range Selector (only in trends mode) */}
        {viewMode === 'trends' && (
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${timeRange === range ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Week Selectors for Compare Mode */}
      {viewMode === 'compare' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Week A Selector */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4">
            <label className="text-sm text-zinc-400 mb-2 block">Week A</label>
            <select
              value={weekA}
              onChange={(e) => setWeekA(parseInt(e.target.value))}
              className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              {[...Array(12)].map((_, i) => {
                const range = getWeekRange(i);
                const label = i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`;
                return (
                  <option key={i} value={i}>
                    {label} ({range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Week B Selector */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
            <label className="text-sm text-zinc-400 mb-2 block">Week B</label>
            <select
              value={weekB}
              onChange={(e) => setWeekB(parseInt(e.target.value))}
              className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              {[...Array(12)].map((_, i) => {
                const range = getWeekRange(i);
                const label = i === 0 ? 'This Week' : i === 1 ? 'Last Week' : `${i} weeks ago`;
                return (
                  <option key={i} value={i}>
                    {label} ({range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {range.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {viewMode === 'compare' && (() => {
        // Get entries for both weeks
        const rangeA = getWeekRange(weekA);
        const rangeB = getWeekRange(weekB);
        const entriesA = entries.filter(e => {
          const date = new Date(e.timestamp);
          return date >= rangeA.start && date <= rangeA.end;
        });
        const entriesB = entries.filter(e => {
          const date = new Date(e.timestamp);
          return date >= rangeB.start && date <= rangeB.end;
        });

        // Calculate average metrics
        const calcAvg = (entries, metric) => {
          if (entries.length === 0) return 0;
          const sum = entries.reduce((s, e) => s + (e.metrics?.[metric] || 0), 0);
          return (sum / entries.length).toFixed(1);
        };

        const metricsA = {
          energy: calcAvg(entriesA, 'energy'),
          mood: calcAvg(entriesA, 'mood'),
          stress: calcAvg(entriesA, 'stress'),
          sleep: calcAvg(entriesA, 'sleep')
        };

        const metricsB = {
          energy: calcAvg(entriesB, 'energy'),
          mood: calcAvg(entriesB, 'mood'),
          stress: calcAvg(entriesB, 'stress'),
          sleep: calcAvg(entriesB, 'sleep')
        };

        // Calculate schedule differences
        const getEventFrequency = (entries) => {
          const freq = {};
          entries.forEach(e => {
            e.events?.forEach(eventId => {
              freq[eventId] = (freq[eventId] || 0) + 1;
            });
          });
          return freq;
        };

        const eventsFreqA = getEventFrequency(entriesA);
        const eventsFreqB = getEventFrequency(entriesB);
        const allEventIds = [...new Set([...Object.keys(eventsFreqA), ...Object.keys(eventsFreqB)])];

        // Calculate tag frequency differences
        const getTagFrequency = (entries) => {
          const freq = {};
          entries.forEach(e => {
            e.tags?.forEach(tagId => {
              freq[tagId] = (freq[tagId] || 0) + 1;
            });
          });
          return freq;
        };

        const tagsFreqA = getTagFrequency(entriesA);
        const tagsFreqB = getTagFrequency(entriesB);
        const allTagIds = [...new Set([...Object.keys(tagsFreqA), ...Object.keys(tagsFreqB)])];

        // Generate insights
        const insights = [];

        // Metric insights
        const energyDiff = parseFloat(metricsA.energy) - parseFloat(metricsB.energy);
        const moodDiff = parseFloat(metricsA.mood) - parseFloat(metricsB.mood);
        const stressDiff = parseFloat(metricsA.stress) - parseFloat(metricsB.stress);

        if (Math.abs(energyDiff) >= 1.5) {
          insights.push({
            type: energyDiff > 0 ? 'positive' : 'neutral',
            text: `Week A had ${Math.abs(energyDiff).toFixed(1)} ${energyDiff > 0 ? 'higher' : 'lower'} energy on average (${metricsA.energy} vs ${metricsB.energy})`
          });
        }

        if (Math.abs(moodDiff) >= 1.5) {
          insights.push({
            type: moodDiff > 0 ? 'positive' : 'neutral',
            text: `Week A had ${Math.abs(moodDiff).toFixed(1)} ${moodDiff > 0 ? 'better' : 'worse'} mood on average (${metricsA.mood} vs ${metricsB.mood})`
          });
        }

        if (Math.abs(stressDiff) >= 1.5) {
          insights.push({
            type: stressDiff < 0 ? 'positive' : 'neutral',
            text: `Week A had ${Math.abs(stressDiff).toFixed(1)} ${stressDiff > 0 ? 'higher' : 'lower'} stress on average (${metricsA.stress} vs ${metricsB.stress})`
          });
        }

        // Event differences
        allEventIds.forEach(eventId => {
          const countA = eventsFreqA[eventId] || 0;
          const countB = eventsFreqB[eventId] || 0;
          const diff = countA - countB;
          if (Math.abs(diff) >= 2) {
            const event = events.find(e => e.id === eventId);
            if (event) {
              insights.push({
                type: 'correlation',
                text: `Week A had ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} instances of "${event.title}" (${countA} vs ${countB})`
              });
            }
          }
        });

        // Tag differences
        const allTags = getAllPresetTags();
        allTagIds.forEach(tagId => {
          const countA = tagsFreqA[tagId] || 0;
          const countB = tagsFreqB[tagId] || 0;
          const diff = countA - countB;
          if (Math.abs(diff) >= 2) {
            const tag = userTags.find(t => t.id === tagId) || allTags.find(t => t.id === tagId);
            if (tag) {
              insights.push({
                type: 'correlation',
                text: `"${tag.label}" appeared ${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} times in Week A (${countA} vs ${countB})`
              });
            }
          }
        });

        if (entriesA.length === 0 || entriesB.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold mb-2">Not enough data</h2>
              <p className="text-zinc-400 max-w-sm">
                {entriesA.length === 0 ? 'Week A has no entries.' : 'Week B has no entries.'} Try selecting different weeks.
              </p>
            </div>
          );
        }

        return (
          <>
            {/* Average Metrics Comparison */}
            <div className="grid md:grid-cols-4 gap-4">
              {['energy', 'mood', 'stress', 'sleep'].map(metric => {
                const valueA = parseFloat(metricsA[metric]);
                const valueB = parseFloat(metricsB[metric]);
                const diff = valueA - valueB;
                const isPositive = metric === 'stress' ? diff < 0 : diff > 0;

                return (
                  <div key={metric} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm text-zinc-400 mb-3 capitalize">{metric}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Week A</span>
                        <span className="text-lg font-semibold">{metricsA[metric]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-purple-400">Week B</span>
                        <span className="text-lg font-semibold">{metricsB[metric]}</span>
                      </div>
                      {Math.abs(diff) >= 0.5 && (
                        <div className={`text-xs mt-2 pt-2 border-t border-zinc-800 flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                          {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          {Math.abs(diff).toFixed(1)} {isPositive ? 'better' : 'worse'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Schedule Differences */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4">Schedule Differences</h2>
              {allEventIds.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {allEventIds.map(eventId => {
                    const event = events.find(e => e.id === eventId);
                    if (!event) return null;
                    const countA = eventsFreqA[eventId] || 0;
                    const countB = eventsFreqB[eventId] || 0;

                    return (
                      <div key={eventId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <span className="text-sm">{event.title}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-blue-400">{countA}x</span>
                          <span className="text-xs text-zinc-600">vs</span>
                          <span className="text-xs text-purple-400">{countB}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">No scheduled events in either week.</p>
              )}
            </div>

            {/* Tag Frequency Comparison */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4">Tag Frequency Comparison</h2>
              {allTagIds.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {allTagIds.map(tagId => {
                    const tag = userTags.find(t => t.id === tagId) || allTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    const countA = tagsFreqA[tagId] || 0;
                    const countB = tagsFreqB[tagId] || 0;

                    return (
                      <div key={tagId} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span>{tag.emoji}</span>
                          <span className="text-sm">{tag.label}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-blue-400">{countA}x</span>
                          <span className="text-xs text-zinc-600">vs</span>
                          <span className="text-xs text-purple-400">{countB}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">No tags logged in either week.</p>
              )}
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/30 rounded-2xl p-6">
                <h2 className="font-medium mb-4 flex items-center gap-2">
                  <Zap size={18} className="text-blue-400" />
                  What's Different?
                </h2>
                <div className="space-y-2">
                  {insights.slice(0, 6).map((insight, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg">
                      <span className="text-xl">
                        {insight.type === 'positive' ? '✨' : insight.type === 'neutral' ? '📊' : '🔍'}
                      </span>
                      <p className="text-sm flex-1">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Trends View (only show when not in compare mode) */}
      {viewMode === 'trends' && (
        <>
          {/* Main Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-medium mb-4">Metrics Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="shortDate" stroke="#52525b" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#52525b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Area type="monotone" dataKey="energy" stroke="#f97316" fill="url(#energyGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mood" stroke="#a855f7" fill="url(#moodGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Energy</div>
              <div className="flex items-center gap-2 text-sm"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Mood</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Tag Frequency */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4">Most Logged Tags</h2>
              {tagFrequency.length > 0 ? (
                <div className="space-y-3">
                  {tagFrequency.map(tag => (
                    <div key={tag.id} className="flex items-center gap-3">
                      <span>{tag.emoji}</span>
                      <span className="flex-1 text-sm">{tag.label}</span>
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(tag.count / tagFrequency[0].count) * 100}%`,
                            background: tag.color
                          }}
                        />
                      </div>
                      <span className="text-sm text-zinc-500 w-8 text-right">{tag.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">Add tags to your entries to see patterns here.</p>
              )}
            </div>

            {/* Balance Radar */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4">Overall Balance</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis dataKey="factor" stroke="#71717a" fontSize={12} />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Stress Chart */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-medium mb-4">Stress Levels</h2>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="shortDate" stroke="#52525b" fontSize={12} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#52525b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  />
                  <Bar dataKey="stress" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Schedule View
const ScheduleView = ({ events, onEditEvent, onDeleteEvent, onNewEvent, onGoogleCalendar, categories = [] }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'recurring', 'one-time'

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.type === filter);

  const recurringEvents = filteredEvents.filter(e => e.type === 'recurring');
  const upcomingOneTimeEvents = filteredEvents.filter(e => {
    if (e.type !== 'one-time') return false;
    return new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0));
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  const EventCard = ({ event }) => {
    const category = categories.find(c => c.id === event.categoryId);

    const getDaysDisplay = () => {
      if (event.type === 'one-time') {
        return formatDate(event.date);
      }
      const dayAbbr = {
        monday: 'M', tuesday: 'T', wednesday: 'W',
        thursday: 'Th', friday: 'F', saturday: 'Sa', sunday: 'Su'
      };
      return event.daysOfWeek.map(d => dayAbbr[d]).join(' ');
    };

    const getTimeDisplay = () => {
      if (!event.startTime && !event.endTime) return 'All day';
      if (!event.endTime) return formatTime12Hour(event.startTime);
      return `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}`;
    };

    return (
      <div
        className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 group hover:border-zinc-700 transition-all"
        style={{ borderLeftWidth: '4px', borderLeftColor: category?.color || '#6366f1' }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{event.emoji}</span>
            <div>
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-zinc-500">{getDaysDisplay()}</div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEditEvent(event)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Edit3 size={14} className="text-zinc-400" />
            </button>
            <button
              onClick={() => onDeleteEvent(event.id)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 size={14} className="text-zinc-400" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Clock size={14} />
          <span>{getTimeDisplay()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <button
          onClick={onNewEvent}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={18} />
          Add Event
        </button>
      </div>

      {/* Google Calendar Integration */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Calendar size={24} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Sync with Google Calendar</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Automatically import your events and keep them up to date.
            </p>
            <button
              onClick={onGoogleCalendar}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg text-sm transition-colors"
            >
              Connect Google Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-zinc-500" />
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'recurring', label: 'Recurring' },
            { id: 'one-time', label: 'One-time' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f.id
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-4xl mb-4">📅</div>
          <h2 className="text-xl font-semibold mb-2">No events yet</h2>
          <p className="text-zinc-400 mb-4">Add recurring events like classes or practice, or one-time events like tests.</p>
          <button
            onClick={onNewEvent}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Add Your First Event
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Recurring Events */}
          {recurringEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Activity size={18} className="text-zinc-400" />
                Recurring Events
              </h2>
              <div className="grid gap-3">
                {recurringEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming One-time Events */}
          {upcomingOneTimeEvents.length > 0 && (
            <div>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-zinc-400" />
                Upcoming Events
              </h2>
              <div className="grid gap-3">
                {upcomingOneTimeEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Calendar View
const CalendarView = ({ events, entries, onEditEvent, onDeleteEvent, onNewEvent, onClickTimeSlot, categories = [] }) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const weekDates = getWeekDates(currentWeek);
  const today = new Date();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const handleTimeSlotClick = (date, hour) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    onClickTimeSlot(date, startTime, endTime);
  };

  const getEventsForDay = (date) => {
    return getEventsForDate(events, date).map(event => {
      const category = categories.find(c => c.id === event.categoryId);
      const startMinutes = event.startTime ? timeToMinutes(event.startTime) : 0;
      const endMinutes = event.endTime ? timeToMinutes(event.endTime) : 24 * 60;

      return {
        ...event,
        category,
        startMinutes,
        endMinutes,
        topPercent: (startMinutes / (24 * 60)) * 100,
        heightPercent: ((endMinutes - startMinutes) / (24 * 60)) * 100
      };
    });
  };

  const getEntriesForDay = (date) => {
    return entries.filter(e => isSameDay(e.timestamp, date));
  };

  const getEntryColor = (entry) => {
    const energy = entry.metrics?.energy || 5;
    const mood = entry.metrics?.mood || 5;
    const avg = (energy + mood) / 2;

    if (avg >= 7) return '#22c55e'; // green
    if (avg >= 5) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const EventBlock = ({ event, onClick }) => (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className="absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs cursor-pointer hover:opacity-90 transition-opacity overflow-hidden group"
      style={{
        backgroundColor: event.category?.color || '#6366f1',
        top: `${event.topPercent}%`,
        height: `${event.heightPercent}%`,
        minHeight: '24px'
      }}
    >
      <div className="flex items-center gap-1 font-medium text-white">
        <span>{event.emoji}</span>
        <span className="truncate">{event.title}</span>
      </div>
      {event.startTime && (
        <div className="text-xs opacity-90 text-white">{formatTime12Hour(event.startTime)}</div>
      )}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1 bg-black/30 rounded p-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
            className="p-0.5 hover:bg-white/20 rounded"
          >
            <Edit3 size={10} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteEvent(event.id); }}
            className="p-0.5 hover:bg-white/20 rounded"
          >
            <Trash2 size={10} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <button
              onClick={goToNextWeek}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Legend */}
      {categories.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-zinc-500 font-medium">Categories:</span>
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm text-zinc-400">{category.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden relative">
        <div className="grid grid-cols-8 border-b border-zinc-800">
          {/* Time column header */}
          <div className="p-3 border-r border-zinc-800 text-sm text-zinc-500">Time</div>

          {/* Day headers */}
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const dayEntries = getEntriesForDay(date);

            return (
              <div
                key={i}
                className={`p-3 border-r border-zinc-800 text-center ${isToday ? 'bg-blue-500/10' : ''}`}
              >
                <div className={`text-sm font-medium ${isToday ? 'text-blue-400' : ''}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${isToday ? 'text-blue-400' : ''}`}>
                  {date.getDate()}
                </div>
                {/* Entry indicators */}
                {dayEntries.length > 0 && (
                  <div className="flex justify-center gap-1 mt-1">
                    {dayEntries.slice(0, 3).map((entry, idx) => (
                      <div
                        key={idx}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getEntryColor(entry) }}
                        title={`Entry: Energy ${entry.metrics?.energy}, Mood ${entry.metrics?.mood}`}
                      />
                    ))}
                    {dayEntries.length > 3 && (
                      <div className="text-xs text-zinc-500">+{dayEntries.length - 3}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="grid grid-cols-8">
          {/* Hour labels and slots */}
          {hours.map(hour => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div className="border-r border-b border-zinc-800 p-2 text-xs text-zinc-500 bg-zinc-900/30">
                {formatHour12(hour)}
              </div>

              {/* Day columns */}
              {weekDates.map((date, dayIdx) => {
                const isToday = isSameDay(date, today);

                return (
                  <div
                    key={dayIdx}
                    onClick={() => handleTimeSlotClick(date, hour)}
                    className={`relative border-r border-b border-zinc-800 h-12 hover:bg-blue-500/5 cursor-pointer transition-colors ${isToday ? 'bg-blue-500/5' : ''}`}
                  >
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Event overlay layer */}
        <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none" style={{ marginTop: '60px' }}>
          <div className="grid grid-cols-8 h-full">
            {/* Skip time column */}
            <div />

            {/* Event columns for each day */}
            {weekDates.map((date, dayIdx) => {
              const dayEvents = getEventsForDay(date);
              return (
                <div key={dayIdx} className="relative pointer-events-auto">
                  {dayEvents.map(event => (
                    <EventBlock
                      key={event.id}
                      event={event}
                      onClick={onEditEvent}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-zinc-400">High mood/energy (7+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-zinc-400">Medium (5-7)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-zinc-400">Low (&lt;5)</span>
        </div>
      </div>
    </div>
  );
};

// Weekly Report View
const WeeklyReportView = ({ entries, events, profile, userTags = [], categories = [] }) => {
  const [selectedWeek, setSelectedWeek] = useState(0); // 0 = current week, 1 = last week, etc.

  // Get week date range
  const getWeekRange = (weeksAgo = 0) => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() - now.getDay() + (weeksAgo === 0 ? 0 : -7 * weeksAgo));
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(endOfWeek);
    startOfWeek.setDate(endOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    return { start: startOfWeek, end: endOfWeek };
  };

  const currentWeek = getWeekRange(selectedWeek);
  const previousWeek = getWeekRange(selectedWeek + 1);

  // Filter entries for selected week
  const weekEntries = entries.filter(e => {
    const d = new Date(e.timestamp);
    return d >= currentWeek.start && d <= currentWeek.end;
  });

  const prevWeekEntries = entries.filter(e => {
    const d = new Date(e.timestamp);
    return d >= previousWeek.start && d <= previousWeek.end;
  });

  // Helper functions
  const avgMetric = (arr, key) => arr.length ? (arr.reduce((s, e) => s + (e.metrics?.[key] || 0), 0) / arr.length).toFixed(1) : 0;

  const getChange = (current, previous) => {
    const diff = parseFloat(current) - parseFloat(previous);
    return diff.toFixed(1);
  };

  // Calculate stats
  const stats = {
    energy: avgMetric(weekEntries, 'energy'),
    mood: avgMetric(weekEntries, 'mood'),
    stress: avgMetric(weekEntries, 'stress'),
    sleep: avgMetric(weekEntries, 'sleep'),
    prevEnergy: avgMetric(prevWeekEntries, 'energy'),
    prevMood: avgMetric(prevWeekEntries, 'mood'),
    prevStress: avgMetric(prevWeekEntries, 'stress'),
    prevSleep: avgMetric(prevWeekEntries, 'sleep'),
  };

  // Find best and worst days
  const daysWithScores = weekEntries.reduce((acc, entry) => {
    const day = new Date(entry.timestamp).toDateString();
    if (!acc[day]) acc[day] = { entries: [], date: day };
    acc[day].entries.push(entry);
    return acc;
  }, {});

  const dayScores = Object.values(daysWithScores).map(day => {
    const avgEnergy = avgMetric(day.entries, 'energy');
    const avgMood = avgMetric(day.entries, 'mood');
    const avgStress = avgMetric(day.entries, 'stress');
    const score = parseFloat(avgEnergy) + parseFloat(avgMood) - parseFloat(avgStress) * 0.5;
    return { date: day.date, score, energy: avgEnergy, mood: avgMood, stress: avgStress };
  }).sort((a, b) => b.score - a.score);

  const bestDay = dayScores[0];
  const worstDay = dayScores[dayScores.length - 1];

  // Analyze helpful factors
  const getTagName = (tagId) => {
    const tag = userTags.find(t => t.id === tagId);
    return tag ? { name: tag.label, emoji: tag.emoji } : null;
  };

  const tagImpact = {};
  weekEntries.forEach(entry => {
    const entryScore = (entry.metrics?.energy || 0) + (entry.metrics?.mood || 0);
    entry.tags?.forEach(tagId => {
      if (!tagImpact[tagId]) tagImpact[tagId] = { total: 0, count: 0 };
      tagImpact[tagId].total += entryScore;
      tagImpact[tagId].count += 1;
    });
  });

  const tagAverages = Object.keys(tagImpact)
    .map(tagId => {
      const tag = getTagName(tagId);
      if (!tag) return null;
      return {
        ...tag,
        avg: tagImpact[tagId].total / tagImpact[tagId].count,
        count: tagImpact[tagId].count
      };
    })
    .filter(t => t && t.count >= 2)
    .sort((a, b) => b.avg - a.avg);

  const helpfulFactors = tagAverages.slice(0, 3);
  const harmfulFactors = tagAverages.slice(-3).reverse();

  // Schedule load
  const weekEventIds = new Set();
  weekEntries.forEach(e => e.events?.forEach(id => weekEventIds.add(id)));
  const scheduleLoad = weekEventIds.size;

  // Get events for the week
  const weekEvents = events.filter(e => {
    if (e.type === 'one-time') {
      const eventDate = new Date(e.date);
      return eventDate >= currentWeek.start && eventDate <= currentWeek.end;
    }
    // For recurring events, they could appear any day
    return true;
  });

  const totalEventOccurrences = weekEntries.reduce((sum, entry) => sum + (entry.events?.length || 0), 0);

  if (weekEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h2 className="text-xl font-semibold mb-2">No data for this week</h2>
        <p className="text-zinc-400 max-w-sm">There are no entries logged for this week period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header with week selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Weekly Report</h1>
          <p className="text-sm text-zinc-500">
            {currentWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {currentWeek.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedWeek(prev => prev + 1)}
            className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSelectedWeek(prev => Math.max(0, prev - 1))}
            disabled={selectedWeek === 0}
            className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
        <h2 className="font-medium mb-4 text-lg">Weekly Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Avg Energy</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-orange-400">{stats.energy}</div>
              {prevWeekEntries.length > 0 && (
                <div className={`text-sm ${parseFloat(getChange(stats.energy, stats.prevEnergy)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(getChange(stats.energy, stats.prevEnergy)) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(getChange(stats.energy, stats.prevEnergy)))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Avg Mood</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-purple-400">{stats.mood}</div>
              {prevWeekEntries.length > 0 && (
                <div className={`text-sm ${parseFloat(getChange(stats.mood, stats.prevMood)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(getChange(stats.mood, stats.prevMood)) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(getChange(stats.mood, stats.prevMood)))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Avg Stress</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-red-400">{stats.stress}</div>
              {prevWeekEntries.length > 0 && (
                <div className={`text-sm ${parseFloat(getChange(stats.stress, stats.prevStress)) <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(getChange(stats.stress, stats.prevStress)) <= 0 ? '↓' : '↑'}{Math.abs(parseFloat(getChange(stats.stress, stats.prevStress)))}
                </div>
              )}
            </div>
          </div>
          <div className="bg-zinc-900/50 rounded-xl p-4">
            <div className="text-sm text-zinc-500 mb-1">Avg Sleep</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-blue-400">{stats.sleep}</div>
              {prevWeekEntries.length > 0 && (
                <div className={`text-sm ${parseFloat(getChange(stats.sleep, stats.prevSleep)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(getChange(stats.sleep, stats.prevSleep)) >= 0 ? '↑' : '↓'}{Math.abs(parseFloat(getChange(stats.sleep, stats.prevSleep)))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Best & Worst Days */}
        {bestDay && worstDay && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-medium mb-4">Best & Worst Days</h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌟</span>
                  <div className="text-sm font-medium text-green-400">Best Day</div>
                </div>
                <div className="text-sm text-zinc-300">{new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-orange-400">⚡{bestDay.energy}</span>
                  <span className="text-purple-400">🎯{bestDay.mood}</span>
                  <span className="text-red-400">🔥{bestDay.stress}</span>
                </div>
              </div>
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚠️</span>
                  <div className="text-sm font-medium text-red-400">Toughest Day</div>
                </div>
                <div className="text-sm text-zinc-300">{new Date(worstDay.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="text-orange-400">⚡{worstDay.energy}</span>
                  <span className="text-purple-400">🎯{worstDay.mood}</span>
                  <span className="text-red-400">🔥{worstDay.stress}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Load */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-medium mb-4">Schedule Load</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Entries logged</span>
              <span className="font-mono font-bold text-lg">{weekEntries.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Unique events</span>
              <span className="font-mono font-bold text-lg">{scheduleLoad}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Total event occurrences</span>
              <span className="font-mono font-bold text-lg">{totalEventOccurrences}</span>
            </div>
            <div className="pt-3 border-t border-zinc-800">
              <div className="text-sm text-zinc-500 mb-2">Most frequent events:</div>
              {(() => {
                const eventCounts = {};
                weekEntries.forEach(entry => {
                  entry.events?.forEach(eventId => {
                    eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
                  });
                });
                const topEvents = Object.entries(eventCounts)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([id, count]) => {
                    const event = events.find(e => e.id === id);
                    return event ? { ...event, count } : null;
                  })
                  .filter(e => e);

                if (topEvents.length === 0) {
                  return <div className="text-xs text-zinc-600">No events tracked</div>;
                }

                return topEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between text-sm py-1">
                    <span className="flex items-center gap-2">
                      <span>{event.emoji}</span>
                      <span>{event.title}</span>
                    </span>
                    <span className="text-zinc-500">{event.count}×</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Helpful & Harmful Factors */}
      {(helpfulFactors.length > 0 || harmfulFactors.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {helpfulFactors.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <span className="text-green-400">✨</span>
                What Helped
              </h2>
              <div className="space-y-2">
                {helpfulFactors.map((factor, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <span className="flex items-center gap-2 text-sm">
                      <span>{factor.emoji}</span>
                      <span>{factor.name}</span>
                    </span>
                    <span className="text-xs text-green-400 font-mono">{factor.avg.toFixed(1)} avg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {harmfulFactors.length > 0 && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="font-medium mb-4 flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                What Hurt
              </h2>
              <div className="space-y-2">
                {harmfulFactors.map((factor, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <span className="flex items-center gap-2 text-sm">
                      <span>{factor.emoji}</span>
                      <span>{factor.name}</span>
                    </span>
                    <span className="text-xs text-red-400 font-mono">{factor.avg.toFixed(1)} avg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Week vs Previous Week */}
      {prevWeekEntries.length > 0 && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="font-medium mb-4">Week Over Week Comparison</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <span className="text-zinc-400">Entries logged</span>
              <span className="flex items-center gap-2">
                <span>{prevWeekEntries.length}</span>
                <span className="text-zinc-600">→</span>
                <span className="font-bold">{weekEntries.length}</span>
                {weekEntries.length > prevWeekEntries.length && (
                  <span className="text-green-400 text-xs">+{weekEntries.length - prevWeekEntries.length}</span>
                )}
              </span>
            </div>
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-zinc-500 mb-2">Overall trend</div>
              <div className="text-sm text-zinc-300">
                {parseFloat(stats.energy) > parseFloat(stats.prevEnergy) && parseFloat(stats.mood) > parseFloat(stats.prevMood)
                  ? "📈 This week was better overall - higher energy and mood!"
                  : parseFloat(stats.energy) < parseFloat(stats.prevEnergy) && parseFloat(stats.mood) < parseFloat(stats.prevMood)
                  ? "📉 This week was tougher - lower energy and mood than last week."
                  : "📊 Mixed week - some metrics up, others down."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// History View
const HistoryView = ({ entries, onEdit, onDelete, locationTags = [], userTags = [] }) => {
  const [filter, setFilter] = useState('all');
  
  const sortedEntries = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  const filteredEntries = filter === 'all' 
    ? sortedEntries 
    : sortedEntries.filter(e => e.tags?.includes(filter));

  const groupedByDate = filteredEntries.reduce((acc, entry) => {
    const date = new Date(entry.timestamp).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">History</h1>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-zinc-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All entries</option>
            {userTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.emoji} {tag.label}</option>
            ))}
          </select>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-4xl mb-4">📝</div>
          <h2 className="text-xl font-semibold mb-2">No entries yet</h2>
          <p className="text-zinc-400">Start logging to build your history.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dayEntries]) => (
            <div key={date}>
              <div className="text-sm text-zinc-500 mb-3 sticky top-0 bg-zinc-950 py-2">
                {formatDate(date)}
              </div>
              <div className="space-y-2">
                {dayEntries.map(entry => (
                  <div key={entry.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-zinc-500 font-mono">{formatTime(entry.timestamp)}</span>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-orange-400">⚡{entry.metrics?.energy}</span>
                          <span className="text-purple-400">🎯{entry.metrics?.mood}</span>
                          <span className="text-red-400">🔥{entry.metrics?.stress}</span>
                          <span className="text-blue-400">😴{entry.metrics?.sleep}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(entry)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                          <Edit3 size={14} className="text-zinc-400" />
                        </button>
                        <button onClick={() => onDelete(entry.id)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                          <Trash2 size={14} className="text-zinc-400" />
                        </button>
                      </div>
                    </div>
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {entry.tags.map(t => {
                          const allTags = getAllPresetTags();
                          const tag = userTags.find(ut => ut.id === t) || allTags.find(at => at.id === t);
                          return tag ? (
                            <span key={t} className="px-2 py-0.5 bg-zinc-800 rounded text-xs flex items-center gap-1">
                              {tag.emoji} {tag.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {entry.location && (
                      <div className="text-xs text-zinc-500 mb-2">
                        📍 {locationTags.find(l => l.id === entry.location)?.label}
                      </div>
                    )}
                    {entry.note && (
                      <p className="text-sm text-zinc-400">{entry.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Chat View with OpenAI Integration
const ChatView = ({ profile, entries, events, onNavigate }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. I can help you understand your patterns, analyze your data, and answer questions about your well-being. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if API key is configured
  if (!profile.openAIApiKey || profile.openAIApiKey.trim() === '') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold">AI Chat</h1>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 text-zinc-600" />
          <h2 className="text-lg font-medium mb-2">API Key Required</h2>
          <p className="text-zinc-400 text-sm mb-4">
            To use the AI Chat feature, you need to configure your OpenAI API key in Settings.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('settings')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Settings size={16} />
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Prepare context about user's data
      const context = `You are a helpful AI assistant analyzing personal well-being data. Here's the user's data summary:

Entries: ${entries.length} total entries
Recent entries: ${entries.slice(-5).map(e => {
  const date = new Date(e.timestamp);
  return `${date.toLocaleDateString()} - Energy: ${e.metrics?.energy || 5}/10, Mood: ${e.metrics?.mood || 5}/10${e.tags ? `, Tags: ${e.tags.join(', ')}` : ''}`;
}).join('\n')}

Events: ${events.length} calendar events scheduled
${events.slice(0, 3).map(ev => `- ${ev.title} on ${ev.date}`).join('\n')}

Tags being tracked: ${profile.customTags?.map(t => t.label).join(', ') || 'None'}

Respond helpfully to the user's questions about their patterns, well-being, and provide insights. Keep responses concise and actionable.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${profile.openAIApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: context },
            ...messages.slice(-10), // Include last 10 messages for context
            userMessage
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get response from OpenAI');
      }

      const data = await response.json();
      const assistantMessage = {
        role: 'assistant',
        content: data.choices[0].message.content
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">AI Chat</h1>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>AI Assistant Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-800 text-zinc-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your patterns, get insights, or request analysis..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

// Settings View
const SettingsView = ({ profile, settings, onUpdateProfile, onUpdateSettings, onExport, onClearData, events = [], onUpdateEvents }) => {
  const [name, setName] = useState(profile.name);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCustomTagForm, setShowCustomTagForm] = useState(false);
  const [customTagName, setCustomTagName] = useState('');
  const [customTagEmoji, setCustomTagEmoji] = useState('🏷️');
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#4a9eff');
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitEmoji, setHabitEmoji] = useState('✅');
  const [habitColor, setHabitColor] = useState('#22c55e');

  const handleSaveName = () => {
    onUpdateProfile({ ...profile, name });
  };

  const handleCreateCustomTag = () => {
    if (!customTagName.trim()) return;

    const newTag = {
      id: `custom-${Date.now()}`,
      label: customTagName.trim(),
      emoji: customTagEmoji,
      color: '#a855f7'
    };

    const updatedProfile = {
      ...profile,
      userCreatedTags: [...(profile.userCreatedTags || []), newTag]
    };

    onUpdateProfile(updatedProfile);

    // Reset form
    setCustomTagName('');
    setCustomTagEmoji('🏷️');
    setShowCustomTagForm(false);
  };

  const handleDeleteCustomTag = (tagId) => {
    const updatedProfile = {
      ...profile,
      userCreatedTags: (profile.userCreatedTags || []).filter(t => t.id !== tagId)
    };
    onUpdateProfile(updatedProfile);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) return;

    const updatedCategories = editingCategoryId
      ? (profile.eventCategories || []).map(c =>
          c.id === editingCategoryId
            ? { ...c, name: categoryName, color: categoryColor }
            : c
        )
      : [...(profile.eventCategories || []), {
          id: `cat-${Date.now()}`,
          name: categoryName.trim(),
          color: categoryColor
        }];

    onUpdateProfile({ ...profile, eventCategories: updatedCategories });
    setCategoryName('');
    setCategoryColor('#4a9eff');
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  };

  const handleEditCategory = (category) => {
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = (categoryId) => {
    // Check if any events use this category
    const eventsUsingCategory = events.filter(e => e.categoryId === categoryId);

    if (eventsUsingCategory.length > 0) {
      // Show warning dialog with options
      setDeletingCategory({ id: categoryId, eventCount: eventsUsingCategory.length });
    } else {
      // No events using it, safe to delete
      const updatedCategories = (profile.eventCategories || []).filter(c => c.id !== categoryId);
      onUpdateProfile({ ...profile, eventCategories: updatedCategories });
    }
  };

  const handleConfirmDeleteCategory = (deleteEvents) => {
    if (!deletingCategory) return;

    // Remove category from profile
    const updatedCategories = (profile.eventCategories || []).filter(c => c.id !== deletingCategory.id);
    onUpdateProfile({ ...profile, eventCategories: updatedCategories });

    if (deleteEvents) {
      // Delete all events using this category
      const updatedEvents = events.filter(e => e.categoryId !== deletingCategory.id);
      onUpdateEvents(updatedEvents);
    } else {
      // Make events uncategorized (remove categoryId)
      const updatedEvents = events.map(e =>
        e.categoryId === deletingCategory.id
          ? { ...e, categoryId: null }
          : e
      );
      onUpdateEvents(updatedEvents);
    }

    setDeletingCategory(null);
  };

  const handleCreateHabit = () => {
    if (!habitName.trim()) return;

    const newHabit = {
      id: `habit-${Date.now()}`,
      label: habitName.trim(),
      emoji: habitEmoji,
      color: habitColor
    };

    const updatedProfile = {
      ...profile,
      habits: [...(profile.habits || []), newHabit]
    };

    onUpdateProfile(updatedProfile);

    // Reset form
    setHabitName('');
    setHabitEmoji('✅');
    setHabitColor('#22c55e');
    setShowHabitForm(false);
  };

  const handleDeleteHabit = (habitId) => {
    const updatedProfile = {
      ...profile,
      habits: (profile.habits || []).filter(h => h.id !== habitId)
    };
    onUpdateProfile(updatedProfile);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Profile */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">Name</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveName}
                disabled={name === profile.name}
                className="px-4 py-2 bg-blue-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Member since</label>
            <p className="text-zinc-300">{profile.createdAt ? formatDate(profile.createdAt) : 'Unknown'}</p>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Locations</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">Current locations</label>
            {profile.locations && profile.locations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.locations.map(loc => (
                  <span key={loc.id} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm flex items-center gap-1.5">
                    <span>{loc.emoji}</span>
                    <span>{loc.label}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No locations configured</p>
            )}
          </div>
          <button
            onClick={() => onUpdateProfile({ ...profile, setupComplete: false, locationPreset: null, locations: [] })}
            className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-zinc-400" />
              <span>Reconfigure locations</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Tags</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">Your active tags ({profile.customTags?.length || 0})</label>
            {profile.customTags && profile.customTags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.customTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newTags = profile.customTags.filter(t => t.id !== tag.id);
                      onUpdateProfile({ ...profile, customTags: newTags });
                    }}
                    className="px-3 py-1.5 bg-zinc-800 rounded-lg text-sm flex items-center gap-1.5 hover:bg-red-500/20 hover:border-red-500/50 border border-transparent transition-colors group"
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                    <X size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mb-4">No tags selected</p>
            )}
          </div>

          <details className="bg-zinc-800/30 rounded-xl">
            <summary className="cursor-pointer p-3 font-medium text-sm hover:bg-zinc-800/50 rounded-xl transition-colors">
              Add tags from library
            </summary>
            <div className="p-4 space-y-4 max-h-64 overflow-y-auto">
              {Object.entries(presetTags).map(([category, tags]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-zinc-500 mb-2 capitalize">{category}</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => {
                      const isSelected = profile.customTags?.some(t => t.id === tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => {
                            if (isSelected) {
                              const newTags = profile.customTags.filter(t => t.id !== tag.id);
                              onUpdateProfile({ ...profile, customTags: newTags });
                            } else {
                              const newTags = [...(profile.customTags || []), tag];
                              onUpdateProfile({ ...profile, customTags: newTags });
                            }
                          }}
                          className={`
                            flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all border
                            ${isSelected
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                              : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600'}
                          `}
                        >
                          <span>{tag.emoji}</span>
                          <span>{tag.label}</span>
                          {isSelected && <Check size={12} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Custom User-Created Tags */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <label className="text-sm text-zinc-400 block mb-3">Custom tags ({profile.userCreatedTags?.length || 0})</label>

            {profile.userCreatedTags && profile.userCreatedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.userCreatedTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleDeleteCustomTag(tag.id)}
                    className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm flex items-center gap-1.5 hover:bg-red-500/20 hover:border-red-500/50 transition-colors group"
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                    <X size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400" />
                  </button>
                ))}
              </div>
            )}

            {!showCustomTagForm ? (
              <button
                onClick={() => setShowCustomTagForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
              >
                <Plus size={16} className="text-zinc-500" />
                <span className="text-sm text-zinc-500">Create custom tag</span>
              </button>
            ) : (
              <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">Create custom tag</h4>
                  <button onClick={() => setShowCustomTagForm(false)} className="text-zinc-500 hover:text-zinc-400">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTagEmoji}
                    onChange={(e) => setCustomTagEmoji(e.target.value)}
                    placeholder="🏷️"
                    maxLength={2}
                    className="w-16 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xl focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={customTagName}
                    onChange={(e) => setCustomTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateCustomTag()}
                    placeholder="Tag name"
                    autoFocus
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCustomTagForm(false);
                      setCustomTagName('');
                      setCustomTagEmoji('🏷️');
                    }}
                    className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCustomTag}
                    disabled={!customTagName.trim()}
                    className="flex-1 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Categories */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Event Categories</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">Your categories ({profile.eventCategories?.length || 0})</label>
            {profile.eventCategories && profile.eventCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {profile.eventCategories.map(category => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border group hover:border-zinc-600 transition-colors"
                    style={{ backgroundColor: `${category.color}20`, borderColor: `${category.color}40` }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Edit3 size={12} className="text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 hover:bg-zinc-800 rounded transition-colors"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mb-4">No categories yet</p>
            )}
          </div>

          {!showCategoryForm ? (
            <button
              onClick={() => {
                setCategoryName('');
                setCategoryColor('#4a9eff');
                setEditingCategoryId(null);
                setShowCategoryForm(true);
              }}
              className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
            >
              <Plus size={16} className="text-zinc-500" />
              <span className="text-sm text-zinc-500">{editingCategoryId ? 'Edit category' : 'Create category'}</span>
            </button>
          ) : (
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{editingCategoryId ? 'Edit category' : 'Create category'}</h4>
                <button onClick={() => {
                  setShowCategoryForm(false);
                  setEditingCategoryId(null);
                  setCategoryName('');
                  setCategoryColor('#4a9eff');
                }} className="text-zinc-500 hover:text-zinc-400">
                  <X size={16} />
                </button>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-2">Category name</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveCategory()}
                  placeholder="Category name"
                  autoFocus
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-2">Color</label>
                <div className="flex gap-2">
                  {eventColors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategoryColor(c.color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        categoryColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCategoryForm(false);
                    setEditingCategoryId(null);
                    setCategoryName('');
                    setCategoryColor('#4a9eff');
                  }}
                  className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!categoryName.trim()}
                  className="flex-1 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingCategoryId ? 'Save' : 'Create'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Habits */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Daily Habits</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-zinc-400 block mb-2">Track your daily habits ({profile.habits?.length || 0})</label>
            <p className="text-xs text-zinc-500 mb-4">Create habits you want to build. Check them off each day and track your streaks!</p>
            {profile.habits && profile.habits.length > 0 ? (
              <div className="grid gap-2 mb-4">
                {profile.habits.map(habit => (
                  <div
                    key={habit.id}
                    className="flex items-center justify-between p-3 rounded-lg border group hover:border-zinc-600 transition-colors"
                    style={{ backgroundColor: `${habit.color}20`, borderColor: `${habit.color}40` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{habit.emoji}</span>
                      <span className="text-sm font-medium">{habit.label}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 rounded transition-all"
                    >
                      <Trash2 size={12} className="text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mb-4">No habits yet. Create your first one!</p>
            )}
          </div>

          {!showHabitForm ? (
            <button
              onClick={() => setShowHabitForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-zinc-800/50 border border-dashed border-zinc-700 rounded-xl hover:border-zinc-600 hover:bg-zinc-800 transition-colors"
            >
              <Plus size={16} className="text-zinc-500" />
              <span className="text-sm text-zinc-500">Create habit</span>
            </button>
          ) : (
            <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Create habit</h4>
                <button onClick={() => {
                  setShowHabitForm(false);
                  setHabitName('');
                  setHabitEmoji('✅');
                  setHabitColor('#22c55e');
                }} className="text-zinc-500 hover:text-zinc-400">
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={habitEmoji}
                  onChange={(e) => setHabitEmoji(e.target.value)}
                  placeholder="✅"
                  maxLength={2}
                  className="w-16 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-center text-xl focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateHabit()}
                  placeholder="Habit name (e.g., Worked out, Studied, 7+ hours sleep)"
                  autoFocus
                  className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-2">Color</label>
                <div className="flex gap-2">
                  {eventColors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setHabitColor(c.color)}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        habitColor === c.color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'opacity-50 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowHabitForm(false);
                    setHabitName('');
                    setHabitEmoji('✅');
                    setHabitColor('#22c55e');
                  }}
                  className="flex-1 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHabit}
                  disabled={!habitName.trim()}
                  className="flex-1 py-2 bg-green-500 rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">AI Assistant (Beta)</h2>
            <p className="text-xs text-zinc-500 mt-1">Chat with AI about your patterns and insights</p>
          </div>
          <button
            onClick={() => onUpdateProfile({ ...profile, aiAssistantEnabled: !profile.aiAssistantEnabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              profile.aiAssistantEnabled ? 'bg-blue-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                profile.aiAssistantEnabled ? 'translate-x-6' : ''
              }`}
            />
          </button>
        </div>

        {profile.aiAssistantEnabled && (
          <div className="space-y-3 mt-4 pt-4 border-t border-zinc-800">
            <div>
              <label className="text-sm text-zinc-400 block mb-2">
                OpenAI API Key
                <span className="text-xs text-zinc-600 ml-2">(required for AI chat)</span>
              </label>
              <input
                type="password"
                value={profile.openAIApiKey || ''}
                onChange={(e) => onUpdateProfile({ ...profile, openAIApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-zinc-600 mt-2">
                Get your API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  platform.openai.com/api-keys
                </a>
              </p>
            </div>
            {profile.openAIApiKey && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-green-400">
                  API key configured. You can now use the AI Chat feature!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-4">Your Data</h2>
        <div className="space-y-3">
          <button
            onClick={onExport}
            className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download size={18} className="text-zinc-400" />
              <span>Export all data</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" />
          </button>
          
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl hover:bg-red-500/10 transition-colors text-red-400"
            >
              <div className="flex items-center gap-3">
                <Trash2 size={18} />
                <span>Clear all data</span>
              </div>
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 mb-3">Are you sure? This will delete all your entries and cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { onClearData(); setShowClearConfirm(false); }}
                  className="flex-1 py-2 bg-red-500 rounded-lg"
                >
                  Delete Everything
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-medium mb-2">About Pattern</h2>
        <p className="text-sm text-zinc-400 mb-4">
          A personal analytics tool to help you understand yourself better by tracking how different factors affect your energy, mood, and overall well-being.
        </p>
        <p className="text-xs text-zinc-600">
          All data is stored locally in your browser.
          {profile.aiAssistantEnabled
            ? ' AI Chat sends your data summary to OpenAI for analysis.'
            : ' Nothing is sent to any server.'}
        </p>
      </div>

      {/* Delete Category Confirmation Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-3">Delete Category</h3>
            <p className="text-sm text-zinc-400 mb-4">
              This category is used by <span className="font-bold text-white">{deletingCategory.eventCount}</span> event{deletingCategory.eventCount !== 1 ? 's' : ''}.
              What would you like to do with {deletingCategory.eventCount !== 1 ? 'them' : 'it'}?
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => handleConfirmDeleteCategory(false)}
                className="w-full p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-colors"
              >
                <div className="font-medium mb-1">Keep events, remove category</div>
                <div className="text-xs text-zinc-500">Events will become uncategorized</div>
              </button>
              <button
                onClick={() => handleConfirmDeleteCategory(true)}
                className="w-full p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-left transition-colors"
              >
                <div className="font-medium text-red-400 mb-1">Delete events too</div>
                <div className="text-xs text-red-400/70">Permanently delete all {deletingCategory.eventCount} event{deletingCategory.eventCount !== 1 ? 's' : ''}</div>
              </button>
            </div>
            <button
              onClick={() => setDeletingCategory(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main App Component
export default function PatternApp() {
  const [profile, setProfile] = useState(() => {
    const stored = storage.get('profile', defaultProfile);
    // Merge with defaults to handle new fields for existing users
    return { ...defaultProfile, ...stored };
  });
  const [entries, setEntries] = useState(() => storage.get('entries', []));
  const [events, setEvents] = useState(() => storage.get('events', defaultEvents));
  const [settings, setSettings] = useState(() => storage.get('settings', defaultSettings));
  const [currentView, setCurrentView] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventInitialData, setEventInitialData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get location tags from profile
  const locationTags = getLocationTags(profile);

  // Get user's custom tags
  const userTags = getUserTags(profile);

  // Get event categories from profile (users create their own)
  const eventCategories = profile.eventCategories || [];

  // Persist to storage
  useEffect(() => { storage.set('profile', profile); }, [profile]);
  useEffect(() => { storage.set('entries', entries); }, [entries]);
  useEffect(() => { storage.set('events', events); }, [events]);
  useEffect(() => { storage.set('settings', settings); }, [settings]);

  const handleSaveEntry = (entry) => {
    setEntries(prev => {
      const existing = prev.findIndex(e => e.id === entry.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    setEditingEntry(null);
  };

  const handleCreateCustomTag = (newTag) => {
    setProfile(prev => ({
      ...prev,
      userCreatedTags: [...(prev.userCreatedTags || []), newTag]
    }));
  };

  const handleCreateCategory = (newCategory) => {
    setProfile(prev => ({
      ...prev,
      eventCategories: [...(prev.eventCategories || []), newCategory]
    }));
  };

  const handleDeleteEntry = (id) => {
    if (confirm('Delete this entry?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setModalOpen(true);
  };

  const handleExport = () => {
    const data = { profile, entries, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pattern-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    setEntries([]);
    setProfile(defaultProfile);
    setSettings(defaultSettings);
  };

  const handleCompleteOnboarding = (newProfile) => {
    setProfile(newProfile);
  };

  const handleSaveEvent = (event) => {
    setEvents(prev => {
      const existing = prev.findIndex(e => e.id === event.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = event;
        return updated;
      }
      return [...prev, event];
    });
    setEditingEvent(null);
  };

  const handleDeleteEvent = (id) => {
    if (confirm('Delete this event?')) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleGoogleCalendar = () => {
    alert('Google Calendar integration coming soon! 🎉\n\nThis will allow you to automatically sync your events from Google Calendar.');
  };

  const handleCalendarTimeSlotClick = (date, startTime, endTime) => {
    setEventInitialData({ date, startTime, endTime });
    setEventModalOpen(true);
  };

  // Show onboarding if not complete
  if (!profile.setupComplete) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'schedule', label: 'Schedule', icon: Activity, badge: events.length > 0 ? events.length : null },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'report', label: 'Weekly Report', icon: FileText },
    { id: 'history', label: 'History', icon: BookOpen },
    ...(profile.aiAssistantEnabled ? [{ id: 'chat', label: 'AI Chat', icon: MessageSquare }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-4 z-40">
        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="font-mono font-bold">Pattern</span>
        <button onClick={() => setModalOpen(true)} className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
          <Plus size={20} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-50
        transform transition-transform duration-300 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="font-mono font-bold text-xl">Pattern</span>
          </div>
          <p className="text-zinc-500 text-sm font-mono ml-13">understand yourself</p>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map(item => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={currentView === item.id}
              badge={item.badge}
              onClick={() => { setCurrentView(item.id); setSidebarOpen(false); }}
            />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800">
          <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
            <div className="text-3xl font-mono font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              {(() => {
                let count = 0;
                let d = new Date();
                while (true) {
                  const dayStr = d.toDateString();
                  if (entries.some(e => new Date(e.timestamp).toDateString() === dayStr)) {
                    count++;
                    d.setDate(d.getDate() - 1);
                  } else break;
                }
                return count;
              })()}
            </div>
            <div className="text-xs text-zinc-500 mt-1">day streak</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-5xl">
          {currentView === 'dashboard' && (
            <DashboardView entries={entries} profile={profile} events={events} onNewEntry={() => setModalOpen(true)} userTags={userTags} categories={eventCategories} />
          )}
          {currentView === 'calendar' && (
            <CalendarView
              events={events}
              entries={entries}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onNewEvent={() => { setEventInitialData(null); setEventModalOpen(true); }}
              onClickTimeSlot={handleCalendarTimeSlotClick}
              categories={eventCategories}
            />
          )}
          {currentView === 'schedule' && (
            <ScheduleView
              events={events}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onNewEvent={() => setEventModalOpen(true)}
              categories={eventCategories}
              onGoogleCalendar={handleGoogleCalendar}
            />
          )}
          {currentView === 'trends' && (
            <TrendsView entries={entries} userTags={userTags} events={events} />
          )}
          {currentView === 'report' && (
            <WeeklyReportView entries={entries} events={events} profile={profile} userTags={userTags} categories={eventCategories} />
          )}
          {currentView === 'history' && (
            <HistoryView entries={entries} onEdit={handleEditEntry} onDelete={handleDeleteEntry} locationTags={locationTags} userTags={userTags} />
          )}
          {currentView === 'chat' && (
            <ChatView profile={profile} entries={entries} events={events} onNavigate={setCurrentView} />
          )}
          {currentView === 'settings' && (
            <SettingsView
              profile={profile}
              settings={settings}
              onUpdateProfile={setProfile}
              onUpdateSettings={setSettings}
              onExport={handleExport}
              onClearData={handleClearData}
              events={events}
              onUpdateEvents={setEvents}
            />
          )}
        </div>
      </main>

      {/* Entry Modal */}
      <EntryModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEntry(null); }}
        onSave={handleSaveEntry}
        editEntry={editingEntry}
        locationTags={locationTags}
        events={events}
        userTags={userTags}
        allEntries={entries}
        onCreateCustomTag={handleCreateCustomTag}
        categories={eventCategories}
        habits={profile.habits || []}
      />

      {/* Event Modal */}
      <EventModal
        isOpen={eventModalOpen}
        onClose={() => { setEventModalOpen(false); setEditingEvent(null); setEventInitialData(null); }}
        onSave={handleSaveEvent}
        editEvent={editingEvent}
        initialDate={eventInitialData?.date}
        initialStartTime={eventInitialData?.startTime}
        initialEndTime={eventInitialData?.endTime}
        categories={eventCategories}
        onCreateCategory={handleCreateCategory}
      />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
      <Analytics />
    </div>
  );
}
