import { useState, useEffect, useRef, useCallback } from “react”;

// ─── Astronomical Constants ───────────────────────────────────────────────────
const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

// Julian Day Number from calendar date
function julianDay(year, month, day, hour = 12) {
if (month <= 2) { year -= 1; month += 12; }
const A = Math.floor(year / 100);
const B = 2 - A + Math.floor(A / 4);
return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

// Julian centuries since J2000.0
function jc(jd) { return (jd - 2451545.0) / 36525.0; }

// ─── Sun position (low-precision VSOP87 truncation) ──────────────────────────
function sunLongitude(T) {
const L0 = 280.46646 + 36000.76983 * T;
const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
+ (0.019993 - 0.000101 * T) * Math.sin(2 * M)
+ 0.000289 * Math.sin(3 * M);
const sunLon = (L0 + C) % 360;
return { lon: sunLon < 0 ? sunLon + 360 : sunLon, M: M * RAD };
}

// ─── Moon position (Meeus Ch.47 - key terms) ──────────────────────────────────
function moonPosition(T) {
// Fundamental arguments (degrees)
let Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T; // mean longitude
let D  = 297.8501921 + 445267.1114034  * T - 0.0018819 * T * T; // mean elongation
let M  = 357.5291092 +  35999.0502909  * T - 0.0001536 * T * T; // sun mean anomaly
let Mp = 134.9633964 + 477198.8675055  * T + 0.0087414 * T * T; // moon mean anomaly
let F  =  93.2720950 + 483202.0175233  * T - 0.0036539 * T * T; // arg of latitude
const E = 1 - 0.002516 * T - 0.0000074 * T * T; // eccentricity correction

// Reduce to [0,360)
const r = v => ((v % 360) + 360) % 360;
Lp = r(Lp); D = r(D); M = r(M); Mp = r(Mp); F = r(F);

// Convert to radians
const [Lr, Dr, Mr, Mpr, Fr] = [Lp, D, M, Mp, F].map(v => v * DEG);

// Longitude perturbations (major terms from Meeus Table 47.A)
const dL =
6288774 * Math.sin(Mpr) +
1274027 * Math.sin(2*Dr - Mpr) +
658314 * Math.sin(2*Dr) +
214176 * Math.sin(2*Mpr) +
-185116 * E * Math.sin(Mr) +
-114332 * Math.sin(2*Fr) +
58793 * Math.sin(2*Dr - 2*Mpr) +
57066 * E * Math.sin(2*Dr - Mr - Mpr) +
53322 * Math.sin(2*Dr + Mpr) +
45758 * E * Math.sin(2*Dr - Mr) +
-40923 * E * Math.sin(Mr - Mpr) +
-34720 * Math.sin(Dr) +
-30383 * E * Math.sin(Mr + Mpr) +
15327 * Math.sin(2*Dr - 2*Fr) +
-12528 * Math.sin(Mpr + 2*Fr) +
10980 * Math.sin(Mpr - 2*Fr) +
10675 * Math.sin(4*Dr - Mpr) +
10034 * Math.sin(3*Mpr) +
8548 * Math.sin(4*Dr - 2*Mpr) +
-7888 * E * Math.sin(2*Dr + Mr - Mpr) +
-6766 * E * Math.sin(2*Dr + Mr) +
-5163 * Math.sin(Dr - Mpr) +
4987 * E * Math.sin(Dr + Mr) +
4036 * E * Math.sin(2*Dr - Mr + Mpr) +
3994 * Math.sin(2*Dr + 2*Mpr) +
3861 * Math.sin(4*Dr) +
3665 * Math.sin(2*Dr - 3*Mpr) +
-2689 * E * Math.sin(Mr - 2*Mpr) +
-2602 * Math.sin(2*Dr - Mpr + 2*Fr) +
2390 * E * Math.sin(2*Dr - Mr - 2*Mpr) +
-2348 * Math.sin(Dr + Mpr) +
2236 * E * E * Math.sin(2*Dr - 2*Mr) +
-2120 * E * Math.sin(Mr + 2*Mpr) +
-2069 * E * E * Math.sin(2*Mr) +
2048 * E * E * Math.sin(2*Dr - 2*Mr - Mpr) +
-1773 * Math.sin(2*Dr + Mpr - 2*Fr) +
-1595 * Math.sin(2*Dr + 2*Fr) +
1215 * E * Math.sin(4*Dr - Mr - Mpr) +
-1110 * Math.sin(2*Mpr + 2*Fr);

const moonLon = ((Lp + dL / 1000000) % 360 + 360) % 360;

// Distance perturbation for Earth-Moon distance (in km / 1000 units)
const dR =
-20905355 * Math.cos(Mpr) +
-3699111 * Math.cos(2*Dr - Mpr) +
-2955968 * Math.cos(2*Dr) +
-569925 * Math.cos(2*Mpr) +
48888 * E * Math.cos(Mr) +
-3149 * Math.cos(2*Fr) +
246158 * Math.cos(2*Dr - 2*Mpr) +
-152138 * E * Math.cos(2*Dr - Mr - Mpr) +
-170733 * Math.cos(2*Dr + Mpr) +
-204586 * E * Math.cos(2*Dr - Mr) +
-129620 * E * Math.cos(Mr - Mpr) +
108743 * Math.cos(Dr) +
104755 * E * Math.cos(Mr + Mpr) +
10321 * Math.cos(2*Dr - 2*Fr) +
79661 * Math.cos(Mpr - 2*Fr) +
-34782 * Math.cos(4*Dr - Mpr) +
-23210 * Math.cos(3*Mpr) +
-21636 * Math.cos(4*Dr - 2*Mpr) +
24208 * E * Math.cos(2*Dr + Mr - Mpr) +
30824 * E * Math.cos(2*Dr + Mr) +
-8379 * Math.cos(Dr - Mpr) +
-16675 * E * Math.cos(Dr + Mr) +
-12831 * E * Math.cos(2*Dr - Mr + Mpr) +
-10445 * Math.cos(2*Dr + 2*Mpr) +
-11650 * Math.cos(4*Dr) +
14403 * Math.cos(2*Dr - 3*Mpr) +
-7003 * E * Math.cos(Mr - 2*Mpr) +
10056 * E * Math.cos(2*Dr - Mr - 2*Mpr) +
6322 * Math.cos(Dr + Mpr) +
-9884 * E * E * Math.cos(2*Dr - 2*Mr);

const distance = 385000.56 + dR / 1000; // km

return { moonLon, distance, Lp, Mp, D };
}

// ─── Synodic age ──────────────────────────────────────────────────────────────
function moonAge(jd) {
const T = jc(jd);
const { lon: sLon } = sunLongitude(T);
const { moonLon, distance } = moonPosition(T);
let elongation = moonLon - sLon;
if (elongation < 0) elongation += 360;
const synodicMonth = 29.530588861;
const age = (elongation / 360) * synodicMonth;
const illumination = (1 - Math.cos(elongation * DEG)) / 2;
return { age, elongation, illumination, moonLon, sunLon: sLon, distance, synodicMonth };
}

// ─── Moon phase name ──────────────────────────────────────────────────────────
function phaseName(age) {
const s = age;
if (s < 1.85) return “🌑 New Moon”;
if (s < 7.38) return “🌒 Waxing Crescent”;
if (s < 9.22) return “🌓 First Quarter”;
if (s < 14.77) return “🌔 Waxing Gibbous”;
if (s < 16.61) return “🌕 Full Moon”;
if (s < 22.15) return “🌖 Waning Gibbous”;
if (s < 23.99) return “🌗 Last Quarter”;
if (s < 29.53) return “🌘 Waning Crescent”;
return “🌑 New Moon”;
}

// ─── Compute daily angular velocity over one synodic month ───────────────────
function computeVelocityData(jd) {
const points = [];
for (let i = 0; i <= 60; i++) {
const d = jd - 29.5 + i * 0.5;
const T = jc(d);
const T1 = jc(d + 0.5);
const { moonLon: m0, distance: dist } = moonPosition(T);
const { moonLon: m1 } = moonPosition(T1);
let dLon = m1 - m0;
if (dLon < 0) dLon += 360;
const { age, illumination } = moonAge(d);
points.push({
day: i * 0.5 - 29.5,
dLon: dLon * 2, // per day
age,
illumination,
dist
});
}
return points;
}

// ─── Timezone list (abbreviated) ─────────────────────────────────────────────
const TIMEZONES = [
“UTC”, “America/New_York”, “America/Chicago”, “America/Denver”,
“America/Los_Angeles”, “America/Anchorage”, “America/Honolulu”,
“Europe/London”, “Europe/Paris”, “Europe/Berlin”, “Europe/Moscow”,
“Asia/Dubai”, “Asia/Kolkata”, “Asia/Bangkok”, “Asia/Singapore”,
“Asia/Tokyo”, “Asia/Seoul”, “Asia/Shanghai”, “Australia/Sydney”,
“Pacific/Auckland”, “America/Sao_Paulo”, “America/Mexico_City”,
“Africa/Cairo”, “Africa/Nairobi”
];

// ─── SVG Moon Phase Renderer ──────────────────────────────────────────────────
function MoonSVG({ age, size = 120 }) {
const r = size / 2;
const illumination = (1 - Math.cos((age / 29.530588861) * 2 * Math.PI)) / 2;
const waxing = age < 14.765;

// Terminator x position relative to center
const termX = r * Math.cos((age / 29.530588861) * 2 * Math.PI);
const isNew = age < 1 || age > 28.5;
const isFull = age > 13.5 && age < 16;

return (
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
<defs>
<radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
<stop offset="0%" stopColor="#f8f0d0" stopOpacity="0.15" />
<stop offset="100%" stopColor="#f8f0d0" stopOpacity="0" />
</radialGradient>
<filter id="glow">
<feGaussianBlur stdDeviation="3" result="coloredBlur" />
<feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
</filter>
<clipPath id="moonClip">
<circle cx={r} cy={r} r={r - 2} />
</clipPath>
</defs>
{/* Outer glow */}
{!isNew && (
<circle cx={r} cy={r} r={r + 8} fill=“url(#moonGlow)” opacity={illumination * 0.8} />
)}
{/* Dark moon base */}
<circle cx={r} cy={r} r={r - 2} fill=”#1a1a2e” stroke=”#334” strokeWidth=“1” />
{/* Lit portion */}
<g clipPath="url(#moonClip)">
{/* Full bright half */}
<rect
x={waxing ? r : 0}
y={0}
width={r}
height={size}
fill=”#d4c9a0”
opacity={isNew ? 0 : 1}
/>
{/* Terminator ellipse */}
<ellipse
cx={r}
cy={r}
rx={Math.abs(termX)}
ry={r - 2}
fill={waxing
? (termX > 0 ? “#1a1a2e” : “#d4c9a0”)
: (termX > 0 ? “#d4c9a0” : “#1a1a2e”)}
opacity={isNew ? 0 : 1}
/>
{/* Surface texture on lit side */}
{!isNew && (
<>
<circle cx={r * 0.8} cy={r * 0.7} r={r * 0.07} fill=”#b8a87a” opacity=“0.4” />
<circle cx={r * 1.1} cy={r * 1.2} r={r * 0.05} fill=”#b8a87a” opacity=“0.35” />
<circle cx={r * 0.9} cy={r * 1.4} r={r * 0.04} fill=”#b8a87a” opacity=“0.3” />
<circle cx={r * 1.25} cy={r * 0.85} r={r * 0.06} fill=”#b8a87a” opacity=“0.3” />
</>
)}
</g>
{/* Rim */}
<circle cx={r} cy={r} r={r - 2} fill=“none”
stroke={isFull ? “#f0e8c0” : “#3a3a5a”}
strokeWidth={isFull ? “1.5” : “0.5”}
filter={isFull ? “url(#glow)” : undefined}
/>
</svg>
);
}

// ─── Sparkline Canvas ─────────────────────────────────────────────────────────
function VelocityChart({ data, currentAge }) {
const canvasRef = useRef(null);

useEffect(() => {
const c = canvasRef.current;
if (!c || !data.length) return;
const ctx = c.getContext(“2d”);
const W = c.width, H = c.height;
const pad = { top: 28, right: 20, bottom: 42, left: 48 };
const cW = W - pad.left - pad.right;
const cH = H - pad.top - pad.bottom;

```
ctx.clearRect(0, 0, W, H);

const velocities = data.map(d => d.dLon);
const minV = Math.min(...velocities) - 0.1;
const maxV = Math.max(...velocities) + 0.1;
const ages = data.map(d => d.age);
const minA = 0, maxA = 29.53;

const xScale = v => pad.left + ((v - minA) / (maxA - minA)) * cW;
const yScale = v => pad.top + cH - ((v - minV) / (maxV - minV)) * cH;

// Background
ctx.fillStyle = "#0a0a14";
ctx.fillRect(0, 0, W, H);

// Grid lines
ctx.strokeStyle = "#1e1e3a";
ctx.lineWidth = 1;
for (let i = 0; i <= 5; i++) {
  const y = pad.top + (i / 5) * cH;
  ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
}
// Phase markers
const phases = [0, 7.38, 14.77, 22.15, 29.53];
const phaseLabels = ["🌑", "🌓", "🌕", "🌗", "🌑"];
ctx.strokeStyle = "#2a2a48";
ctx.lineWidth = 1;
ctx.setLineDash([3, 4]);
phases.forEach((p, i) => {
  const x = xScale(p);
  ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top + cH); ctx.stroke();
  ctx.fillStyle = "#4a4a7a";
  ctx.font = "11px serif";
  ctx.textAlign = "center";
  ctx.fillText(phaseLabels[i], x, pad.top - 8);
});
ctx.setLineDash([]);

// Average velocity line
const avgV = velocities.reduce((a, b) => a + b, 0) / velocities.length;
ctx.strokeStyle = "#3a3a6a";
ctx.lineWidth = 1;
ctx.setLineDash([5, 5]);
ctx.beginPath();
ctx.moveTo(pad.left, yScale(avgV));
ctx.lineTo(pad.left + cW, yScale(avgV));
ctx.stroke();
ctx.setLineDash([]);
ctx.fillStyle = "#4a4a8a";
ctx.font = "9px monospace";
ctx.textAlign = "left";
ctx.fillText(`avg ${avgV.toFixed(2)}°/d`, pad.left + 4, yScale(avgV) - 4);

// Gradient fill under curve
const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
grad.addColorStop(0, "rgba(180, 160, 100, 0.25)");
grad.addColorStop(1, "rgba(180, 160, 100, 0.02)");
ctx.beginPath();
ctx.moveTo(xScale(ages[0]), yScale(velocities[0]));
data.forEach((d, i) => ctx.lineTo(xScale(d.age), yScale(d.dLon)));
ctx.lineTo(xScale(ages[ages.length - 1]), yScale(minV));
ctx.lineTo(xScale(ages[0]), yScale(minV));
ctx.closePath();
ctx.fillStyle = grad;
ctx.fill();

// Main velocity curve
ctx.beginPath();
ctx.strokeStyle = "#c8b870";
ctx.lineWidth = 2;
data.forEach((d, i) => {
  if (i === 0) ctx.moveTo(xScale(d.age), yScale(d.dLon));
  else ctx.lineTo(xScale(d.age), yScale(d.dLon));
});
ctx.stroke();

// Current position marker
if (currentAge !== null) {
  const cx = xScale(currentAge);
  // find closest velocity
  const closest = data.reduce((best, d) =>
    Math.abs(d.age - currentAge) < Math.abs(best.age - currentAge) ? d : best
  );
  const cy = yScale(closest.dLon);
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#f0d060";
  ctx.fill();
  ctx.strokeStyle = "#fff8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Crosshair
  ctx.strokeStyle = "#f0d06066";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, pad.top); ctx.lineTo(cx, pad.top + cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, cy); ctx.lineTo(pad.left + cW, cy); ctx.stroke();
  ctx.setLineDash([]);
}

// Axes
ctx.strokeStyle = "#3a3a6a";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH);
ctx.lineTo(pad.left + cW, pad.top + cH);
ctx.stroke();

// Y-axis labels
ctx.fillStyle = "#7a7aaa";
ctx.font = "10px monospace";
ctx.textAlign = "right";
for (let i = 0; i <= 4; i++) {
  const v = minV + (i / 4) * (maxV - minV);
  ctx.fillText(v.toFixed(2), pad.left - 5, yScale(v) + 4);
}

// X-axis labels
ctx.textAlign = "center";
[0, 7, 14, 22, 29.5].forEach(d => {
  ctx.fillText(`${d.toFixed(0)}d`, xScale(d), pad.top + cH + 16);
});

// Axis titles
ctx.save();
ctx.translate(12, pad.top + cH / 2);
ctx.rotate(-Math.PI / 2);
ctx.fillStyle = "#5a5a9a";
ctx.font = "10px monospace";
ctx.textAlign = "center";
ctx.fillText("°/day (Moon lon. velocity)", 0, 0);
ctx.restore();

ctx.fillStyle = "#5a5a9a";
ctx.font = "10px monospace";
ctx.textAlign = "center";
ctx.fillText("Synodic Age (days)", pad.left + cW / 2, H - 6);
```

}, [data, currentAge]);

return <canvas ref={canvasRef} width={680} height={260}
style={{ width: “100%”, height: “auto”, borderRadius: “8px” }} />;
}

// ─── Distance Chart ───────────────────────────────────────────────────────────
function DistanceChart({ data, currentAge }) {
const canvasRef = useRef(null);

useEffect(() => {
const c = canvasRef.current;
if (!c || !data.length) return;
const ctx = c.getContext(“2d”);
const W = c.width, H = c.height;
const pad = { top: 18, right: 20, bottom: 36, left: 72 };
const cW = W - pad.left - pad.right;
const cH = H - pad.top - pad.bottom;

```
ctx.clearRect(0, 0, W, H);
ctx.fillStyle = "#0a0a14";
ctx.fillRect(0, 0, W, H);

const distances = data.map(d => d.dist);
const minD = Math.min(...distances) - 500;
const maxD = Math.max(...distances) + 500;
const ages = data.map(d => d.age);
const xScale = v => pad.left + ((v - 0) / 29.53) * cW;
const yScale = v => pad.top + cH - ((v - minD) / (maxD - minD)) * cH;

// Grid
ctx.strokeStyle = "#1e1e3a";
ctx.lineWidth = 1;
for (let i = 0; i <= 4; i++) {
  const y = pad.top + (i / 4) * cH;
  ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
}

// Perigee / Apogee labels
const minDist = Math.min(...distances);
const maxDist = Math.max(...distances);
const perigeeIdx = distances.indexOf(minDist);
const apogeeIdx = distances.indexOf(maxDist);

// Gradient fill
const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
grad.addColorStop(0, "rgba(100, 160, 220, 0.2)");
grad.addColorStop(1, "rgba(100, 160, 220, 0.02)");
ctx.beginPath();
ctx.moveTo(xScale(ages[0]), yScale(distances[0]));
data.forEach(d => ctx.lineTo(xScale(d.age), yScale(d.dist)));
ctx.lineTo(xScale(ages[ages.length - 1]), yScale(minD));
ctx.lineTo(xScale(ages[0]), yScale(minD));
ctx.closePath();
ctx.fillStyle = grad;
ctx.fill();

// Distance curve
ctx.beginPath();
ctx.strokeStyle = "#6ab0dc";
ctx.lineWidth = 2;
data.forEach((d, i) => {
  if (i === 0) ctx.moveTo(xScale(d.age), yScale(d.dist));
  else ctx.lineTo(xScale(d.age), yScale(d.dist));
});
ctx.stroke();

// Perigee marker
const px = xScale(ages[perigeeIdx]), py = yScale(minDist);
ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2);
ctx.fillStyle = "#ff8060"; ctx.fill();
ctx.fillStyle = "#ff8060"; ctx.font = "9px monospace"; ctx.textAlign = "center";
ctx.fillText(`perigee`, px, py - 10);
ctx.fillText(`${Math.round(minDist).toLocaleString()} km`, px, py - 20);

// Apogee marker
const ax = xScale(ages[apogeeIdx]), ay = yScale(maxDist);
ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2);
ctx.fillStyle = "#80c8ff"; ctx.fill();
ctx.fillStyle = "#80c8ff"; ctx.font = "9px monospace"; ctx.textAlign = "center";
ctx.fillText(`apogee`, ax, ay - 10);
ctx.fillText(`${Math.round(maxDist).toLocaleString()} km`, ax, ay - 20);

// Current position
if (currentAge !== null) {
  const cx = xScale(currentAge);
  const closest = data.reduce((best, d) =>
    Math.abs(d.age - currentAge) < Math.abs(best.age - currentAge) ? d : best
  );
  const cy = yScale(closest.dist);
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#f0d060"; ctx.fill();
  ctx.strokeStyle = "#fff8"; ctx.lineWidth = 1.5; ctx.stroke();
}

// Axes
ctx.strokeStyle = "#3a3a6a"; ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + cH);
ctx.lineTo(pad.left + cW, pad.top + cH); ctx.stroke();

// Y labels
ctx.fillStyle = "#7a7aaa"; ctx.font = "10px monospace"; ctx.textAlign = "right";
for (let i = 0; i <= 4; i++) {
  const v = minD + (i / 4) * (maxD - minD);
  ctx.fillText(`${Math.round(v / 1000)}k`, pad.left - 5, yScale(v) + 4);
}

// X labels
ctx.textAlign = "center";
[0, 7, 14, 22, 29.5].forEach(d => {
  ctx.fillText(`${d.toFixed(0)}d`, xScale(d), pad.top + cH + 16);
});

ctx.save();
ctx.translate(12, pad.top + cH / 2);
ctx.rotate(-Math.PI / 2);
ctx.fillStyle = "#5a5a9a"; ctx.font = "10px monospace"; ctx.textAlign = "center";
ctx.fillText("Distance (km)", 0, 0);
ctx.restore();
```

}, [data, currentAge]);

return <canvas ref={canvasRef} width={680} height={200}
style={{ width: “100%”, height: “auto”, borderRadius: “8px” }} />;
}

// ─── Zodiac wheel ─────────────────────────────────────────────────────────────
function ZodiacWheel({ moonLon, sunLon }) {
const signs = [“♈”, “♉”, “♊”, “♋”, “♌”, “♍”, “♎”, “♏”, “♐”, “♑”, “♒”, “♓”];
const signNames = [“Aries”,“Taurus”,“Gemini”,“Cancer”,“Leo”,“Virgo”,“Libra”,“Scorpio”,“Sagittarius”,“Capricorn”,“Aquarius”,“Pisces”];
const size = 240, cx = size / 2, cy = size / 2;
const outerR = 108, innerR = 80, labelR = 92;

const toXY = (lon, r) => {
const a = (lon - 90) * DEG;
return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const moonPos = toXY(moonLon, 65);
const sunPos = toXY(sunLon, 65);

return (
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
<defs>
<radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
<stop offset="0%" stopColor="#12122a" />
<stop offset="100%" stopColor="#070714" />
</radialGradient>
</defs>
<circle cx={cx} cy={cy} r={outerR + 4} fill=“url(#wheelBg)” stroke=”#2a2a50” strokeWidth=“1” />
{signs.map((s, i) => {
const startLon = i * 30;
const endLon = startLon + 30;
const midLon = startLon + 15;
const s1 = toXY(startLon, outerR);
const s2 = toXY(endLon, outerR);
const i1 = toXY(startLon, innerR);
const labelP = toXY(midLon, labelR);
const isLitSign = Math.floor(moonLon / 30) === i;

```
    return (
      <g key={i}>
        <line x1={s1.x} y1={s1.y} x2={i1.x} y2={i1.y}
          stroke={isLitSign ? "#5a5a9a" : "#2a2a4a"} strokeWidth="0.7" />
        <text x={labelP.x} y={labelP.y + 4} textAnchor="middle"
          fontSize="13" fill={isLitSign ? "#d0c8f0" : "#5a5a88"}>
          {s}
        </text>
      </g>
    );
  })}
  {/* Inner ring */}
  <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#2a2a50" strokeWidth="0.8" />
  <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#1e1e3a" strokeWidth="0.5" />
  <circle cx={cx} cy={cy} r={50} fill="none" stroke="#1e1e3a" strokeWidth="0.5" />
  {/* Earth at center */}
  <circle cx={cx} cy={cy} r={6} fill="#3a6aaa" />
  <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill="#5a8acc">Earth</text>
  {/* Sun */}
  <circle cx={sunPos.x} cy={sunPos.y} r={8} fill="#f0c030" opacity="0.9" />
  <text x={sunPos.x} y={sunPos.y + 4} textAnchor="middle" fontSize="10" fill="#1a1a2e">☀</text>
  {/* Moon */}
  <circle cx={moonPos.x} cy={moonPos.y} r={7} fill="#c8c0a0" opacity="0.9" />
  <text x={moonPos.x} y={moonPos.y + 4} textAnchor="middle" fontSize="10" fill="#1a1a2e">☽</text>
  {/* Elongation arc */}
  {(() => {
    let elong = moonLon - sunLon;
    if (elong < 0) elong += 360;
    const sAngle = (sunLon - 90) * DEG;
    const eAngle = (moonLon - 90) * DEG;
    const r = 58;
    const laf = elong > 180 ? 1 : 0;
    const sx = cx + r * Math.cos(sAngle), sy = cy + r * Math.sin(sAngle);
    const ex = cx + r * Math.cos(eAngle), ey = cy + r * Math.sin(eAngle);
    return (
      <>
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${laf} 1 ${ex} ${ey}`}
          fill="none" stroke="#c8b870" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.6" />
      </>
    );
  })()}
  {/* Sign label for moon */}
  <text x={cx} y={cy - 70} textAnchor="middle" fontSize="9" fill="#8a8ab8">
    Moon in {signNames[Math.floor(moonLon / 30)]}
  </text>
</svg>
```

);
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MoonCalculator() {
const today = new Date();
const [dateStr, setDateStr] = useState(today.toISOString().slice(0, 10));
const [timeStr, setTimeStr] = useState(“12:00”);
const [tz, setTz] = useState(“UTC”);
const [result, setResult] = useState(null);
const [velData, setVelData] = useState([]);
const [showTzSearch, setShowTzSearch] = useState(false);
const [tzQuery, setTzQuery] = useState(””);

const calculate = useCallback(() => {
try {
const [year, month, day] = dateStr.split(”-”).map(Number);
const [hour, minute] = timeStr.split(”:”).map(Number);
// Approximate TZ offset from name (simple lookup)
const tzOffsets = {
“UTC”: 0, “America/New_York”: -5, “America/Chicago”: -6,
“America/Denver”: -7, “America/Los_Angeles”: -8,
“America/Anchorage”: -9, “America/Honolulu”: -10,
“Europe/London”: 0, “Europe/Paris”: 1, “Europe/Berlin”: 1,
“Europe/Moscow”: 3, “Asia/Dubai”: 4, “Asia/Kolkata”: 5.5,
“Asia/Bangkok”: 7, “Asia/Singapore”: 8, “Asia/Tokyo”: 9,
“Asia/Seoul”: 9, “Asia/Shanghai”: 8, “Australia/Sydney”: 10,
“Pacific/Auckland”: 12, “America/Sao_Paulo”: -3,
“America/Mexico_City”: -6, “Africa/Cairo”: 2, “Africa/Nairobi”: 3
};
const offset = tzOffsets[tz] ?? 0;
const utcHour = hour - offset;
const jd = julianDay(year, month, day, utcHour + minute / 60);
const r = moonAge(jd);
r.phase = phaseName(r.age);
r.jd = jd;
setResult(r);
setVelData(computeVelocityData(jd));
} catch (e) {
console.error(e);
}
}, [dateStr, timeStr, tz]);

useEffect(() => { calculate(); }, []);

const filteredTz = TIMEZONES.filter(t =>
t.toLowerCase().includes(tzQuery.toLowerCase())
);

const statRow = (label, value, unit = “”, accent = false) => (
<div style={{
display: “flex”, justifyContent: “space-between”, alignItems: “baseline”,
padding: “8px 0”, borderBottom: “1px solid #1a1a2e”
}}>
<span style={{ color: “#5a5a8a”, fontSize: “12px”, letterSpacing: “0.08em”, textTransform: “uppercase” }}>
{label}
</span>
<span style={{ color: accent ? “#f0d060” : “#c8c0f0”, fontSize: “15px”, fontFamily: “monospace”, fontWeight: “600” }}>
{value}<span style={{ fontSize: “11px”, color: “#7a7aaa”, marginLeft: “3px” }}>{unit}</span>
</span>
</div>
);

return (
<div style={{
minHeight: “100vh”, background: “#05050f”,
color: “#c8c0f0”, fontFamily: “‘Georgia’, ‘Times New Roman’, serif”,
padding: “0 0 60px 0”
}}>
{/* Header */}
<div style={{
background: “linear-gradient(180deg, #0a0a1e 0%, #05050f 100%)”,
borderBottom: “1px solid #1a1a3a”,
padding: “32px 24px 24px”,
textAlign: “center”
}}>
<div style={{ fontSize: “11px”, letterSpacing: “0.3em”, color: “#4a4a7a”, textTransform: “uppercase”, marginBottom: “8px” }}>
Astronomical Calculator
</div>
<h1 style={{
margin: 0, fontSize: “clamp(24px, 5vw, 40px)”,
fontWeight: “normal”, letterSpacing: “0.05em”,
background: “linear-gradient(135deg, #d4c9a0, #f0e8c0, #c8b870)”,
WebkitBackgroundClip: “text”, WebkitTextFillColor: “transparent”
}}>
☽ Lunar Position & Synodic Age
</h1>
<p style={{ color: “#4a4a7a”, fontSize: “13px”, marginTop: “8px”, fontStyle: “italic” }}>
Non-linear motion from gravitational perturbations · Meeus planetary theory
</p>
</div>

```
  <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px" }}>

    {/* Input Card */}
    <div style={{
      background: "#0d0d20", border: "1px solid #2a2a4a", borderRadius: "12px",
      padding: "20px", marginBottom: "24px"
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <label style={{ fontSize: "11px", color: "#5a5a8a", letterSpacing: "0.1em", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
            Date
          </label>
          <input
            type="date"
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px",
              background: "#12122a", border: "1px solid #2a2a50",
              borderRadius: "6px", color: "#c8c0f0",
              fontSize: "15px", outline: "none", boxSizing: "border-box"
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: "11px", color: "#5a5a8a", letterSpacing: "0.1em", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
            Time
          </label>
          <input
            type="time"
            value={timeStr}
            onChange={e => setTimeStr(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px",
              background: "#12122a", border: "1px solid #2a2a50",
              borderRadius: "6px", color: "#c8c0f0",
              fontSize: "15px", outline: "none", boxSizing: "border-box"
            }}
          />
        </div>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "11px", color: "#5a5a8a", letterSpacing: "0.1em", display: "block", marginBottom: "6px", textTransform: "uppercase" }}>
          Timezone
        </label>
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setShowTzSearch(!showTzSearch)}
            style={{
              padding: "10px 12px", background: "#12122a",
              border: "1px solid #2a2a50", borderRadius: "6px",
              cursor: "pointer", color: "#c8c0f0", fontSize: "14px",
              display: "flex", justifyContent: "space-between"
            }}
          >
            <span>{tz}</span>
            <span style={{ color: "#5a5a8a" }}>▾</span>
          </div>
          {showTzSearch && (
            <div style={{
              position: "absolute", zIndex: 100, top: "100%", left: 0, right: 0,
              background: "#12122a", border: "1px solid #2a2a50",
              borderRadius: "6px", marginTop: "4px", maxHeight: "220px",
              overflow: "hidden", display: "flex", flexDirection: "column"
            }}>
              <input
                autoFocus
                placeholder="Search timezone..."
                value={tzQuery}
                onChange={e => setTzQuery(e.target.value)}
                style={{
                  padding: "8px 12px", background: "#0a0a1e", border: "none",
                  borderBottom: "1px solid #2a2a4a", color: "#c8c0f0",
                  fontSize: "13px", outline: "none"
                }}
              />
              <div style={{ overflowY: "auto", maxHeight: "175px" }}>
                {filteredTz.map(t => (
                  <div key={t}
                    onClick={() => { setTz(t); setShowTzSearch(false); setTzQuery(""); }}
                    style={{
                      padding: "9px 14px", cursor: "pointer",
                      color: t === tz ? "#f0d060" : "#a0a0d0",
                      background: t === tz ? "#1a1a3a" : "transparent",
                      fontSize: "13px",
                      transition: "background 0.1s"
                    }}
                    onMouseEnter={e => e.target.style.background = "#1a1a2e"}
                    onMouseLeave={e => e.target.style.background = t === tz ? "#1a1a3a" : "transparent"}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={calculate}
        style={{
          width: "100%", padding: "12px",
          background: "linear-gradient(135deg, #2a2a5a, #3a3a7a)",
          border: "1px solid #4a4a9a", borderRadius: "8px",
          color: "#c8c8f8", fontSize: "14px", letterSpacing: "0.15em",
          textTransform: "uppercase", cursor: "pointer",
          fontFamily: "monospace", transition: "all 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(135deg, #3a3a6a, #4a4a8a)"}
        onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(135deg, #2a2a5a, #3a3a7a)"}
      >
        ✦ Calculate
      </button>
    </div>

    {result && (
      <>
        {/* Moon display + stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "auto 1fr",
          gap: "20px", marginBottom: "24px",
          background: "#0d0d20", border: "1px solid #2a2a4a", borderRadius: "12px",
          padding: "20px", alignItems: "start"
        }}>
          <div style={{ textAlign: "center" }}>
            <MoonSVG age={result.age} size={140} />
            <div style={{
              marginTop: "8px", fontSize: "15px",
              color: "#d4c9a0", fontStyle: "italic"
            }}>
              {result.phase}
            </div>
          </div>
          <div>
            {statRow("Synodic Age", result.age.toFixed(3), "days", true)}
            {statRow("Illumination", (result.illumination * 100).toFixed(1), "%")}
            {statRow("Elongation", result.elongation.toFixed(2), "°")}
            {statRow("Moon Longitude", result.moonLon.toFixed(3), "°")}
            {statRow("Sun Longitude", result.sunLon.toFixed(3), "°")}
            {statRow("Earth–Moon Dist", Math.round(result.distance).toLocaleString(), "km")}
            {statRow("Julian Day", result.jd.toFixed(5), "")}
            {statRow("Mean Synodic Month", "29.53059", "days")}
          </div>
        </div>

        {/* Zodiac wheel */}
        <div style={{
          background: "#0d0d20", border: "1px solid #2a2a4a", borderRadius: "12px",
          padding: "20px", marginBottom: "24px",
          display: "flex", flexDirection: "column", alignItems: "center"
        }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#5a5a8a", textTransform: "uppercase", marginBottom: "12px" }}>
            Ecliptic View — Moon & Sun Positions
          </div>
          <ZodiacWheel moonLon={result.moonLon} sunLon={result.sunLon} />
          <div style={{ fontSize: "12px", color: "#4a4a7a", marginTop: "8px", fontStyle: "italic" }}>
            ☽ Moon (grey) · ☀ Sun (gold) · dashed arc = elongation
          </div>
        </div>

        {/* Velocity chart */}
        <div style={{
          background: "#0d0d20", border: "1px solid #2a2a4a", borderRadius: "12px",
          padding: "20px", marginBottom: "20px"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#5a5a8a", textTransform: "uppercase" }}>
              Lunar Angular Velocity · Non-Linear Motion
            </div>
            <div style={{ fontSize: "12px", color: "#4a4a7a", marginTop: "4px", fontStyle: "italic" }}>
              Moon moves faster near perigee (closer to Earth) due to gravity — Kepler's 2nd law. Solar gravity adds further perturbations.
            </div>
          </div>
          <VelocityChart data={velData} currentAge={result.age} />
        </div>

        {/* Distance chart */}
        <div style={{
          background: "#0d0d20", border: "1px solid #2a2a4a", borderRadius: "12px",
          padding: "20px", marginBottom: "20px"
        }}>
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.2em", color: "#5a5a8a", textTransform: "uppercase" }}>
              Earth–Moon Distance over Synodic Cycle
            </div>
            <div style={{ fontSize: "12px", color: "#4a4a7a", marginTop: "4px", fontStyle: "italic" }}>
              The elliptical orbit shifts phase relative to the synodic cycle, causing each month to differ in apparent size and velocity.
            </div>
          </div>
          <DistanceChart data={velData} currentAge={result.age} />
        </div>

        {/* Physics note */}
        <div style={{
          background: "#0a0a1a", border: "1px solid #1e1e38", borderRadius: "10px",
          padding: "16px 18px", fontSize: "12px", color: "#4a4a72", lineHeight: "1.7",
          fontStyle: "italic"
        }}>
          <strong style={{ color: "#6a6a9a", fontStyle: "normal" }}>Why non-linear?</strong><br/>
          The Moon's synodic month averages 29.530 days, but the instantaneous angular velocity varies ±12% because:
          (1) the Moon's elliptical orbit around Earth (eccentricity ≈ 0.055) — it moves 12–15°/day;
          (2) the Sun's gravitational perturbation shifts the orbital ellipse orientation;
          (3) Earth's own elliptical orbit changes how quickly the Sun appears to move, altering the elongation rate.
          Calculations use the Meeus Ch. 47 lunar theory with 60+ perturbation terms.
        </div>
      </>
    )}
  </div>
</div>
```

);
}
