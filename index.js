// --- ELEMENTE UI ---
const butonMeniu = document.getElementById('buton');
const selectMeniu = document.getElementById('select');
const titluAfisare = document.getElementById('afisare');
const harta = document.getElementById("map");
const nrOraseAfisaj = document.getElementById("nr_orase");
const consola = document.querySelector(".consola_afisare");
const vitezaSlider = document.getElementById("viteza");
const valoareViteza = document.getElementById("valoare-viteza");
const canvas = document.getElementById("tspCanvas");
const ctx = canvas.getContext("2d");

// --- STARE APLICAȚIE ---
let count = 0;
let orase = [];
let celMaiScurtDrum = [];
let distantaMinima = Infinity;
let isRunning = false;
let memo = new Map();
let celMaiBunScorGlobal = Infinity; 

function ajustareCanvas() {
    canvas.width = harta.clientWidth;
    canvas.height = harta.clientHeight;
}
window.addEventListener('load', ajustareCanvas);
window.addEventListener('resize', ajustareCanvas);

// --- LOGICĂ INTERFAȚĂ ---
butonMeniu.onclick = (e) => {
    e.stopPropagation();
    selectMeniu.style.display = (selectMeniu.style.display === "block") ? "none" : "block";
};
window.onclick = () => selectMeniu.style.display = "none";
selectMeniu.onclick = (e) => {
    if (e.target.tagName === 'P') { titluAfisare.innerText = e.target.innerText; }
};
vitezaSlider.oninput = function() { valoareViteza.innerText = this.value + "%"; };

harta.onclick = function(event) {
    if (isRunning) return;
    if (event.target !== harta && event.target !== canvas) return;
    count++;
    nrOraseAfisaj.innerText = count;
    const rect = harta.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const bulina = document.createElement("div");
    bulina.className = "bulina";
    bulina.innerText = count;
    bulina.style.left = x + "px";
    bulina.style.top = y + "px";
    harta.appendChild(bulina);
    orase.push({ id: count, x, y });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function calculeazaDistanta(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
function curataCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); }
function deseneazaDrum(drum, culoare, grosime, inchide = false) {
    if (drum.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = culoare;
    ctx.lineWidth = grosime;
    ctx.moveTo(drum[0].x, drum[0].y);
    for (let i = 1; i < drum.length; i++) ctx.lineTo(drum[i].x, drum[i].y);
    if (inchide) ctx.lineTo(drum[0].x, drum[0].y);
    ctx.stroke();
}

// --- 1. GREEDY ---
async function Greedy() {
    let drum = [orase[0]];
    let vizitate = new Array(orase.length).fill(false);
    vizitate[0] = true;
    let distTotala = 0;

    while (drum.length < orase.length) {
        let curent = drum[drum.length - 1];
        let minim = Infinity;
        let ales = -1;
        for (let i = 0; i < orase.length; i++) {
            if (!vizitate[i]) {
                let d = calculeazaDistanta(curent, orase[i]);
                consola.innerHTML = `<div>Verific: ${curent.id} → ${orase[i].id} (${d.toFixed(0)} px)</div>` + consola.innerHTML;
                if (d < minim) { minim = d; ales = i; }
            }
        }
        distTotala += minim;
        vizitate[ales] = true;
        drum.push(orase[ales]);
        consola.innerHTML = `<div style="color: #4caf50;">✅ Salvat: Cel mai apropiat de ${curent.id} este ${orase[ales].id}</div>` + consola.innerHTML;
        curataCanvas();
        deseneazaDrum(drum, "#ff4444", 2);
        await sleep((101 - vitezaSlider.value) * 10);
    }
    distTotala += calculeazaDistanta(drum[drum.length - 1], drum[0]);
    celMaiScurtDrum = drum;
    distantaMinima = distTotala;
}

// --- 2. BACKTRACKING ---
async function TSP_Backtracking(drumCurent, vizitate, distantaAcumulata) {
    curataCanvas();
    deseneazaDrum(drumCurent, "#ff4444", 2);
    await sleep((101 - vitezaSlider.value) * 2);
    consola.innerHTML = `<div>Verific: ${drumCurent.map(o => o.id).join(" → ")} (${distantaAcumulata.toFixed(0)} px)</div>` + consola.innerHTML;

    if (drumCurent.length === orase.length) {
        let total = distantaAcumulata + calculeazaDistanta(drumCurent[drumCurent.length - 1], drumCurent[0]);
        if (total < distantaMinima) {
            distantaMinima = total;
            celMaiScurtDrum = [...drumCurent];
            consola.innerHTML = `<div style="color: #4caf50; font-weight: bold;">✅ Salvat: Nou optim gasit (${total.toFixed(0)} px)</div>` + consola.innerHTML;
        }
        return;
    }

    for (let i = 0; i < orase.length; i++) {
        if (!vizitate[i]) {
            vizitate[i] = true;
            let d = calculeazaDistanta(drumCurent[drumCurent.length - 1], orase[i]);
            drumCurent.push(orase[i]);
            await TSP_Backtracking(drumCurent, vizitate, distantaAcumulata + d);
            drumCurent.pop();
            vizitate[i] = false;
        }
    }
}

// --- 3. DINAMIC ---
async function TSP_Dinamic() {
    memo.clear();
    const n = orase.length;
    const allVisited = (1 << n) - 1;
    async function rezolva(mask, curent) {
        let cheie = `${mask}-${curent}`;
        if (memo.has(cheie)) {
            consola.innerHTML = `<div style="color: #00d4ff;">💡 Folosesc: Optim din ${orase[curent].id} (salvat)</div>` + consola.innerHTML;
            return memo.get(cheie).dist;
        }
        if (mask === allVisited) return calculeazaDistanta(orase[curent], orase[0]);
        let min = Infinity;
        let urmatorAles = -1;
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i))) {
                let d = calculeazaDistanta(orase[curent], orase[i]);
                consola.innerHTML = `<div>Verific: ${orase[curent].id} → ${orase[i].id}</div>` + consola.innerHTML;
                await sleep((101 - vitezaSlider.value));
                let rez = d + await rezolva(mask | (1 << i), i);
                if (rez < min) { min = rez; urmatorAles = i; }
            }
        }
        memo.set(cheie, { dist: min, next: urmatorAles });
        consola.innerHTML = `<div style="color: #4caf50;">✅ Salvat: Optim din ${orase[curent].id} prin ${orase[urmatorAles]?.id || 'START'}</div>` + consola.innerHTML;
        return min;
    }
    distantaMinima = await rezolva(1, 0);
    let m = 1, c = 0;
    celMaiScurtDrum = [orase[0]];
    while (m !== allVisited) {
        let stare = memo.get(`${m}-${c}`);
        if(!stare) break;
        c = stare.next;
        m |= (1 << c);
        celMaiScurtDrum.push(orase[c]);
    }
}

