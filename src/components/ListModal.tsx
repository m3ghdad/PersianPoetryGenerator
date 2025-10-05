import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { Plus, Trash2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Poem {
  id: number;
  title: string;
  text: string;
  poet: {
    name: string;
  };
  category: {
    title: string;
  };
}

interface PoemList {
  id: number;
  name: string;
  description: string;
  poems: Poem[];
  createdAt: string;
}

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  poem?: Poem;
  onListsUpdated: (lists: PoemList[]) => void;
}

export function ListModal({ isOpen, onClose, accessToken, poem, onListsUpdated }: ListModalProps) {
  const [lists, setLists] = useState<PoemList[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadLists();
    }
  }, [isOpen, accessToken]);

  useEffect(() => {
    if (poem && lists.length > 0) {
      // Check which lists already contain this poem
      const listsWithPoem = lists
        .filter(list => list.poems.some(p => p.id === poem.id))
        .map(list => list.id);
      setSelectedLists(listsWithPoem);
    }
  }, [poem, lists]);

  const loadLists = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/lists`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();
      if (response.ok) {
        setLists(result.lists);
      } else {
        toast.error('خطا در بارگذاری لیست‌ها');
      }
    } catch (error) {
      console.error('Load lists error:', error);
      toast.error('خطا در بارگذاری لیست‌ها');
    }
  };

  const createList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription
        })
      });

      const result = await response.json();
      if (response.ok) {
        setLists(result.lists);
        setNewListName('');
        setNewListDescription('');
        setShowCreateForm(false);
        toast.success('لیست جدید ایجاد شد');
        onListsUpdated(result.lists);
      } else {
        toast.error('خطا در ایجاد لیست');
      }
    } catch (error) {
      console.error('Create list error:', error);
      toast.error('خطا در ایجاد لیست');
    } finally {
      setLoading(false);
    }
  };

  const togglePoemInList = async (listId: number, isSelected: boolean) => {
    if (!poem) return;

    try {
      if (isSelected) {
        // Add poem to list
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/lists/${listId}/poems`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ poem })
        });

        const result = await response.json();
        if (response.ok) {
          setLists(result.lists);
          setSelectedLists([...selectedLists, listId]);
          onListsUpdated(result.lists);
          toast.success('شعر به لیست اضافه شد');
        }
      } else {
        // Remove poem from list
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/lists/${listId}/poems/${poem.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const result = await response.json();
        if (response.ok) {
          setLists(result.lists);
          setSelectedLists(selectedLists.filter(id => id !== listId));
          onListsUpdated(result.lists);
          toast.success('شعر از لیست حذف شد');
        }
      }
    } catch (error) {
      console.error('Toggle poem in list error:', error);
      toast.error('خطا در به‌روزرسانی لیست');
    }
  };

  const deleteList = async (listId: number) => {
    if (!confirm('آیا از حذف این لیست اطمینان دارید؟')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c192d0ee/lists/${listId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();
      if (response.ok) {
        setLists(result.lists);
        onListsUpdated(result.lists);
        toast.success('لیست حذف شد');
      }
    } catch (error) {
      console.error('Delete list error:', error);
      toast.error('خطا در حذف لیست');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-center">
            {poem ? 'افزودن به لیست' : 'مدیریت لیست‌ها'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {poem ? 'انتخاب لیست برای افزودن شعر' : 'مدیریت و ویرایش لیست‌های اشعار'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new list form */}
          {showCreateForm ? (
            <form onSubmit={createList} className="space-y-3 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="list-name">نام لیست</Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="نام لیست جدید..."
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="list-description">توضیحات (اختیاری)</Label>
                <Textarea
                  id="list-description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="توضیحات لیست..."
                  rows={2}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'در حال ایجاد...' : 'ایجاد لیست'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>
                  انصراف
                </Button>
              </div>
            </form>
          ) : (
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 ml-2" />
              ایجاد لیست جدید
            </Button>
          )}

          {/* Existing lists */}
          {lists.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              هیچ لیستی وجود ندارد
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {poem && (
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={(checked) => togglePoemInList(list.id, checked as boolean)}
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{list.name}</div>
                      {list.description && (
                        <div className="text-sm text-muted-foreground">{list.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {list.poems.length} شعر
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(list.createdAt).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteList(list.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              بستن
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}