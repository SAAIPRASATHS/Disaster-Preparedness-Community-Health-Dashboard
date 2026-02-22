import { memo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: '#2E2E2E', font: { family: 'Inter' } } } },
    scales: { x: { ticks: { color: '#8E9AAF' }, grid: { color: '#eef0f6' } }, y: { ticks: { color: '#8E9AAF' }, grid: { color: '#eef0f6' } } },
};

const doughnutOpts = {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { size: 10, weight: 'bold' }, color: '#64748b' } } },
};

function AdminCharts({ clusters, t }) {
    const barData = clusters?.clusters?.length ? {
        labels: clusters.clusters.map((c) => c.area),
        datasets: [{
            label: 'Reports',
            data: clusters.clusters.map((c) => c.totalReports),
            backgroundColor: 'rgba(92,122,234,0.6)',
            borderColor: '#5C7AEA',
            borderWidth: 1,
            borderRadius: 8,
        }],
    } : null;

    const doughnutData = clusters?.clusters?.length ? {
        labels: clusters.clusters.map((c) => c.predictedDiseaseType),
        datasets: [{
            data: clusters.clusters.map((c) => c.confidence * 100),
            backgroundColor: ['#E85D75', '#F0A500', '#5C7AEA', '#4CAF82', '#8E9AAF', '#A7C7E7'],
            borderWidth: 0,
        }],
    } : null;

    if (!barData && !doughnutData) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {barData && (
                <div className="glass-card p-10 shadow-lg">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('adminDashboard.reportsByArea')}</h3>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-sm">📊</div>
                    </div>
                    <Bar data={barData} options={chartOpts} />
                </div>
            )}
            {doughnutData && (
                <div className="glass-card p-10 shadow-lg">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t('adminDashboard.outbreakConfidence')}</h3>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-sm">📈</div>
                    </div>
                    <div className="max-w-[280px] mx-auto">
                        <Doughnut data={doughnutData} options={doughnutOpts} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(AdminCharts);
