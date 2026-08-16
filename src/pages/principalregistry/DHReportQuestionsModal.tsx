// src/components/principalregistry/ReportQuestionsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react';
import type { ReportQuestion, ReportFormData } from '../../types/principal-registry-report.types';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
  fetchReportQuestions,
  selectReportQuestionsData,
  selectQuestionsLoading, // ✅ Updated import
} from '../../store/slices/principalRegistryReportSlice';

interface ReportQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentId?: string;
  initialData?: Partial<ReportFormData>;
  onSave?: (data: ReportFormData) => void;
  readOnly?: boolean;
  title?: string;
}

interface QuestionWithChildren extends ReportQuestion {
  children?: QuestionWithChildren[];
}

// ─── Helper: Flatten initial object ─────────────────────────────
const getFlatInitialData = (initialData?: Partial<ReportFormData>): Record<string, unknown> => {
  if (!initialData) return {};
  
  const flatData: Record<string, unknown> = {};

  const flattenObject = (obj: unknown, prefix: string = '') => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      if (prefix) {
        flatData[prefix] = obj;
      }
      return;
    }

    for (const key of Object.keys(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = (obj as Record<string, unknown>)[key];

      if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
        flattenObject(value, fullKey);
      } else {
        flatData[fullKey] = value;
      }
    }
  };

  flattenObject(initialData);
  return flatData;
};

// ─── Helper: Group & Sort questions strictly by displayOrder ────
const groupQuestionsBySection = (questions: ReportQuestion[]) => {
  const grouped: Record<number, { sectionNumber: number; sectionTitle: string; questions: ReportQuestion[] }> = {};

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const sortedQuestions = [...safeQuestions].sort((a, b) => a.displayOrder - b.displayOrder);

  sortedQuestions.forEach((q) => {
    if (!grouped[q.sectionNumber]) {
      grouped[q.sectionNumber] = {
        sectionNumber: q.sectionNumber,
        sectionTitle: q.sectionTitle,
        questions: [],
      };
    }

    const questionWithChildren = q as QuestionWithChildren;
    if (questionWithChildren.children && Array.isArray(questionWithChildren.children)) {
      questionWithChildren.children.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    grouped[q.sectionNumber].questions.push(q);
  });

  Object.values(grouped).forEach((section) => {
    section.questions.sort((a, b) => a.displayOrder - b.displayOrder);
  });

  return Object.values(grouped).sort((a, b) => {
    const minOrderA = a.questions[0]?.displayOrder ?? a.sectionNumber;
    const minOrderB = b.questions[0]?.displayOrder ?? b.sectionNumber;
    return minOrderA - minOrderB;
  });
};

// ─── Render Helpers ────────────────────────────────────────────

const renderQuestionInput = (
  question: ReportQuestion,
  value: unknown,
  onChange: (key: string, value: unknown) => void,
  readOnly: boolean
) => {
  const isGroup = question.questionType === 'group';
  const isList = question.questionType === 'list';
  const isDateList = question.questionType === 'date_list';
  const isBoolean = question.questionType === 'boolean';
  const isNumber = question.questionType === 'number';
  const isDate = question.questionType === 'date';

  if (isGroup) {
    return null;
  }

  const commonProps = {
    disabled: readOnly,
    className: readOnly
      ? 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 cursor-not-allowed'
      : 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
  };

  if (isBoolean) {
    const boolValue = value as boolean | undefined;
    return (
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={boolValue === true}
            onChange={() => onChange(question.questionKey, true)}
            disabled={readOnly}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={boolValue === false}
            onChange={() => onChange(question.questionKey, false)}
            disabled={readOnly}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">No</span>
        </label>
      </div>
    );
  }

  if (isList || isDateList) {
    const items = Array.isArray(value) ? (value as string[]) : [];
    const isDateType = isDateList;

    return (
      <div className="space-y-2">
        {items.map((item: string, index: number) => (
          <div key={`${question.questionKey}-item-${index}`} className="flex items-center gap-2">
            <input
              type={isDateType ? 'date' : 'text'}
              value={item || ''}
              onChange={(e) => {
                const newItems = [...items];
                newItems[index] = e.target.value;
                onChange(question.questionKey, newItems);
              }}
              disabled={readOnly}
              className={commonProps.className}
              placeholder={isDateType ? 'Select date' : 'Enter item...'}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  const newItems = items.filter((_, i) => i !== index);
                  onChange(question.questionKey, newItems);
                }}
                className="p-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              const newItems = [...items, ''];
              onChange(question.questionKey, newItems);
            }}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Plus size={16} /> Add {isDateType ? 'date' : 'item'}
          </button>
        )}
      </div>
    );
  }

  if (isNumber) {
    const numValue = value === '' || value === undefined || value === null ? '' : Number(value);
    return (
      <input
        type="number"
        value={numValue}
        onChange={(e) => {
          const val = e.target.value;
          onChange(question.questionKey, val === '' ? '' : Number(val));
        }}
        min={0}
        {...commonProps}
      />
    );
  }

  if (isDate) {
    const dateValue = (value as string) || '';
    return (
      <input
        type="date"
        value={dateValue}
        onChange={(e) => onChange(question.questionKey, e.target.value)}
        {...commonProps}
      />
    );
  }

  const textValue = (value as string) || '';
  return (
    <input
      type="text"
      value={textValue}
      onChange={(e) => onChange(question.questionKey, e.target.value)}
      placeholder={readOnly ? '' : 'Enter your response...'}
      {...commonProps}
    />
  );
};

