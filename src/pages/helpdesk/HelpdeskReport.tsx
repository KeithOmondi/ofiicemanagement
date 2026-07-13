import { useEffect, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import {
    fetchDSAReport,
    selectDSAReport,
    selectDSAReportLoading,
    selectHelpDeskError,
    selectDSAReportTotal,
    type ReportModule,
    type DSAPaymentStatus,
} from '../../store/slices/helpdeskSlice';
import axiosClient from '../../api/api';

const MODULE_OPTIONS: { value: ReportModule; label: string }[] = [
    { value: 'circuit', label: 'Circuits' },
    { value: 'special_bench', label: 'Special Benches' },
    { value: 'part_heard', label: 'Part-Heards' },
    { value: 'service_week', label: 'Service Weeks' },
    { value: 'other_payment', label: 'Other Payments' },
];

const PAYMENT_STATUS_OPTIONS: DSAPaymentStatus[] = ['Pending', 'In Process', 'Paid', 'Payment NA'];

const HelpdeskReport = () => {
    const dispatch = useAppDispatch();
    const rows = useAppSelector(selectDSAReport);
    const loading = useAppSelector(selectDSAReportLoading);
    const error = useAppSelector(selectHelpDeskError);
    const totalDsa = useAppSelector(selectDSAReportTotal);

    const [judgeName, setJudgeName] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<DSAPaymentStatus | ''>('');
    const [selectedModules, setSelectedModules] = useState<ReportModule[]>([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        dispatch(fetchDSAReport({
            judge_name: judgeName || undefined,
            payment_status: paymentStatus || undefined,
            modules: selectedModules.length ? selectedModules : undefined,
        }));
    }, [dispatch, judgeName, paymentStatus, selectedModules]);

    const toggleModule = (mod: ReportModule) => {
        setSelectedModules((prev) =>
            prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
        );
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (selectedModules.length) params.set('modules', selectedModules.join(','));
            if (judgeName) params.set('judge_name', judgeName);
            if (paymentStatus) params.set('payment_status', paymentStatus);

            const response = await axiosClient.get(`/helpdesk/reports/dsa/export?${params.toString()}`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `dsa-report-${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-[#1E4620]">DSA Report</h1>
                <button
                    onClick={handleExport}
                    disabled={exporting || rows.length === 0}
                    className="flex items-center gap-2 bg-[#1E4620] text-[#C29B38] px-4 py-2 rounded-md disabled:opacity-50"
                >
                    <Download size={16} />
                    {exporting ? 'Exporting...' : 'Export to Excel'}
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 bg-stone-50 border border-stone-200 rounded-md p-3">
                <Filter size={16} className="text-stone-500" />
                {MODULE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-1.5 text-sm">
                        <input
                            type="checkbox"
                            checked={selectedModules.includes(opt.value)}
                            onChange={() => toggleModule(opt.value)}
                        />
                        {opt.label}
                    </label>
                ))}
                <input
                    type="text"
                    placeholder="Search judge name..."
                    value={judgeName}
                    onChange={(e) => setJudgeName(e.target.value)}
                    className="border border-stone-300 rounded-md px-3 py-1.5 text-sm"
                    maxLength={100}
                />
                <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as DSAPaymentStatus | '')}
                    className="border border-stone-300 rounded-md px-3 py-1.5 text-sm"
                >
                    <option value="">All Statuses</option>
                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="overflow-x-auto border border-stone-200 rounded-md">
                <table className="min-w-full text-sm">
                    <thead className="bg-[#1E4620] text-[#C29B38]">
                        <tr>
                            {['Module', 'Activity', 'Name', 'PJ No.', 'Desig', 'Travel Date', 'Travel Back', 'Days', 'Rate', 'Total', 'Requisition No.', 'Status'].map((h) => (
                                <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={12} className="px-3 py-6 text-center text-stone-500">Loading...</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={12} className="px-3 py-6 text-center text-stone-500">No records found</td></tr>
                        ) : (
                            rows.map((row) => (
                                <tr key={row.dsa_detail_id} className="border-t border-stone-200 hover:bg-stone-50">
                                    <td className="px-3 py-2">{row.module.replace('_', ' ')}</td>
                                    <td className="px-3 py-2">{row.activity}</td>
                                    <td className="px-3 py-2">{row.judge_name}</td>
                                    <td className="px-3 py-2">{row.pj_number}</td>
                                    <td className="px-3 py-2">{row.designation}</td>
                                    <td className="px-3 py-2">{row.travel_date ?? '—'}</td>
                                    <td className="px-3 py-2">{row.travel_back ?? '—'}</td>
                                    <td className="px-3 py-2">{row.days}</td>
                                    <td className="px-3 py-2">{row.dsa_per_day.toLocaleString()}</td>
                                    <td className="px-3 py-2 font-medium">{row.total.toLocaleString()}</td>
                                    <td className="px-3 py-2">{row.requisition_number ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        <span className={
                                            row.payment_status === 'Paid'
                                                ? 'text-[#1E4620] font-semibold'
                                                : row.payment_status === 'In Process'
                                                ? 'text-[#C29B38] font-semibold'
                                                : 'text-stone-500'
                                        }>
                                            {row.payment_status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {rows.length > 0 && (
                        <tfoot>
                            <tr className="border-t-2 border-stone-300 font-semibold bg-stone-50">
                                <td colSpan={9} className="px-3 py-2 text-right">Total DSA:</td>
                                <td className="px-3 py-2">{totalDsa.toLocaleString()}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default HelpdeskReport;