// ============================================
// JAI'S KOI MANAGER - COMPLETE SCRIPT
// ============================================

// ===== CORE DATA =====
let fishData = [];
let nextId = 1;
let editingFishId = null;

// ===== ADDITIONAL DATA STORES =====
let growthData = {};
let feedingLogs = [];
let healthRecords = [];
let waterLogs = [];
let fishGalleries = {};
let familyTrees = {};
let pondSections = [];
let breedingRecords = [];
let competitionRecords = [];
let costRecords = [];
let reminders = [];

// ===== DOM ELEMENTS =====
const fishContainer = document.getElementById('fishContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const filterSelect = document.getElementById('filterSelect');
const modal = document.getElementById('fishModal');
const addFishBtn = document.getElementById('addFishBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const modalTitle = document.getElementById('modalTitle');
const fishName = document.getElementById('fishName');
const fishVariety = document.getElementById('fishVariety');
const fishLength = document.getElementById('fishLength');
const fishDate = document.getElementById('fishDate');
const fishStatus = document.getElementById('fishStatus');
const fishNotes = document.getElementById('fishNotes');
const fishImage = document.getElementById('fishImage');
const saveFishBtn = document.getElementById('saveFish');
const cancelFishBtn = document.getElementById('cancelFish');

// ===== LOCAL STORAGE FUNCTIONS =====
function loadData() {
    const saved = localStorage.getItem('jaiKoiCollection');
    if (saved) {
        try {
            fishData = JSON.parse(saved);
            if (fishData.length > 0) {
                nextId = Math.max(...fishData.map(f => f.id)) + 1;
            }
        } catch (e) {
            console.error('Error loading fish data:', e);
            fishData = JSON.parse(JSON.stringify(initialFishData));
            nextId = fishData.length + 1;
        }
    } else {
        fishData = JSON.parse(JSON.stringify(initialFishData));
        nextId = fishData.length + 1;
        saveData();
    }
}

function saveData() {
    try {
        localStorage.setItem('jaiKoiCollection', JSON.stringify(fishData));
        showNotification('💾 Saved!');
    } catch (e) {
        console.error('Error saving data:', e);
        alert('Storage full! Please export your data and clear some images.');
    }
}

function loadGrowthData() {
    const saved = localStorage.getItem('jaiKoiGrowthData');
    if (saved) growthData = JSON.parse(saved);
}

function saveGrowthData() {
    localStorage.setItem('jaiKoiGrowthData', JSON.stringify(growthData));
}

function loadFeedingLogs() {
    const saved = localStorage.getItem('jaiKoiFeedingLogs');
    if (saved) feedingLogs = JSON.parse(saved);
}

function saveFeedingLogs() {
    localStorage.setItem('jaiKoiFeedingLogs', JSON.stringify(feedingLogs));
}

function loadHealthRecords() {
    const saved = localStorage.getItem('jaiKoiHealthRecords');
    if (saved) healthRecords = JSON.parse(saved);
}

function saveHealthRecords() {
    localStorage.setItem('jaiKoiHealthRecords', JSON.stringify(healthRecords));
}

function loadWaterLogs() {
    const saved = localStorage.getItem('jaiKoiWaterLogs');
    if (saved) waterLogs = JSON.parse(saved);
}

function saveWaterLogs() {
    localStorage.setItem('jaiKoiWaterLogs', JSON.stringify(waterLogs));
}

function loadGalleries() {
    const saved = localStorage.getItem('jaiKoiGalleries');
    if (saved) fishGalleries = JSON.parse(saved);
}

function saveGalleries() {
    localStorage.setItem('jaiKoiGalleries', JSON.stringify(fishGalleries));
}

function loadFamilyTrees() {
    const saved = localStorage.getItem('jaiKoiFamilyTrees');
    if (saved) familyTrees = JSON.parse(saved);
}

function saveFamilyTrees() {
    localStorage.setItem('jaiKoiFamilyTrees', JSON.stringify(familyTrees));
}

function loadPondSections() {
    const saved = localStorage.getItem('jaiKoiPondSections');
    if (saved) {
        pondSections = JSON.parse(saved);
    } else {
        pondSections = [
            { id: 1, name: 'Main Pond', capacity: 50, notes: '' },
            { id: 2, name: 'Quarantine Tank', capacity: 10, notes: '' }
        ];
        savePondSections();
    }
}

function savePondSections() {
    localStorage.setItem('jaiKoiPondSections', JSON.stringify(pondSections));
}

function loadBreedingRecords() {
    const saved = localStorage.getItem('jaiKoiBreedingRecords');
    if (saved) breedingRecords = JSON.parse(saved);
}

function saveBreedingRecords() {
    localStorage.setItem('jaiKoiBreedingRecords', JSON.stringify(breedingRecords));
}

function loadCompetitionRecords() {
    const saved = localStorage.getItem('jaiKoiCompetitionRecords');
    if (saved) competitionRecords = JSON.parse(saved);
}

function saveCompetitionRecords() {
    localStorage.setItem('jaiKoiCompetitionRecords', JSON.stringify(competitionRecords));
}

function loadCostRecords() {
    const saved = localStorage.getItem('jaiKoiCostRecords');
    if (saved) costRecords = JSON.parse(saved);
}

function saveCostRecords() {
    localStorage.setItem('jaiKoiCostRecords', JSON.stringify(costRecords));
}

function loadReminders() {
    const saved = localStorage.getItem('jaiKoiReminders');
    if (saved) reminders = JSON.parse(saved);
}

function saveReminders() {
    localStorage.setItem('jaiKoiReminders', JSON.stringify(reminders));
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(message) {
    let notification = document.getElementById('saveNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'saveNotification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #2ecc71;
            color: white;
            padding: 12px 24px;
            border-radius: 12px;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.4);
        `;
        document.body.appendChild(notification);
    }
    notification.textContent = message;
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 2000);
}

// ===== IMAGE COMPRESSION =====
function compressImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ===== MODAL FUNCTIONS =====
function openModal(fish = null) {
    editingFishId = fish ? fish.id : null;
    modalTitle.textContent = fish ? '✏️ Edit Fish' : '➕ Add New Fish';
    
    fishName.value = fish ? fish.name : '';
    fishVariety.value = fish ? fish.variety : '';
    fishLength.value = fish ? fish.length : '';
    fishDate.value = fish ? fish.date : '';
    fishStatus.value = fish ? fish.status : 'alive';
    fishNotes.value = fish ? (fish.notes || '') : '';
    fishImage.value = '';
    
    modal.classList.add('active');
    setTimeout(() => fishName.focus(), 100);
}

function closeModal() {
    modal.classList.remove('active');
    editingFishId = null;
    fishImage.value = '';
}

// ===== SAVE FISH (WITH FIXED IMAGE UPLOAD) =====
async function saveFish() {
    const name = fishName.value.trim();
    if (!name) {
        alert('Please enter a fish name!');
        fishName.focus();
        return;
    }

    let imageData = '';
    
    // Handle image upload
    const imageFile = fishImage.files[0];
    if (imageFile) {
        try {
            // Show loading state
            saveFishBtn.textContent = '⏳ Processing...';
            saveFishBtn.disabled = true;
            
            // Compress and convert image
            imageData = await compressImage(imageFile, 800);
            
        } catch (error) {
            console.error('Image processing error:', error);
            alert('Error processing image. Please try a smaller photo.');
            saveFishBtn.textContent = 'Save';
            saveFishBtn.disabled = false;
            return;
        }
    } else if (editingFishId) {
        // Keep existing image when editing
        const existing = fishData.find(f => f.id === editingFishId);
        if (existing) {
            imageData = existing.image || '';
        }
    }

    const fishObj = {
        id: editingFishId || nextId++,
        name: name,
        variety: fishVariety.value.trim() || '-',
        length: parseInt(fishLength.value) || 0,
        date: fishDate.value || '',
        status: fishStatus.value,
        notes: fishNotes.value.trim() || '',
        image: imageData,
        pondId: editingFishId ? (fishData.find(f => f.id === editingFishId)?.pondId || null) : null
    };

    if (editingFishId) {
        const index = fishData.findIndex(f => f.id === editingFishId);
        if (index !== -1) {
            fishData[index] = fishObj;
        }
    } else {
        fishData.push(fishObj);
        
        // Initialize growth data for new fish
        if (fishObj.length > 0) {
            if (!growthData[fishObj.id]) growthData[fishObj.id] = [];
            growthData[fishObj.id].push({
                length: fishObj.length,
                date: fishObj.date || new Date().toISOString().split('T')[0],
                notes: 'Initial measurement'
            });
            saveGrowthData();
        }
    }
    
    saveData();
    closeModal();
    renderFish();
    updateStats();
    
    // Reset button state
    saveFishBtn.textContent = 'Save';
    saveFishBtn.disabled = false;
}

// ===== DELETE FISH =====
function deleteFish(id) {
    if (confirm('Are you sure you want to delete this fish? This cannot be undone.')) {
        fishData = fishData.filter(f => f.id !== id);
        
        // Clean up related data
        delete growthData[id];
        delete fishGalleries[id];
        delete familyTrees[id];
        feedingLogs = feedingLogs.filter(log => log.fishId !== id);
        healthRecords = healthRecords.filter(record => record.fishId !== id);
        breedingRecords = breedingRecords.filter(record => record.fishId !== id);
        competitionRecords = competitionRecords.filter(record => record.fishId !== id);
        costRecords = costRecords.filter(record => record.fishId !== id);
        
        saveData();
        saveGrowthData();
        saveGalleries();
        saveFamilyTrees();
        saveFeedingLogs();
        saveHealthRecords();
        saveBreedingRecords();
        saveCompetitionRecords();
        saveCostRecords();
        
        renderFish();
        updateStats();
        showNotification('🗑️ Fish deleted');
    }
}

// ===== FILTERING & SORTING =====
function getFilteredFish() {
    let filtered = [...fishData];
    
    // Search
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(f => 
            f.name.toLowerCase().includes(searchTerm) ||
            f.variety.toLowerCase().includes(searchTerm) ||
            (f.notes && f.notes.toLowerCase().includes(searchTerm)) ||
            f.length.toString().includes(searchTerm)
        );
    }
    
    // Filter by status
    const filterVal = filterSelect.value;
    if (filterVal === 'alive') filtered = filtered.filter(f => f.status === 'alive');
    if (filterVal === 'deceased') filtered = filtered.filter(f => f.status === 'deceased');
    
    // Sort
    const sortVal = sortSelect.value;
    switch(sortVal) {
        case 'name':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'length':
            filtered.sort((a, b) => b.length - a.length);
            break;
        case 'date':
            filtered.sort((a, b) => {
                if (!a.date && !b.date) return 0;
                if (!a.date) return 1;
                if (!b.date) return -1;
                return b.date.localeCompare(a.date);
            });
            break;
        case 'variety':
            filtered.sort((a, b) => a.variety.localeCompare(b.variety));
            break;
    }
    
    return filtered;
}

// ===== RENDER FISH CARDS =====
function renderFish() {
    const filtered = getFilteredFish();
    fishContainer.innerHTML = '';
    
    if (filtered.length === 0) {
        fishContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #8899aa;">
                <div style="font-size: 4em; margin-bottom: 20px;">🐟</div>
                <h3 style="color: #b0c4de; margin-bottom: 10px;">No Fish Found</h3>
                <p>Try adjusting your search or add a new fish!</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(fish => {
        const card = document.createElement('div');
        card.className = `fish-card ${fish.status === 'deceased' ? 'deceased' : ''}`;
        
        const pondSection = fish.pondId ? pondSections.find(p => p.id === fish.pondId) : null;
        
        card.innerHTML = `
            <div class="card-image">
                ${fish.image 
                    ? `<img src="${fish.image}" alt="${fish.name}" loading="lazy">` 
                    : '<div class="no-image">🐟</div>'}
                <span class="card-badge ${fish.status === 'alive' ? 'badge-alive' : 'badge-deceased'}">
                    ${fish.status === 'alive' ? 'Alive' : 'Deceased'}
                </span>
            </div>
            <div class="card-info">
                <h3>${fish.name}</h3>
                <div class="variety">${fish.variety}</div>
                ${pondSection ? `<div style="color:#8899aa;font-size:0.8em;margin-bottom:8px;">📍 ${pondSection.name}</div>` : ''}
                <div class="details">
                    <span>📏 ${fish.length} cm</span>
                    <span>📅 ${fish.date || 'N/A'}</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;padding:0 20px 20px;">
                <button class="card-btn edit-btn" onclick="event.stopPropagation(); openModal(fishData.find(f=>f.id===${fish.id}))">
                    ✏️ Edit
                </button>
                <button class="card-btn delete-btn" onclick="event.stopPropagation(); deleteFish(${fish.id})">
                    🗑️
                </button>
            </div>
        `;
        
        card.addEventListener('click', () => openFishProfile(fish.id));
        fishContainer.appendChild(card);
    });
}

// ===== UPDATE STATISTICS =====
function updateStats() {
    const alive = fishData.filter(f => f.status === 'alive');
    const deceased = fishData.filter(f => f.status === 'deceased');
    const largest = fishData.reduce((max, f) => f.length > max ? f.length : max, 0);
    
    document.getElementById('totalFish').textContent = fishData.length;
    document.getElementById('aliveFish').textContent = alive.length;
    document.getElementById('deadFish').textContent = deceased.length;
    document.getElementById('largestFish').textContent = `${largest} cm`;
}

// ===== FISH PROFILE =====
function openFishProfile(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    // Remove existing profile modal
    const existingModal = document.getElementById('fishProfileModal');
    if (existingModal) existingModal.remove();
    
    const profileModal = document.createElement('div');
    profileModal.id = 'fishProfileModal';
    profileModal.className = 'profile-modal';
    
    const measurements = growthData[fish.id] || [];
    const sortedMeasurements = [...measurements].sort((a, b) => b.date.localeCompare(a.date));
    const fishFeedingLogs = feedingLogs.filter(log => log.fishId === fishId).slice(-5);
    const fishHealthRecords = healthRecords.filter(record => record.fishId === fishId).slice(-5);
    const gallery = fishGalleries[fishId] || [];
    const family = familyTrees[fishId];
    const pondSection = fish.pondId ? pondSections.find(p => p.id === fish.pondId) : null;
    const fishBreeding = breedingRecords.filter(r => r.fishId === fishId);
    const fishCompetitions = competitionRecords.filter(r => r.fishId === fishId);
    const fishCosts = costRecords.filter(r => r.fishId === fishId);
    const totalCost = fishCosts.reduce((sum, r) => sum + r.amount, 0);
    
    profileModal.innerHTML = `
        <div class="profile-overlay" onclick="closeProfileModal()"></div>
        <div class="profile-content">
            <button class="profile-close" onclick="closeProfileModal()">&times;</button>
            
            <div class="profile-header">
                <div class="profile-image" onclick="addGalleryImage(${fish.id})" title="Click to add photo">
                    ${fish.image 
                        ? `<img src="${fish.image}" alt="${fish.name}">` 
                        : '<div class="no-image">🐟</div>'}
                </div>
                <div class="profile-title">
                    <h2>${fish.name}</h2>
                    <p class="profile-variety">${fish.variety}</p>
                    ${pondSection ? `<p style="color:#8899aa;font-size:0.9em;">📍 ${pondSection.name}</p>` : ''}
                    <span class="profile-status ${fish.status}">${fish.status === 'alive' ? '🟢 Alive' : '💀 Deceased'}</span>
                </div>
            </div>
            
            <div class="profile-stats">
                <div class="profile-stat">
                    <div class="stat-value">${fish.length} cm</div>
                    <div class="stat-label">Current Length</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-value">${fish.date || 'N/A'}</div>
                    <div class="stat-label">Date Added</div>
                </div>
                <div class="profile-stat">
                    <div class="stat-value">$${totalCost.toFixed(0)}</div>
                    <div class="stat-label">Total Cost</div>
                </div>
            </div>
            
            ${family ? `
            <div class="profile-section">
                <h3>🧬 Lineage</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:0.9em;">
                    <div><strong>Parent 1:</strong> ${family.parent1 || 'Unknown'}</div>
                    <div><strong>Parent 2:</strong> ${family.parent2 || 'Unknown'}</div>
                    <div><strong>Breeder:</strong> ${family.breeder || 'Unknown'}</div>
                    <div><strong>Bloodline:</strong> ${family.bloodline || 'Unknown'}</div>
                </div>
                <button class="profile-btn" onclick="addLineage(${fish.id})" style="margin-top:10px;">✏️ Edit Lineage</button>
            </div>
            ` : `
            <div class="profile-section">
                <h3>🧬 Lineage</h3>
                <p class="empty-message">No lineage information</p>
                <button class="profile-btn" onclick="addLineage(${fish.id})">+ Add Lineage</button>
            </div>
            `}
            
            <div class="profile-section">
                <h3>📸 Gallery (${gallery.length} photos)</h3>
                ${gallery.length > 0 ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px;margin-bottom:12px;">
                    ${gallery.slice(0, 6).map(img => `
                        <div style="aspect-ratio:1;overflow:hidden;border-radius:8px;background:rgba(0,0,0,0.3);">
                            <img src="${img.url}" style="width:100%;height:100%;object-fit:cover;" alt="Gallery" loading="lazy">
                        </div>
                    `).join('')}
                </div>
                ` : '<p class="empty-message">No gallery photos yet</p>'}
                <button class="profile-btn" onclick="addGalleryImage(${fish.id})">📷 Add Photos</button>
            </div>
            
            <div class="profile-section">
                <h3>📏 Growth History</h3>
                <div class="measurement-list">
                    ${sortedMeasurements.length > 0 ? sortedMeasurements.map(m => `
                        <div class="measurement-item">
                            <span>${m.length} cm</span>
                            <span>${m.date}</span>
                            <span class="measurement-notes">${m.notes || ''}</span>
                        </div>
                    `).join('') : '<p class="empty-message">No measurements recorded</p>'}
                </div>
                <button class="profile-btn" onclick="addMeasurement(${fish.id})">+ Add Measurement</button>
            </div>
            
            <div class="profile-section">
                <h3>🍽️ Recent Feeding</h3>
                ${fishFeedingLogs.length > 0 ? fishFeedingLogs.map(log => `
                    <div class="log-item">
                        <span>${log.food}</span>
                        <span>${log.date}</span>
                        <span>${log.notes || ''}</span>
                    </div>
                `).join('') : '<p class="empty-message">No feeding records</p>'}
                <button class="profile-btn" onclick="logFeeding(${fish.id})" style="margin-top:10px;">+ Log Feeding</button>
            </div>
            
            <div class="profile-section">
                <h3>🏥 Health Records</h3>
                ${fishHealthRecords.length > 0 ? fishHealthRecords.map(record => `
                    <div class="log-item ${record.status}">
                        <span>${record.status}</span>
                        <span>${record.date}</span>
                        <span>${record.notes || ''}</span>
                    </div>
                `).join('') : '<p class="empty-message">No health records</p>'}
                <button class="profile-btn" onclick="logHealth(${fish.id})" style="margin-top:10px;">+ Health Check</button>
            </div>
            
            ${fishBreeding.length > 0 ? `
            <div class="profile-section">
                <h3>🥚 Breeding History</h3>
                ${fishBreeding.map(record => `
                    <div class="log-item">
                        <span>With: ${record.partner}</span>
                        <span>${record.date}</span>
                        <span>${record.fry} fry</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${fishCompetitions.length > 0 ? `
            <div class="profile-section">
                <h3>🏆 Competitions</h3>
                ${fishCompetitions.map(record => `
                    <div class="log-item">
                        <span>${record.event}</span>
                        <span>${record.result}</span>
                        <span>${record.date}</span>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div class="profile-section">
                <h3>📝 Notes</h3>
                <p style="color:#b0c4de;">${fish.notes || 'No notes added yet'}</p>
            </div>
            
            <div class="profile-actions">
                <button class="profile-btn primary" onclick="closeProfileModal(); openModal(fishData.find(f=>f.id===${fish.id}))">✏️ Edit Fish</button>
                <button class="profile-btn" onclick="assignPond(${fish.id})">📍 Assign Pond</button>
                <button class="profile-btn" onclick="logBreeding(${fish.id})">🥚 Breeding</button>
                <button class="profile-btn" onclick="logCompetition(${fish.id})">🏆 Competition</button>
                <button class="profile-btn" onclick="logCost(${fish.id})">💰 Add Cost</button>
                <button class="profile-btn danger" onclick="closeProfileModal(); deleteFish(${fish.id})">🗑️ Delete</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(profileModal);
    setTimeout(() => {
        const overlay = profileModal.querySelector('.profile-overlay');
        if (overlay) overlay.style.opacity = '1';
    }, 10);
}

function closeProfileModal() {
    const modal = document.getElementById('fishProfileModal');
    if (modal) {
        const overlay = modal.querySelector('.profile-overlay');
        if (overlay) overlay.style.opacity = '0';
        setTimeout(() => modal.remove(), 300);
    }
}

// ===== PROFILE ACTIONS =====
function addMeasurement(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    const length = prompt('Enter length in cm:', fish.length);
    if (!length || isNaN(length)) return;
    
    const date = prompt('Enter date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const notes = prompt('Notes (optional):', '');
    
    if (!growthData[fishId]) growthData[fishId] = [];
    growthData[fishId].push({
        length: parseInt(length),
        date: date,
        notes: notes || ''
    });
    
    fish.length = parseInt(length);
    saveData();
    saveGrowthData();
    closeProfileModal();
    openFishProfile(fishId);
    renderFish();
    updateStats();
}

function logFeeding(fishId) {
    const food = prompt('What did you feed?', 'Pellets');
    if (!food) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const notes = prompt('Notes (optional):', '');
    
    feedingLogs.push({
        fishId: fishId,
        food: food,
        date: date,
        notes: notes || ''
    });
    
    saveFeedingLogs();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('🍽️ Feeding logged');
}

function logHealth(fishId) {
    const status = prompt('Health status (Healthy/Sick/Injured/Recovering):', 'Healthy');
    if (!status) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const notes = prompt('Notes (optional):', '');
    
    healthRecords.push({
        fishId: fishId,
        status: status,
        date: date,
        notes: notes || ''
    });
    
    saveHealthRecords();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('🏥 Health check logged');
}

function addGalleryImage(fishId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = async function(e) {
        const files = e.target.files;
        if (!files.length) return;
        
        if (!fishGalleries[fishId]) fishGalleries[fishId] = [];
        
        for (const file of files) {
            try {
                const compressed = await compressImage(file, 600);
                fishGalleries[fishId].push({
                    url: compressed,
                    date: new Date().toISOString().split('T')[0],
                    caption: ''
                });
            } catch (error) {
                console.error('Error adding gallery image:', error);
            }
        }
        
        saveGalleries();
        closeProfileModal();
        openFishProfile(fishId);
        showNotification(`📸 ${files.length} photo(s) added`);
    };
    
    input.click();
}

function addLineage(fishId) {
    const parent1 = prompt('Parent 1 (name or breeder):', '');
    if (parent1 === null) return;
    
    const parent2 = prompt('Parent 2 (name or breeder):', '');
    if (parent2 === null) return;
    
    const breeder = prompt('Breeder/Farm:', '');
    const bloodline = prompt('Bloodline:', '');
    
    familyTrees[fishId] = {
        parent1: parent1,
        parent2: parent2,
        breeder: breeder || '',
        bloodline: bloodline || ''
    };
    
    saveFamilyTrees();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('🧬 Lineage saved');
}

function assignPond(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    let message = 'Select pond section:\n\n';
    pondSections.forEach((section, index) => {
        const fishCount = fishData.filter(f => f.pondId === section.id).length;
        message += `${index + 1}. ${section.name} (${fishCount}/${section.capacity} fish)\n`;
    });
    message += '\nEnter number (or 0 to remove):';
    
    const choice = prompt(message, '1');
    if (choice === null) return;
    
    const index = parseInt(choice) - 1;
    if (index === -1) {
        fish.pondId = null;
    } else if (index >= 0 && index < pondSections.length) {
        fish.pondId = pondSections[index].id;
    }
    
    saveData();
    closeProfileModal();
    openFishProfile(fishId);
    renderFish();
    showNotification('📍 Pond assigned');
}

function logBreeding(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    const partner = prompt('Breeding partner:', '');
    if (!partner) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const eggs = prompt('Number of eggs (approx):', '');
    const fry = prompt('Number of fry survived:', '');
    const notes = prompt('Notes:', '');
    
    breedingRecords.push({
        fishId: fishId,
        fishName: fish.name,
        partner: partner,
        date: date,
        eggs: eggs || 'Unknown',
        fry: fry || 'Unknown',
        notes: notes || ''
    });
    
    saveBreedingRecords();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('🥚 Breeding recorded');
}

function logCompetition(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    const event = prompt('Competition/Show name:', '');
    if (!event) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const category = prompt('Category:', '');
    const result = prompt('Result (e.g., 1st place):', '');
    const notes = prompt('Notes:', '');
    
    competitionRecords.push({
        fishId: fishId,
        fishName: fish.name,
        event: event,
        date: date,
        category: category || '',
        result: result || '',
        notes: notes || ''
    });
    
    saveCompetitionRecords();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('🏆 Competition recorded');
}

function logCost(fishId) {
    const fish = fishData.find(f => f.id === fishId);
    if (!fish) return;
    
    const type = prompt('Type (Purchase/Food/Medication/Equipment):', 'Purchase');
    if (!type) return;
    
    const amount = prompt('Amount ($):', '');
    if (!amount || isNaN(amount)) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const notes = prompt('Notes:', '');
    
    costRecords.push({
        fishId: fishId,
        fishName: fish.name,
        type: type,
        amount: parseFloat(amount),
        date: date,
        notes: notes || ''
    });
    
    saveCostRecords();
    closeProfileModal();
    openFishProfile(fishId);
    showNotification('💰 Cost recorded');
}

// ===== BULK OPERATIONS =====
function bulkUpdateLength() {
    const increase = prompt('Increase all alive fish by how many cm?', '1');
    if (!increase || isNaN(increase)) return;
    
    const amount = parseInt(increase);
    fishData.forEach(fish => {
        if (fish.status === 'alive' && fish.length > 0) {
            fish.length += amount;
        }
    });
    
    saveData();
    renderFish();
    updateStats();
    showNotification(`📏 All fish +${amount} cm`);
}

function markAllFed() {
    const food = prompt('What did you feed?', 'Pellets');
    if (!food) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    fishData.forEach(fish => {
        if (fish.status === 'alive') {
            feedingLogs.push({
                fishId: fish.id,
                food: food,
                date: today,
                notes: 'Bulk feeding'
            });
        }
    });
    
    saveFeedingLogs();
    showNotification('🍽️ All fish fed!');
}

function logWaterQuality() {
    const ph = prompt('pH level:', '7.0');
    if (!ph) return;
    
    const ammonia = prompt('Ammonia (ppm):', '0');
    if (!ammonia) return;
    
    const nitrite = prompt('Nitrite (ppm):', '0');
    if (!nitrite) return;
    
    const nitrate = prompt('Nitrate (ppm):', '20');
    if (!nitrate) return;
    
    const temp = prompt('Temperature (°C):', '22');
    if (!temp) return;
    
    const date = new Date().toISOString().split('T')[0];
    
    waterLogs.push({
        ph: parseFloat(ph),
        ammonia: parseFloat(ammonia),
        nitrite: parseFloat(nitrite),
        nitrate: parseFloat(nitrate),
        temperature: parseInt(temp),
        date: date
    });
    
    saveWaterLogs();
    showNotification('💧 Water parameters logged');
}

function addReminder() {
    const title = prompt('Reminder title:', 'Water change');
    if (!title) return;
    
    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    const type = prompt('Type (Water Change/Feeding/Medication/Checkup):', 'Water Change');
    
    reminders.push({
        id: Date.now(),
        title: title,
        date: date,
        type: type || 'General',
        completed: false
    });
    
    saveReminders();
    showNotification('📅 Reminder added');
}

function checkReminders() {
    const today = new Date().toISOString().split('T')[0];
    const dueReminders = reminders.filter(r => !r.completed && r.date <= today);
    
    if (dueReminders.length > 0) {
        const message = dueReminders.map(r => `• ${r.title} (${r.date})`).join('\n');
        if (confirm(`📅 Reminders Due Today:\n\n${message}\n\nMark all as completed?`)) {
            dueReminders.forEach(r => r.completed = true);
            saveReminders();
        }
    }
}

function showStatistics() {
    const totalLength = fishData.reduce((sum, f) => sum + f.length, 0);
    const avgLength = fishData.length > 0 ? (totalLength / fishData.length).toFixed(1) : 0;
    const varieties = {};
    
    fishData.forEach(f => {
        varieties[f.variety] = (varieties[f.variety] || 0) + 1;
    });
    
    const topVarieties = Object.entries(varieties)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const totalFeedings = feedingLogs.length;
    const totalHealthChecks = healthRecords.length;
    const totalCosts = costRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalPhotos = Object.values(fishGalleries).flat().length;
    
    alert(`
📊 Collection Statistics

Total Fish: ${fishData.length}
Alive: ${fishData.filter(f => f.status === 'alive').length}
Deceased: ${fishData.filter(f => f.status === 'deceased').length}

Average Length: ${avgLength} cm
Total Biomass: ${totalLength} cm
Largest Fish: ${Math.max(...fishData.map(f => f.length))} cm

Top Varieties:
${topVarieties.map(([v, c]) => `• ${v}: ${c} fish`).join('\n')}

Total Feedings Logged: ${totalFeedings}
Health Checks: ${totalHealthChecks}
Gallery Photos: ${totalPhotos}
Total Costs: $${totalCosts.toFixed(2)}
    `);
}

// ===== EXPORT / IMPORT =====
function exportData() {
    const exportObj = {
        fishData: fishData,
        growthData: growthData,
        feedingLogs: feedingLogs,
        healthRecords: healthRecords,
        waterLogs: waterLogs,
        fishGalleries: fishGalleries,
        familyTrees: familyTrees,
        pondSections: pondSections,
        breedingRecords: breedingRecords,
        competitionRecords: competitionRecords,
        costRecords: costRecords,
        reminders: reminders,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };
    
    const dataStr = JSON.stringify(exportObj);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jai_koi_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('📦 Collection exported!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Import will replace all current data. Continue?')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (imported.fishData) {
                fishData = imported.fishData;
                growthData = imported.growthData || {};
                feedingLogs = imported.feedingLogs || [];
                healthRecords = imported.healthRecords || [];
                waterLogs = imported.waterLogs || [];
                fishGalleries = imported.fishGalleries || {};
                familyTrees = imported.familyTrees || {};
                pondSections = imported.pondSections || [];
                breedingRecords = imported.breedingRecords || [];
                competitionRecords = imported.competitionRecords || [];
                costRecords = imported.costRecords || [];
                reminders = imported.reminders || [];
                
                if (fishData.length > 0) {
                    nextId = Math.max(...fishData.map(f => f.id)) + 1;
                }
                
                // Save everything
                saveData();
                saveGrowthData();
                saveFeedingLogs();
                saveHealthRecords();
                saveWaterLogs();
                saveGalleries();
                saveFamilyTrees();
                savePondSections();
                saveBreedingRecords();
                saveCompetitionRecords();
                saveCostRecords();
                saveReminders();
                
                renderFish();
                updateStats();
                showNotification(`✅ Imported ${fishData.length} fish!`);
            } else {
                alert('Invalid backup file format');
            }
        } catch (err) {
            console.error('Import error:', err);
            alert('Error importing file. Make sure it\'s a valid backup.');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ===== EVENT LISTENERS =====
addFishBtn.addEventListener('click', () => openModal());
cancelFishBtn.addEventListener('click', closeModal);
saveFishBtn.addEventListener('click', saveFish);
searchInput.addEventListener('input', renderFish);
sortSelect.addEventListener('change', renderFish);
filterSelect.addEventListener('change', renderFish);
exportBtn.addEventListener('click', exportData);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', importData);

// Close modal on overlay click
modal.addEventListener('click', function(e) {
    if (e.target === modal) closeModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (document.getElementById('fishProfileModal')) closeProfileModal();
        if (modal.classList.contains('active')) closeModal();
    }
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInput.focus();
    }
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// ===== ADD BULK ACTION BUTTONS =====
const bulkActionsDiv = document.createElement('div');
bulkActionsDiv.style.cssText = 'display:flex;gap:10px;margin-top:15px;flex-wrap:wrap;';
bulkActionsDiv.innerHTML = `
    <button id="bulkGrowthBtn" class="bulk-btn">📏 Bulk Growth</button>
    <button id="bulkFeedBtn" class="bulk-btn">🍽️ Feed All</button>
    <button id="waterQualityBtn" class="bulk-btn">💧 Water Quality</button>
    <button id="addReminderBtn" class="bulk-btn">📅 Reminder</button>
`;

document.querySelector('.toolbar').appendChild(bulkActionsDiv);

// Style bulk buttons
const style = document.createElement('style');
style.textContent = `
    .bulk-btn {
        padding: 8px 16px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 0.85em;
        font-weight: 500;
        transition: all 0.3s;
    }
    .bulk-btn:hover {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.25);
    }
    .card-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 0.85em;
        font-weight: 500;
        transition: all 0.3s;
    }
    .edit-btn {
        flex: 1;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: white;
    }
    .edit-btn:hover {
        background: rgba(255,255,255,0.2);
    }
    .delete-btn {
        background: rgba(231,76,60,0.2);
        border: 1px solid rgba(231,76,60,0.3);
        color: #e74c3c;
    }
    .delete-btn:hover {
        background: rgba(231,76,60,0.4);
    }
`;
document.head.appendChild(style);

document.getElementById('bulkGrowthBtn').addEventListener('click', bulkUpdateLength);
document.getElementById('bulkFeedBtn').addEventListener('click', markAllFed);
document.getElementById('waterQualityBtn').addEventListener('click', logWaterQuality);
document.getElementById('addReminderBtn').addEventListener('click', addReminder);

// Add Statistics button to header
const statsBtn = document.createElement('button');
statsBtn.textContent = '📊 Statistics';
statsBtn.onclick = showStatistics;
statsBtn.style.cssText = `
    padding: 10px 20px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
    border-radius: 12px;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
    font-size: 0.9em;
    font-weight: 500;
    transition: all 0.3s;
`;
statsBtn.addEventListener('mouseenter', () => {
    statsBtn.style.background = 'rgba(255, 255, 255, 0.1)';
});
statsBtn.addEventListener('mouseleave', () => {
    statsBtn.style.background = 'rgba(255, 255, 255, 0.05)';
});

document.querySelector('.top-buttons').appendChild(statsBtn);

// ===== INITIALIZE EVERYTHING =====
function init() {
    loadData();
    loadGrowthData();
    loadFeedingLogs();
    loadHealthRecords();
    loadWaterLogs();
    loadGalleries();
    loadFamilyTrees();
    loadPondSections();
    loadBreedingRecords();
    loadCompetitionRecords();
    loadCostRecords();
    loadReminders();
    
    renderFish();
    updateStats();
    
    // Check reminders on startup
    setTimeout(checkReminders, 1000);
    
    // Check reminders every hour
    setInterval(checkReminders, 3600000);
    
    console.log('🐟 Jai\'s Koi Manager Ready!');
    console.log(`📊 ${fishData.length} fish loaded`);
    console.log(`💾 All data saved in browser localStorage`);
    console.log(`⌨️ Shortcuts: Ctrl+F = Search, Ctrl+N = New Fish, Esc = Close`);
}

// Start the app
init();