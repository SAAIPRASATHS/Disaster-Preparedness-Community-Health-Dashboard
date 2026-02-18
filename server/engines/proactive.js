const LiveAlert = require('../models/LiveAlert');

/**
 * Proactive alert engine — detects patterns and generates preventive alerts.
 * Called after risk assessment or cluster detection.
 */
async function checkProactiveAlerts(io, context) {
    const alerts = [];

    // 1. High rain + humidity → predict dengue
    if (context.weather) {
        const { rainfall, humidity, temp } = context.weather;
        if ((rainfall > 20 || humidity > 80) && temp > 25) {
            const alert = {
                type: 'proactive',
                message: `Dengue risk predicted for ${context.city}: high humidity (${humidity}%) + rainfall (${rainfall}mm) + warm temperature (${temp}°C). Take preventive measures.`,
                severity: humidity > 85 ? 'HIGH' : 'MEDIUM',
                area: context.city || 'Unknown',
                source: 'proactive-engine',
            };
            alerts.push(alert);
            await LiveAlert.create(alert);
        }

        // Post-flood waterborne disease risk
        if (rainfall > 50) {
            const alert = {
                type: 'proactive',
                message: `Waterborne disease risk for ${context.city}: heavy rainfall (${rainfall}mm). Boil water before consumption. Avoid wading in flood waters.`,
                severity: 'HIGH',
                area: context.city || 'Unknown',
                source: 'proactive-engine',
            };
            alerts.push(alert);
            await LiveAlert.create(alert);
        }
    }

    // 2. Outbreak escalation — if cluster confidence is high
    if (context.clusters && context.clusters.length > 0) {
        for (const cluster of context.clusters) {
            if (cluster.confidence >= 0.7 && cluster.totalReports >= 5) {
                const alert = {
                    type: 'proactive',
                    message: `Outbreak escalation: ${cluster.predictedDiseaseType} in ${cluster.area} — ${cluster.totalReports} reports with ${(cluster.confidence * 100).toFixed(0)}% confidence. Deploy rapid response team.`,
                    severity: 'CRITICAL',
                    area: cluster.area,
                    source: 'proactive-engine',
                };
                alerts.push(alert);
                await LiveAlert.create(alert);
            }
        }
    }

    // Broadcast proactive alerts
    if (io && alerts.length > 0) {
        for (const alert of alerts) {
            io.emit('proactive-alert', alert);
        }
    }

    return alerts;
}

module.exports = { checkProactiveAlerts };
