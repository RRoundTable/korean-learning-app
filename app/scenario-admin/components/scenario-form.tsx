"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { ScenarioResponse, CreateScenarioInput, AdminTask } from '@/lib/types/admin';

interface ScenarioFormProps {
  scenario?: ScenarioResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScenarioForm({ scenario, onClose, onSuccess }: ScenarioFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateScenarioInput>({
    title: '',
    title_en: '',
    role: '',
    user_role: '',
    description: '',
    description_en: '',
    emoji: '',
    is_free: false,
    tts_voice: '',
    tts_instructions: '',
    stt_prompt: '',
    initial_message_text: '',
    initial_message_translation: '',
    status: 'draft',
    tasks: [{ ko: '', en: '' }],
  });

  // Initialize form with scenario data if editing
  useEffect(() => {
    console.log('ScenarioForm useEffect triggered, scenario:', scenario);
    console.log('ScenarioForm scenario?.id:', scenario?.id);
    console.log('ScenarioForm scenario?.status:', scenario?.status);
    
    if (scenario) {
      console.log('ScenarioForm received scenario:', scenario);
      console.log('ScenarioForm scenario.status:', scenario.status);
      
      // Force a complete re-render by using setTimeout
      setTimeout(() => {
        const newFormData = {
          title: scenario.title,
          title_en: scenario.title_en,
          role: scenario.role,
          user_role: scenario.user_role,
          description: scenario.description,
          description_en: scenario.description_en,
          emoji: scenario.emoji || '',
          is_free: scenario.is_free === 1,
          tts_voice: scenario.tts_voice || '',
          tts_instructions: scenario.tts_instructions || '',
          stt_prompt: scenario.stt_prompt || '',
          initial_message_text: scenario.initial_message_text || '',
          initial_message_translation: scenario.initial_message_translation || '',
          status: scenario.status === 'public' ? 'public' : scenario.status === 'archived' ? 'archived' : 'draft',
          tasks: scenario.tasks && scenario.tasks.length > 0 ? scenario.tasks.map(t => ({ id: t.id, ko: t.ko, en: t.en })) : [{ ko: '', en: '' }],
        };
        console.log('Setting formData with status:', newFormData.status);
        setFormData(newFormData);
      }, 0);
    } else {
      console.log('No scenario provided, using default formData');
    }
  }, [scenario?.id, scenario?.status]);

  // Additional useEffect to handle scenario changes
  useEffect(() => {
    if (scenario && scenario.id) {
      console.log('Scenario ID changed, updating form data');
      console.log('New scenario status:', scenario.status);
      
      // Force update formData when scenario changes
      setFormData(prev => ({
        ...prev,
        title: scenario.title,
        title_en: scenario.title_en,
        role: scenario.role,
        user_role: scenario.user_role,
        description: scenario.description,
        description_en: scenario.description_en,
        emoji: scenario.emoji || '',
        is_free: scenario.is_free === 1,
        tts_voice: scenario.tts_voice || '',
        tts_instructions: scenario.tts_instructions || '',
        stt_prompt: scenario.stt_prompt || '',
        initial_message_text: scenario.initial_message_text || '',
        initial_message_translation: scenario.initial_message_translation || '',
        status: scenario.status === 'public' ? 'public' : scenario.status === 'archived' ? 'archived' : 'draft',
        tasks: scenario.tasks && scenario.tasks.length > 0 ? scenario.tasks.map(t => ({ id: t.id, ko: t.ko, en: t.en })) : [{ ko: '', en: '' }],
      }));
    }
  }, [scenario?.id]);

  const handleInputChange = (field: keyof CreateScenarioInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTaskChange = (index: number, field: 'ko' | 'en', value: string) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { ko: '', en: '' }]
    }));
  };

  const removeTask = (index: number) => {
    if (formData.tasks.length > 1) {
      setFormData(prev => ({
        ...prev,
        tasks: prev.tasks.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = scenario 
        ? `/api/admin/scenarios/${scenario.id}`
        : '/api/admin/scenarios';
      
      const method = scenario ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save scenario');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Korean Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="시나리오 제목"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="title_en">English Title *</Label>
              <Input
                id="title_en"
                value={formData.title_en}
                onChange={(e) => handleInputChange('title_en', e.target.value)}
                placeholder="Scenario Title"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="AI 역할"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="user_role">User Role *</Label>
              <Input
                id="user_role"
                value={formData.user_role}
                onChange={(e) => handleInputChange('user_role', e.target.value)}
                placeholder="사용자 역할"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Korean Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="시나리오 설명"
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description_en">English Description *</Label>
            <Textarea
              id="description_en"
              value={formData.description_en}
              onChange={(e) => handleInputChange('description_en', e.target.value)}
              placeholder="Scenario description"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={formData.emoji}
                onChange={(e) => handleInputChange('emoji', e.target.value)}
                placeholder="📝"
                maxLength={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                key={`status-${scenario?.id || 'new'}-${formData.status}`}
                value={formData.status} 
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Current formData.status: {formData.status}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_free"
              checked={formData.is_free}
              onCheckedChange={(checked) => handleInputChange('is_free', checked)}
            />
            <Label htmlFor="is_free">Free Scenario</Label>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tts_voice">TTS Voice</Label>
            <Input
              id="tts_voice"
              value={formData.tts_voice}
              onChange={(e) => handleInputChange('tts_voice', e.target.value)}
              placeholder="alloy, echo, fable, onyx, nova, shimmer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tts_instructions">TTS Instructions</Label>
            <Textarea
              id="tts_instructions"
              value={formData.tts_instructions}
              onChange={(e) => handleInputChange('tts_instructions', e.target.value)}
              placeholder="Special instructions for text-to-speech"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stt_prompt">STT Prompt</Label>
            <Textarea
              id="stt_prompt"
              value={formData.stt_prompt}
              onChange={(e) => handleInputChange('stt_prompt', e.target.value)}
              placeholder="Special instructions for speech-to-text"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Initial Message */}
      <Card>
        <CardHeader>
          <CardTitle>Initial Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="initial_message_text">Korean Initial Message</Label>
            <Textarea
              id="initial_message_text"
              value={formData.initial_message_text}
              onChange={(e) => handleInputChange('initial_message_text', e.target.value)}
              placeholder="안녕하세요! 오늘은 어떤 대화를 나눠볼까요?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initial_message_translation">English Translation</Label>
            <Textarea
              id="initial_message_translation"
              value={formData.initial_message_translation}
              onChange={(e) => handleInputChange('initial_message_translation', e.target.value)}
              placeholder="Hello! What kind of conversation would you like to have today?"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tasks ({formData.tasks.length})</span>
            <Button type="button" onClick={addTask} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.tasks.map((task, index) => (
            <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline">{index + 1}</Badge>
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="space-y-2">
                  <Label>Korean Text *</Label>
                  <Textarea
                    value={task.ko}
                    onChange={(e) => handleTaskChange(index, 'ko', e.target.value)}
                    placeholder="한국어 텍스트"
                    rows={2}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>English Text *</Label>
                  <Textarea
                    value={task.en}
                    onChange={(e) => handleTaskChange(index, 'en', e.target.value)}
                    placeholder="English text"
                    rows={2}
                    required
                  />
                </div>
              </div>
              
              {formData.tasks.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTask(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : scenario ? 'Update Scenario' : 'Create Scenario'}
        </Button>
      </div>
    </form>
  );
}
