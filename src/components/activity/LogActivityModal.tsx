// src/components/activity-tracking/LogActivityModal.tsx
import { useState, useEffect, useRef } from 'react';
import { X, Phone, Mail, MessageSquare, User, FileText, Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  createActivityLog,
  createReminder,
  selectMutating,
  selectMutationError,
  clearMutationError,
} from '../../store/slices/activityTrackingSlice';
import type {
  ActivityChannel,
  ContactSource,
  JudgeOption,
} from '../../types/activity-tracking.types';
import { CHANNEL_LABELS } from '../../types/activity-tracking.types';

interface LogActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  judges: JudgeOption[]; // TODO: wire to your existing judges list source
  onLogged?: () => void; // called after a successful save, e.g. to refresh a list
}

const CHANNELS: ActivityChannel[] = ['call', 'email', 'whatsapp', 'in_person', 'letter', 'other'];

function nowForDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

const LogActivityModal: React.FC<LogActivityModalProps> = ({
  isOpen,
  onClose,
  departmentId,
  judges,
  onLogged,
}) => {
  const dispatch = useAppDispatch();
  const mutating = useAppSelector(selectMutating);
  const mutationError = useAppSelector(selectMutationError);

  const [contactSource, setContactSource] = useState<ContactSource>('manual');
  const [judgeId, setJudgeId] = useState<string>('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [channel, setChannel] = useState<ActivityChannel>('call');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(nowForDatetimeLocal());

  const [addReminder, setAddReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState(todayIsoDate());
const isInitializedRef = useRef(false);

// Add a ref to track if the form has been initialized


useEffect(() => {
  if (isOpen && !isInitializedRef.current) {
    // Reset form state
    setContactSource('manual');
    setJudgeId('');
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setChannel('call');
    setSummary('');
    setOccurredAt(nowForDatetimeLocal());
    setAddReminder(false);
    setReminderMessage('');
    setReminderDueDate(todayIsoDate());
    
    dispatch(clearMutationError());
    isInitializedRef.current = true;
  }
  
  // Reset the flag when modal closes
  if (!isOpen) {
    isInitializedRef.current = false;
  }
}, [isOpen, dispatch]);

  const handleJudgeSelect = (id: string) => {
    setJudgeId(id);
    const judge = judges.find((j) => j.id === id);
    if (judge) {
      setContactName(judge.name);
      setContactPhone(judge.phone ?? '');
      setContactEmail(judge.email ?? '');
    }
  };

  const handleContactSourceChange = (source: ContactSource) => {
    setContactSource(source);
    if (source === 'manual') {
      setJudgeId('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
    }
  };

  const isValid =
    contactName.trim().length > 0 &&
    summary.trim().length > 0 &&
    (contactSource === 'manual' || judgeId.length > 0) &&
    (!addReminder || reminderMessage.trim().length > 0);

  const handleSave = async () => {
    if (!isValid) return;

    const logResult = await dispatch(
      createActivityLog({
        contactSource,
        judgeId: contactSource === 'judge' ? judgeId : null,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim() || null,
        contactEmail: contactEmail.trim() || null,
        departmentId,
        channel,
        summary: summary.trim(),
        occurredAt: new Date(occurredAt).toISOString(),
      })
    );

    if (createActivityLog.rejected.match(logResult)) {
      return; // mutationError is already set in the slice; keep modal open
    }

    if (addReminder) {
      const newLog = logResult.payload as { id: string };
      await dispatch(
        createReminder({
          contactSource,
          judgeId: contactSource === 'judge' ? judgeId : null,
          contactName: contactName.trim(),
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          departmentId,
          relatedActivityId: newLog.id,
          message: reminderMessage.trim(),
          dueDate: reminderDueDate,
        })
      );
    }

    onLogged?.();
    onClose();
  };

  if (!isOpen) return null;

  const channelIcon = (c: ActivityChannel) => {
    switch (c) {
      case 'call':
        return <Phone size={14} />;
      case 'email':
        return <Mail size={14} />;
      case 'whatsapp':
        return <MessageSquare size={14} />;
      default:
        return <FileText size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">Log Activity</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {mutationError && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-sm text-rose-700">
              {mutationError}
            </div>
          )}

          {/* Contact source toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Who did you speak with?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleContactSourceChange('judge')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  contactSource === 'judge'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                A Judge
              </button>
              <button
                type="button"
                onClick={() => handleContactSourceChange('manual')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  contactSource === 'manual'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Someone Else
              </button>
            </div>
          </div>

          {contactSource === 'judge' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Judge</label>
              <select
                value={judgeId}
                onChange={(e) => handleJudgeSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a judge...</option>
                {judges.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <User size={14} className="inline mr-1 -mt-0.5" />
                  Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Who did you talk to?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Phone (optional)</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">How did you reach them?</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    channel === c
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {channelIcon(c)}
                  {CHANNEL_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          {/* When */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">When did this happen?</label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              What was discussed? <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="e.g. Discussed the backlog of Form 30 applications, agreed to expedite..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Reminder */}
          <div className="border-t border-slate-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addReminder}
                onChange={(e) => setAddReminder(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Bell size={14} />
                Set a follow-up reminder
              </span>
            </label>

            {addReminder && (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reminder message</label>
                  <input
                    type="text"
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="e.g. Call back to confirm the hearing date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Due date</label>
                  <input
                    type="date"
                    value={reminderDueDate}
                    onChange={(e) => setReminderDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || mutating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {mutating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogActivityModal;