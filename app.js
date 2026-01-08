let globalGlucoseData = [];

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // Navigation 
    const navTabs = document.querySelectorAll(".nav-tab");
    const views = document.querySelectorAll(".view");

    navTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const viewName = tab.dataset.view;
            navTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            views.forEach((v) => v.classList.remove("active"));
            
            const targetView = document.getElementById(`${viewName}View`);
            if (targetView) targetView.classList.add("active");

            // 지연 후 그리기
            if(viewName === 'dashboard') {
                setTimeout(drawChart, 10);
            }
        });
    });

    // 초기 실행
    drawChart();
    
    // 리사이즈 이벤트
    window.addEventListener("resize", drawChart);
    
    // 툴팁 이벤트 등록
    setupTooltip();
}

// 데이터 생성
function generateGlucoseData() {
    const data = [];
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hour = time.getHours();
        let baseValue = 100;
        if (hour >= 6 && hour <= 9) baseValue = 95 + (hour - 6) * 5;
        else if (hour >= 12 && hour <= 14) baseValue = 110 + (hour - 12) * 8;
        else if (hour >= 18 && hour <= 21) baseValue = 105 + (hour - 18) * 3;
        else if (hour >= 22 || hour <= 5) baseValue = 95;
        
        const value = baseValue + (Math.random() * 20 - 10);
        data.push({
            time: hour,
            value: Math.round(value),
            label: hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`,
        });
    }
    return data;
}

// 차트 그리기 함수
function drawChart() {
  const canvas = document.getElementById("glucoseChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  globalGlucoseData = generateGlucoseData();
  const data = globalGlucoseData;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minValue = 60, maxValue = 180;

  const getX = (index) => padding.left + (index / (data.length - 1)) * chartWidth;
  const getY = (value) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;

  ctx.clearRect(0, 0, width, height);

  // 1. 목표 범위 배경 및 점선
  const targetMin = 70, targetMax = 140;
  ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
  ctx.fillRect(padding.left, getY(targetMax), chartWidth, getY(targetMin) - getY(targetMax));

  ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(padding.left, getY(targetMin));
  ctx.lineTo(width - padding.right, getY(targetMin));
  ctx.moveTo(padding.left, getY(targetMax));
  ctx.lineTo(width - padding.right, getY(targetMax));
  ctx.stroke();
  ctx.setLineDash([]);

  // --- 곡선 그리기 보조 함수 ---
  const drawCurve = (isFill) => {
      ctx.beginPath();
      if (isFill) {
          ctx.moveTo(getX(0), height - padding.bottom);
          ctx.lineTo(getX(0), getY(data[0].value));
      } else {
          ctx.moveTo(getX(0), getY(data[0].value));
      }

      for (let i = 0; i < data.length - 1; i++) {
          const x1 = getX(i);
          const y1 = getY(data[i].value);
          const x2 = getX(i + 1);
          const y2 = getY(data[i + 1].value);

          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;

          // 베지어 곡선
          ctx.quadraticCurveTo(x1, y1, midX, midY);
      }

      // 마지막 점 연결
      const lastX = getX(data.length - 1);
      const lastY = getY(data[data.length - 1].value);
      ctx.lineTo(lastX, lastY);

      if (isFill) {
          ctx.lineTo(lastX, height - padding.bottom);
          ctx.closePath();
          ctx.fill();
      } else {
          ctx.stroke();
      }
  };

  // 2. 그라디언트 채우기 
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(30, 64, 175, 0.2)");
  gradient.addColorStop(1, "rgba(30, 64, 175, 0.02)");
  ctx.fillStyle = gradient;
  drawCurve(true);

  // 3. 메인 라인 
  ctx.strokeStyle = "#1e40af";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  drawCurve(false);

  // 4. 데이터 점 (6단위)
  data.forEach((p, i) => {
      if (i % 6 === 0) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(getX(i), getY(p.value), 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1e40af";
          ctx.lineWidth = 2;
          ctx.stroke();
      }
  });

  // 5. Y축 레이블
  ctx.fillStyle = "#64748b";
  ctx.font = "11px Inter";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  [60, 90, 120, 150, 180].forEach(v => ctx.fillText(v, padding.left - 8, getY(v)));

  // 6. X축 시간 레이블
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  [0, 6, 12, 18, 24].forEach((hour) => {
      const index = data.findIndex((d) => d.time === hour);
      if (index !== -1) {
          ctx.fillText(data[index].label, getX(index), height - padding.bottom + 8);
      }
  });
}

// 툴팁 이벤트 설정
function setupTooltip() {
    const chartCanvas = document.getElementById("glucoseChart");
    const tooltip = document.getElementById("chartTooltip");
    if (!chartCanvas || !tooltip) return;

    chartCanvas.addEventListener("mousemove", (e) => {
        if (!globalGlucoseData.length) return;

        const rect = chartCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const chartWidth = rect.width - padding.left - padding.right;
        const chartHeight = rect.height - padding.top - padding.bottom;

        const index = Math.round(((x - padding.left) / chartWidth) * (globalGlucoseData.length - 1));

        if (index >= 0 && index < globalGlucoseData.length) {
            const point = globalGlucoseData[index];
            const pointX = padding.left + (index / (globalGlucoseData.length - 1)) * chartWidth;
            const pointY = padding.top + chartHeight - ((point.value - 60) / 120) * chartHeight;

            if (Math.abs(x - pointX) < 15) {
                tooltip.style.display = "block";
                tooltip.style.left = `${pointX}px`;
                tooltip.style.top = `${pointY - 10}px`;
                tooltip.style.transform = "translate(-50%, -100%)";
                tooltip.innerHTML = `
                    <div style="font-weight:700; color:#10b981; font-size:14px;">${point.value} <span style="font-size:10px; font-weight:400; color:#cbd5e1;">mg/dL</span></div>
                    <div style="font-size:10px; color:#94a3b8; margin-top:2px;">${point.label}</div>
                `;
            } else {
                tooltip.style.display = "none";
            }
        }
    });

    chartCanvas.addEventListener("mouseleave", () => tooltip.style.display = "none");
}
