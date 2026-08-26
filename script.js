// =====================================================
// GESTIONE SESSIONE
// =====================================================

let currentUser = null;
let currentSede = null;

const users = {
    'admin': 'admin123',
    'marco': 'marco123'
};

const sedeInfo = {
    'main': { name: 'Sede Principale', icon: '🏢' },
    'senigallia': { name: 'Senigallia', icon: '📍' },
    'marotta': { name: 'Marotta', icon: '📍' }
};

// =====================================================
// LOGIN PRINCIPALE
// =====================================================

function login() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const errorDiv = document.getElementById('loginError');

    if (!user || !pass) {
        errorDiv.textContent = '❌ Inserisci nome e password';
        return;
    }

    if (users[user] && users[user] === pass) {
        currentUser = user;
        errorDiv.textContent = '';
        showScreen('sedePage');
    } else {
        errorDiv.textContent = '❌ Credenziali non valide';
    }
}

// =====================================================
// SELEZIONE SEDE
// =====================================================

function openSede(sede) {
    currentSede = sede;
    showDashboard();
}

function openMainLogin() {
    showScreen('mainLoginPage');
}

function loginMain() {
    const user = document.getElementById('mainUser').value;
    const pass = document.getElementById('mainPass').value;
    const errorDiv = document.getElementById('mainError');

    if (!user || !pass) {
        errorDiv.textContent = '❌ Inserisci credenziali';
        return;
    }

    if (users[user] && users[user] === pass) {
        currentUser = user;
        currentSede = 'main';
        errorDiv.textContent = '';
        showDashboard();
    } else {
        errorDiv.textContent = '❌ Credenziali non valide';
    }
}

// =====================================================
// NAVIGAZIONE
// =====================================================

function showScreen(screenId) {
    document.querySelectorAll('.screen, section').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

function showDashboard() {
    const sedeData = sedeInfo[currentSede] || sedeInfo['senigallia'];
    document.getElementById('currentSede').textContent = sedeData.name;
    document.getElementById('dashboardTitle').textContent = `Benvenuto, ${currentUser}`;
    document.getElementById('dashboardSubtitle').textContent = `Gestione ${sedeData.name.toLowerCase()}`;
    
    showScreen('dashboardPage');
}

function backToSedi() {
    currentUser = null;
    currentSede = null;
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    document.getElementById('mainUser').value = '';
    document.getElementById('mainPass').value = '';
    showScreen('loginPage');
}

// =====================================================
// MODULI (Ordini, Magazzino, ecc.)
// =====================================================

function openModule(moduleName) {
    showScreen('modulePage');
    
    const titles = {
        'ordini': { icon: '🧾', title: 'Ordini', desc: 'Gestione ordini ricevuti' },
        'magazzini': { icon: '📦', title: 'Magazzini', desc: 'Gestione scorte' },
        'temperature': { icon: '🌡️', title: 'Temperature', desc: 'Controllo temperatura' },
        'pulizie': { icon: '🧹', title: 'Pulizie', desc: 'Registro pulizie' },
        'scadenze': { icon: '🟠', title: 'Scadenze', desc: 'Prodotti in scadenza' }
    };

    const moduleData = titles[moduleName] || titles['ordini'];
    document.getElementById('moduleIcon').textContent = moduleData.icon;
    document.getElementById('moduleTitle').textContent = moduleData.title;
    document.getElementById('moduleSubtitle').textContent = moduleData.desc;
    document.getElementById('moduleContent').innerHTML = getModuleContent(moduleName);
    
    window.currentModule = moduleName;
}

function getModuleContent(moduleName) {
    const contents = {
        'ordini': `
            <div class="form-panel">
                <h2>📝 Nuovo Ordine</h2>
                <div class="form-grid">
                    <div>
                        <label>Cliente</label>
                        <input type="text" placeholder="Nome cliente" id="orderClient">
                    </div>
                    <div>
                        <label>Data Ordine</label>
                        <input type="date" id="orderDate">
                    </div>
                </div>
                <label>Prodotti</label>
                <div id="productsContainer">
                    <div style="background: #f9f7f4; padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                        <input type="text" placeholder="Prodotto" style="width: 60%; margin-right: 8px;">
                        <input type="number" placeholder="Qty" style="width: 25%;">
                        <button class="btn btn-light" style="margin-left: 5px; padding: 8px 12px;">✕</button>
                    </div>
                </div>
                <button class="btn btn-light" onclick="addProductRow()" style="width: 100%; margin-top: 10px;">+ Aggiungi Prodotto</button>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="saveOrder()">💾 Salva Ordine</button>
                    <button class="btn btn-secondary" onclick="backToDashboard()">Torna</button>
                </div>
            </div>
            <div class="form-panel">
                <h2>📋 Ordini Recenti</h2>
                <div id="ordersListContainer" style="max-height: 300px; overflow-y: auto;">
                    <p style="color: #999; text-align: center;">Nessun ordine registrato</p>
                </div>
            </div>
        `,
        'magazzini': `
            <div class="form-panel">
                <h2>📦 Gestione Magazzino</h2>
                <div class="toolbar">
                    <input type="text" placeholder="🔍 Cerca prodotto...">
                    <button class="btn btn-primary">+ Nuovo Prodotto</button>
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border);">
                            <th style="text-align: left; padding: 10px;">Prodotto</th>
                            <th style="text-align: center; padding: 10px;">Quantità</th>
                            <th style="text-align: center; padding: 10px;">Scadenza</th>
                            <th style="text-align: center; padding: 10px;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody id="stockTable">
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">Pappardelle</td>
                            <td style="text-align: center; padding: 12px;">45 kg</td>
                            <td style="text-align: center; padding: 12px;">15/12/2025</td>
                            <td style="text-align: center; padding: 12px;">
                                <button class="btn btn-light" style="padding: 5px 10px; font-size: 12px;">Modifica</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="form-actions" style="margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="backToDashboard()">Torna</button>
                </div>
            </div>
        `,
        'temperature': `
            <div class="form-panel">
                <h2>🌡️ Registro Temperature</h2>
                <div class="form-grid">
                    <div>
                        <label>Data/Ora</label>
                        <input type="datetime-local" id="tempTime">
                    </div>
                    <div>
                        <label>Frigorifero</label>
                        <input type="number" placeholder="°C" id="tempFridge">
                    </div>
                    <div>
                        <label>Congelatore</label>
                        <input type="number" placeholder="°C" id="tempFreezer">
                    </div>
                    <div>
                        <label>Ambiente</label>
                        <input type="number" placeholder="°C" id="tempAmbient">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="saveTemperature()">💾 Registra</button>
                    <button class="btn btn-secondary" onclick="backToDashboard()">Torna</button>
                </div>
            </div>
            <div id="tempHistory"></div>
        `,
        'pulizie': `
            <div class="form-panel">
                <h2>🧹 Registro Pulizie</h2>
                <div class="form-grid">
                    <div>
                        <label>Data</label>
                        <input type="date" id="cleanDate">
                    </div>
                    <div>
                        <label>Responsabile</label>
                        <input type="text" placeholder="Nome" id="cleanPerson">
                    </div>
                    <div>
                        <label>Turno</label>
                        <select id="cleanShift">
                            <option>Mattina</option>
                            <option>Pomeriggio</option>
                            <option>Sera</option>
                        </select>
                    </div>
                    <div>
                        <label>Stato</label>
                        <select id="cleanStatus">
                            <option>Completato ✓</option>
                            <option>In corso...</option>
                            <option>Non eseguito</option>
                        </select>
                    </div>
                </div>
                <label>Note</label>
                <textarea placeholder="Annotazioni..." id="cleanNotes"></textarea>
                <div class="form-actions">
                    <button class="btn btn-primary" onclick="saveCleaning()">💾 Registra</button>
                    <button class="btn btn-secondary" onclick="backToDashboard()">Torna</button>
                </div>
            </div>
        `,
        'scadenze': `
            <div class="form-panel">
                <h2>🟠 Prodotti in Scadenza</h2>
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>⚠️ Attenzione:</strong> Controllare regolarmente i prodotti prossimi alla scadenza
                </div>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border);">
                            <th style="text-align: left; padding: 10px;">Prodotto</th>
                            <th style="text-align: center; padding: 10px;">Quantità</th>
                            <th style="text-align: center; padding: 10px;">Scade</th>
                            <th style="text-align: center; padding: 10px;">Giorni</th>
                            <th style="text-align: center; padding: 10px;">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">Tagliatelle</td>
                            <td style="text-align: center; padding: 12px;">12 kg</td>
                            <td style="text-align: center; padding: 12px;">28/08/2026</td>
                            <td style="text-align: center; padding: 12px; color: #ff9500;"><strong>2 giorni</strong></td>
                            <td style="text-align: center; padding: 12px;">
                                <button class="btn btn-light" style="padding: 5px 10px; font-size: 12px;">Scarta</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="form-actions" style="margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="backToDashboard()">Torna</button>
                </div>
            </div>
        `
    };

    return contents[moduleName] || '<p>Modulo non disponibile</p>';
}

function addProductRow() {
    const container = document.getElementById('productsContainer');
    const row = document.createElement('div');
    row.style.cssText = 'background: #f9f7f4; padding: 12px; border-radius: 8px; margin-bottom: 10px;';
    row.innerHTML = `
        <input type="text" placeholder="Prodotto" style="width: 60%; margin-right: 8px;">
        <input type="number" placeholder="Qty" style="width: 25%;">
        <button class="btn btn-light" style="margin-left: 5px; padding: 8px 12px;" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
}

function saveOrder() {
    alert('✅ Ordine salvato con successo!');
}

function saveTemperature() {
    alert('✅ Temperature registrate!');
}

function saveCleaning() {
    alert('✅ Pulizie registrate!');
}

function backToDashboard() {
    showScreen('dashboardPage');
}

// =====================================================
// INIZIALIZZAZIONE
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    showScreen('loginPage');
    
    // Auto-login per test (rimuovere in produzione)
    // document.getElementById('loginUser').value = 'admin';
    // document.getElementById('loginPass').value = 'admin123';
});
