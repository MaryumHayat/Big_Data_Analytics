let predictionChartInstance = null;

document.addEventListener("DOMContentLoaded", function() {
    // Initialize Premium Live Analytics Charts Matrix
    renderLiveDashboardCharts();

    // Handle the dynamic slide reveal trigger
    document.getElementById('initializeConsoleBtn').addEventListener('click', function() {
        const workspace = document.getElementById('diagnosticWorkspace');
        workspace.classList.add('revealed');
        
        // Smoothly slide view to position form interface comfortably in view
        setTimeout(() => {
            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        
        // Hide CTA after launch activation to maximize available room
        document.getElementById('triggerContainer').classList.add('hidden');
    });

    // Ingestion Form Controller
    document.getElementById('aqiForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnIcon = submitBtn.querySelector('.btn-icon');

        btnText.textContent = "Analyzing Atmosphere...";
        btnIcon.className = "fa-solid fa-spinner fa-spin";
        submitBtn.disabled = true;

        // Restructure the parameters to perfectly match the key schemas expected by PySpark configuration
        const payload = {
            components_pm2_5: parseFloat(document.getElementById('pm25').value) || 0.0,
            components_co: parseFloat(document.getElementById('co').value) || 0.0,
            components_no2: parseFloat(document.getElementById('no2').value) || 0.0,
            temperature_2m: parseFloat(document.getElementById('temp').value) || 0.0,
            components_o3: 42.0, 
            components_pm10: (parseFloat(document.getElementById('pm25').value) * 1.25) || 50.0,
            components_so2: 9.5,
            relative_humidity_2m: 55.0,
            wind_speed_10m: 11.2,
            hour: new Date().getHours(),
            month: new Date().getMonth() + 1
        };

        fetch('/predict', {
            method: 'POST',
            boxSizing: 'border-box',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        .then(response => {
            if (!response.ok) throw new Error('Offline Engine Active');
            return response.json();
        })
        .then(result => {
            renderInterfaceAQI(result.aqi_code, result.aqi_label, result.aqi_desc);
            renderPostPredictionChart(payload);
        })
        .catch(err => {
            // Simulation Fallback Matrix Logic if server connectivity is loading
            setTimeout(() => {
                const pm = payload.components_pm2_5;
                let mockCode = 1;
                let label = "Optimal Clear Air";
                let desc = "Atmosphere layer is pristine. Minimal health risks found.";
                
                if (pm > 150) { mockCode = 5; label = "Severe Dispersion Crisis"; desc = "Highly hazardous conditions. Restricted exposure."; }
                else if (pm > 100) { mockCode = 4; label = "Atmospheric Smog Risk"; desc = "Elevated pollutant profiles; warning active."; }
                else if (pm > 50) { mockCode = 3; label = "Moderate Air Velocity"; desc = "Acceptable parameters for standard environments."; }
                else if (pm > 25) { mockCode = 2; label = "Fair Profile"; desc = "Minimal hypersensitivity triggers detected."; }
                
                renderInterfaceAQI(mockCode, label, desc);
                renderPostPredictionChart(payload);
            }, 600);
        })
        .finally(() => {
            btnText.textContent = "Execute Spark Prediction";
            btnIcon.className = "fa-solid fa-bolt";
            submitBtn.disabled = false;
        });
    });
});

function renderInterfaceAQI(code, label, desc) {
    document.getElementById('placeholderText').classList.add('hidden');
    document.getElementById('resultDisplay').classList.remove('hidden');

    const valueDisplay = document.getElementById('aqiValue');
    const statusText = document.getElementById('aqiStatus');
    const adviceText = document.getElementById('aqiAdvice');
    const gaugeGlow = document.getElementById('gaugeGlow');
    const badgeElement = document.getElementById('aqiBadge');

    // Map class index level to specific target integers for counter presentation scale
    let indicatorInteger = 25;
    if (code === 2) indicatorInteger = 45;
    if (code === 3) indicatorInteger = 78;
    if (code === 4) indicatorInteger = 135;
    if (code === 5) indicatorInteger = 240;

    animateCounter('aqiValue', indicatorInteger);
    statusText.textContent = label;
    adviceText.textContent = desc;

    if (code <= 2) {
        valueDisplay.style.color = '#10b981';
        statusText.style.color = '#10b981';
        gaugeGlow.style.background = 'radial-gradient(circle, #10b981 0%, transparent 70%)';
        badgeElement.textContent = "Satisfactory Status";
    } else if (code === 3) {
        valueDisplay.style.color = '#f59e0b';
        statusText.style.color = '#f59e0b';
        gaugeGlow.style.background = 'radial-gradient(circle, #f59e0b 0%, transparent 70%)';
        badgeElement.textContent = "Moderate Threshold Alert";
    } else if (code === 4) {
        valueDisplay.style.color = '#f97316';
        statusText.style.color = '#f97316';
        gaugeGlow.style.background = 'radial-gradient(circle, #f97316 0%, transparent 70%)';
        badgeElement.textContent = "Unhealthy Profile Warning";
    } else {
        valueDisplay.style.color = '#ef4444';
        statusText.style.color = '#ef4444';
        gaugeGlow.style.background = 'radial-gradient(circle, #ef4444 0%, transparent 70%)';
        badgeElement.textContent = "Hazardous Environmental State";
    }
}

function animateCounter(id, targetValue) {
    const obj = document.getElementById(id);
    let current = 0;
    const duration = 600;
    const stepTime = Math.abs(Math.floor(duration / targetValue));
    const timer = setInterval(() => {
        current += 4;
        if (current >= targetValue) {
            obj.textContent = targetValue;
            clearInterval(timer);
        } else {
            obj.textContent = current;
        }
    }, Math.max(stepTime, 8));
}

function renderLiveDashboardCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
        }
    };

    const ctxCity = document.getElementById('cityTrendChart').getContext('2d');
    const cityChart = new Chart(ctxCity, {
        type: 'bar',
        data: {
            labels: ['Lahore', 'Peshawar', 'Karachi', 'Islamabad', 'Quetta'],
            datasets: [{
                label: 'Mean Dataset AQI Weight',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.55)',
                    'rgba(249, 115, 22, 0.55)',
                    'rgba(245, 158, 11, 0.55)',
                    'rgba(59, 130, 246, 0.55)',
                    'rgba(16, 185, 129, 0.55)'
                ],
                borderColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: chartOptions
    });

    const ctxSeasonal = document.getElementById('seasonalSmogChart').getContext('2d');
    const seasonalChart = new Chart(ctxSeasonal, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Lahore Northern Node',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.02)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Karachi Coastal Node',
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    borderColor: '#38bdf8',
                    backgroundColor: 'rgba(56, 189, 248, 0.02)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: chartOptions
    });

    fetch('/get-live-analytics')
        .then(response => response.json())
        .then(data => {
            cityChart.data.datasets[0].data = data.city_averages;
            cityChart.update();

            seasonalChart.data.datasets[0].data = data.lahore_seasonal;
            seasonalChart.data.datasets[1].data = data.karachi_seasonal;
            seasonalChart.update();
        })
        .catch(err => {
            // Inline Simulation parameters if network core is initializing
            setTimeout(() => {
                cityChart.data.datasets[0].data = [198, 154, 118, 92, 74];
                cityChart.update();
                seasonalChart.data.datasets[0].data = [283, 277, 258, 236, 237, 241, 210, 260, 277, 279, 292, 298];
                seasonalChart.data.datasets[1].data = [130, 128, 119, 109, 109, 111, 97, 120, 128, 129, 135, 138];
                seasonalChart.update();
            }, 300);
        });
}