// --- 4. BRANCH AND BOUND ---
async function ruleazaBranchAndBound() {
    const n = orase.length;
    const allVisited = (1 << n) - 1;
    celMaiBunScorGlobal = Infinity;
    async function calculeazaBB(mask, curent, dist, path) {
        consola.innerHTML = `<div>Verific: ${path.map(o => o.id).join(" → ")} (${dist.toFixed(0)} px)</div>` + consola.innerHTML;
        curataCanvas();
        deseneazaDrum(path, "#ff4444", 2);
        await sleep((101 - vitezaSlider.value) * 2);

        if (dist >= celMaiBunScorGlobal) {
            consola.innerHTML = `<div style="color: #ff5252;">Abandonat: ${dist.toFixed(0)} px depaseste limita (${celMaiBunScorGlobal.toFixed(0)} px)</div>` + consola.innerHTML;
            return;
        }
        if (mask === allVisited) {
            let total = dist + calculeazaDistanta(orase[curent], orase[0]);
            if (total < celMaiBunScorGlobal) {
                celMaiBunScorGlobal = total;
                celMaiScurtDrum = [...path];
                consola.innerHTML = `<div style="color: #ffeb3b; font-weight: bold;">✅ SALVAT: Nou record global = ${total.toFixed(0)} px</div>` + consola.innerHTML;
            }
            return;
        }
        for (let i = 0; i < n; i++) {
            if (!(mask & (1 << i))) {
                let d = calculeazaDistanta(orase[curent], orase[i]);
                await calculeazaBB(mask | (1 << i), i, dist + d, path.concat(orase[i]));
            }
        }
    }
    await calculeazaBB(1, 0, 0, [orase[0]]);
    distantaMinima = celMaiBunScorGlobal;
}

document.getElementById("start").onclick = async function() {
    if (isRunning || orase.length < 2) return;
    isRunning = true;
    this.disabled = true;
    consola.innerHTML = `<strong>Rulăm ${titluAfisare.innerText}...</strong><br>`;
    distantaMinima = Infinity;
    celMaiScurtDrum = [];

    const mod = titluAfisare.innerText;
    if (mod === "Greedy") await Greedy();
    else if (mod === "Dinamic") await TSP_Dinamic();
    else if (mod === "Branch and Bound") await ruleazaBranchAndBound();
    else {
        let v = new Array(orase.length).fill(false);
        v[0] = true;
        await TSP_Backtracking([orase[0]], v, 0);
    }

    curataCanvas();
    deseneazaDrum(celMaiScurtDrum, "#4caf50", 6, true);
    let traseuFinalText = celMaiScurtDrum.map(o => o.id).join(" → ") + " → " + celMaiScurtDrum[0].id;
    consola.innerHTML = `<div style="background: #1b5e20; color: white; padding: 15px; border-radius: 8px; margin-top: 15px; border: 2px solid #ffeb3b;"><h3>DRUM OPTIM GASIT</h3><strong>Traseu:</strong> ${traseuFinalText}<br><strong>Distanta:</strong> ${distantaMinima.toFixed(2)} px</div>` + consola.innerHTML;
    isRunning = false;
    this.disabled = false;
};

document.getElementById("resetare").onclick = () => {
    if (isRunning) return;
    orase = []; count = 0; curataCanvas();
    document.querySelectorAll(".bulina").forEach(b => b.remove());
    nrOraseAfisaj.innerText = "0"; consola.innerHTML = "";
};