// ─── Main Component ────────────────────────────────────────────

export const DHReportQuestionsModal: React.FC<ReportQuestionsModalProps> = ({
  isOpen,
  onClose,
  departmentId,
  initialData = {},
  onSave,
  readOnly = false,
  title = 'Principal Registry Weekly Report',
}) => {
  const dispatch = useAppDispatch();

  // Side-effect: fetch questions when opened (external system interaction)
  useEffect(() => {
    if (isOpen) {
      if (departmentId) {
        dispatch(fetchReportQuestions(departmentId));
      } else {
        dispatch(fetchReportQuestions());
      }
    }
  }, [dispatch, isOpen, departmentId]);

  const rawQuestions = useAppSelector(selectReportQuestionsData);
  const loading = useAppSelector(selectQuestionsLoading); // ✅ Updated selector

  const safeQuestions = useMemo(() => {
    if (Array.isArray(rawQuestions)) return rawQuestions;
    if (rawQuestions && typeof rawQuestions === 'object') {
      const nested = (rawQuestions as Record<string, unknown>).data || (rawQuestions as Record<string, unknown>).questions;
      if (Array.isArray(nested)) return nested as ReportQuestion[];
    }
    return [];
  }, [rawQuestions]);

  const groupedSections = useMemo(() => {
    return groupQuestionsBySection(safeQuestions);
  }, [safeQuestions]);

  // Track props to adjust state during render without useEffect
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialData, setPrevInitialData] = useState(initialData);

  const [formData, setFormData] = useState<Record<string, unknown>>(() => getFlatInitialData(initialData));
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    () => new Set(groupedSections.map((s) => s.sectionNumber))
  );

  // Sync state during render pass (React-recommended pattern for props-to-state sync)
  if (isOpen !== prevIsOpen || initialData !== prevInitialData) {
    setPrevIsOpen(isOpen);
    setPrevInitialData(initialData);

    if (isOpen) {
      setFormData(getFlatInitialData(initialData));
      setExpandedSections(new Set(groupedSections.map((s) => s.sectionNumber)));
    }
  }

  if (!isOpen) return null;

  // ─── Handlers ──────────────────────────────────────────────────

  const handleChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