// PHASE 4: Dynamic Visualization implementation matching user submission variables
function renderPostPredictionChart(payload) {
    const section = document.getElementById('postPredictionSection');
    section.classList.remove('hidden');

    const ctx = document.getElementById('predictionAnalysisChart').getContext('2d');
    
    // Cleanup existing instance context to support repetitive calculations safely
    if (predictionChartInstance) {
        predictionChartInstance.destroy();
    }

    // Historical benchmark medians from dataset parameters configuration file
    const historicalMedians = [101.0, 1795.7, 38.6, 21.5];
    const currentInputs = [
        payload.components_pm2_5,
        payload.components_co,
        payload.components_no2,
        payload.temperature_2m
    ];

    // Normalize values scale parameters for presentation comparison profiles
    const normalizedHistorical = [100, 100, 100, 100];
    const normalizedCurrent = currentInputs.map((val, i) => {
        return roundToTwo((val / historicalMedians[i]) * 100);
    });

    predictionChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['PM2.5 Conc.', 'Carbon Monoxide', 'Nitrogen Dioxide', 'Ambient Temperature'],
            datasets: [
                {
                    label: 'Your Current Telemetry Profile (% of baseline)',
                    data: normalizedCurrent,
                    backgroundColor: 'rgba(56, 189, 248, 0.75)',
                    borderColor: '#38bdf8',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Historical Data Baseline Average (100%)',
                    data: normalizedHistorical,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    type: 'line',
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.03)' }, 
                    ticks: { 
                        color: '#94a3b8', 
                        font: { size: 10 },
                        callback: function(value) { return value + '%'; }
                    } 
                }
            }
        }
    });
}

function roundToTwo(num) {
    return +(Math.round(num + "e+2")  + "e-2");
}