const handleSave = () => {
  if (onSave) {
    // Initialize with proper type
    const result: ReportFormData = {
      weekEndingDates: [],
      reportPeriodStart: '',
      reportPeriodEnd: '',
      departmentId: '',
      administrativeOverview: { 
        keyActivities: [], 
        notableIssues: [], 
        resolutionsStatus: [] 
      },
      caseManagement: { 
        form30PendingCount: 0, 
        forwardedToGp: false, 
        submissionDates: null, 
        noticesSubmittedCount: null, 
        nonSubmissionReason: null, 
        expectedSubmissionDate: null 
      },
      automationStatus: { 
        excelUpdateStatus: '', 
        systemBuildStatus: '' 
      },
      serviceDeliveryChallenges: { 
        hasChallenges: false, 
        challengeDetails: null, 
        proposedSolutions: [], 
        needsRhcIntervention: false, 
        interventionDetails: null 
      },
      highlights: { 
        achievements: [] 
      },
      otherInformation: { 
        ctsEfilingChanges: [], 
        gpChanges: [], 
        signOff: { 
          preparedDate: '', 
          preparedByName: '', 
          preparedByDesignation: '' 
        } 
      },
    };

    // Map flat formData to nested structure using a helper object
    const flatEntries = Object.entries(formData);
    
    // Use a separate object with index signature for building
    const builtResult: Record<string, unknown> = {};
    
    for (const [key, value] of flatEntries) {
      const keys = key.split('.');
      let current: Record<string, unknown> = builtResult;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
    }

    // Merge the built result into the typed result
    // Using type assertion since we know the structure matches
    const mergedResult = {
      ...result,
      ...builtResult
    } as ReportFormData;

    // ✅ Ensure weekEndingDates has at least one date
    if (!mergedResult.weekEndingDates || mergedResult.weekEndingDates.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      mergedResult.weekEndingDates = [mergedResult.reportPeriodEnd || today];
    }

    // ✅ Ensure reportPeriodStart has a value
    if (!mergedResult.reportPeriodStart) {
      mergedResult.reportPeriodStart = new Date().toISOString().split('T')[0];
    }

    // ✅ Ensure reportPeriodEnd has a value
    if (!mergedResult.reportPeriodEnd) {
      mergedResult.reportPeriodEnd = new Date().toISOString().split('T')[0];
    }

    // ✅ Ensure signOff dates have values
    if (mergedResult.otherInformation && mergedResult.otherInformation.signOff) {
      if (!mergedResult.otherInformation.signOff.preparedDate) {
        mergedResult.otherInformation.signOff.preparedDate = new Date().toISOString().split('T')[0];
      }
    }

    console.log('Saving result:', mergedResult);
    onSave(mergedResult);
  }
  onClose();
};

  const toggleSection = (sectionNumber: number) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionNumber)) {
        newSet.delete(sectionNumber);
      } else {
        newSet.add(sectionNumber);
      }
      return newSet;
    });
  };

  // ─── Conditional Visibility Check ────────────────────────────

  const isQuestionVisible = (question: ReportQuestion): boolean => {
    if (!question.conditionalOn) return true;
    const { questionKey, equals } = question.conditionalOn;
    const parentValue = formData[questionKey];

    return String(parentValue) === String(equals);
  };

  // ─── Render Question ──────────────────────────────────────────

  const renderQuestion = (question: ReportQuestion, depth: number = 0) => {
    const isGroup = question.questionType === 'group';
    const isVisible = isQuestionVisible(question);

    if (!isVisible) return null;

    const value = formData[question.questionKey] ?? '';
    const children = (question as QuestionWithChildren).children || [];

    const sortedChildren = Array.isArray(children)
      ? [...children].sort((a, b) => a.displayOrder - b.displayOrder)
      : [];

    return (
      <div key={question.questionKey} style={{ marginLeft: depth * 24 }}>
        {isGroup ? (
          <div className="mt-4 mb-2">
            <h4 className="text-sm font-semibold text-gray-700">{question.questionLabel}</h4>
            {sortedChildren.length > 0 && (
              <div className="ml-0 mt-1 space-y-3">
                {sortedChildren.map((child: QuestionWithChildren) => renderQuestion(child, depth + 1))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {question.questionLabel}
              {question.isRequired && <span className="text-red-500 ml-1">*</span>}
              {readOnly && <span className="text-xs text-gray-400 ml-2">(read-only)</span>}
            </label>
            {renderQuestionInput(question, value, handleChange, readOnly)}
          </div>
        )}
      </div>
    );
  };

  // ─── Render Section ──────────────────────────────────────────

  const renderSection = (section: { sectionNumber: number; sectionTitle: string; questions: ReportQuestion[] }) => {
    const isExpanded = expandedSections.has(section.sectionNumber);

    return (
      <div key={section.sectionNumber} className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
        <div
          className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 ${
            isExpanded ? 'bg-gray-50 border-b border-gray-200' : 'bg-white'
          }`}
          onClick={() => toggleSection(section.sectionNumber)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Section {section.sectionNumber}: {section.sectionTitle}
            </span>
            <span className="text-xs text-gray-400">
              ({section.questions.filter((q) => q.questionType !== 'group').length} questions)
            </span>
          </div>
          {isExpanded ? <ChevronDown size={18} className="text-gray-500" /> : <ChevronRight size={18} className="text-gray-500" />}
        </div>

        {isExpanded && (
          <div className="px-4 py-4 bg-white">
            {section.questions.map((question) => renderQuestion(question))}
          </div>
        )}
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {readOnly ? 'Viewing report details' : 'Fill in the weekly report questions'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p className="text-sm">Loading questions...</p>
            </div>
          ) : safeQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No questions available for this report.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedSections.map((section) => renderSection(section))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || safeQuestions.length === 0}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg transition-colors ${
                loading || safeQuestions.length === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-700'
              }`}
            >
              Save Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DHReportQuestionsModal;