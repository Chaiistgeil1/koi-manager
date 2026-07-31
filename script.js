// ============================================
// JAI'S KOI MANAGER - COMPLETE SCRIPT
// ============================================

// ===== CORE DATA =====
let fishData = [];
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
let feedingSchedule = [];

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

// ===== STORAGE: FIRESTORE (SHARED) WITH LOCAL FALLBACK =====
// When Firebase is configured, all data lives in Firestore so every device
// sharing the link sees the same koi collection in real time. If Firebase
// isn't configured yet, everything falls back to this browser's localStorage
// exactly like before, so the app still works during setup.
let db = null;
let syncTimeout = null;
let firstFishSnapshotReceived = false;

function generateFishId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function fishSnapshotToState(fishDocs) {
    fishData = [];
    growthData = {};
    feedingLogs = [];
    healthRecords = [];
    fishGalleries = {};
    familyTrees = {};
    breedingRecords = [];
    competitionRecords = [];
    costRecords = [];

    fishDocs.forEach(docSnap => {
        const data = docSnap.data();
        const id = Number(docSnap.id);
        fishData.push({
            id,
            name: data.name,
            variety: data.variety,
            length: data.length,
            date: data.date,
            status: data.status,
            notes: data.notes,
            image: data.image || '',
            pondId: data.pondId || null
        });
        if (data.growth && data.growth.length) growthData[id] = data.growth;
        (data.feeding || []).forEach(l => feedingLogs.push({ ...l, fishId: id }));
        (data.health || []).forEach(r => healthRecords.push({ ...r, fishId: id }));
        if (data.gallery && data.gallery.length) fishGalleries[id] = data.gallery;
        if (data.family) familyTrees[id] = data.family;
        (data.breeding || []).forEach(r => breedingRecords.push({ ...r, fishId: id }));
        (data.competitions || []).forEach(r => competitionRecords.push({ ...r, fishId: id }));
        (data.costs || []).forEach(r => costRecords.push({ ...r, fishId: id }));
    });
}

const DEFAULT_POND_SECTIONS = [
    { id: 1, name: 'Main Pond', capacity: 50, notes: '' },
    { id: 2, name: 'Quarantine Tank', capacity: 10, notes: '' }
];

const DEFAULT_FEEDING_SCHEDULE = [
    { id: 1, time: '07:00', label: 'Morning Feed', note: 'Probiotic' },
    { id: 2, time: '11:00', label: 'Normal Feed', note: '' },
    { id: 3, time: '15:00', label: 'Normal Feed', note: '' },
    { id: 4, time: '19:00', label: 'Normal Feed', note: '' }
];

function metaSnapshotToState(metaData) {
    pondSections = (metaData && metaData.pondSections) || DEFAULT_POND_SECTIONS;
    waterLogs = (metaData && metaData.waterLogs) || [];
    reminders = (metaData && metaData.reminders) || [];
    feedingSchedule = (metaData && metaData.feedingSchedule) || DEFAULT_FEEDING_SCHEDULE;
}

async function syncAllToFirestore() {
    if (!db) return;
    try {
        const batch = db.batch();
        fishData.forEach(fish => {
            const ref = db.collection('fish').doc(String(fish.id));
            batch.set(ref, {
                name: fish.name,
                variety: fish.variety,
                length: fish.length,
                date: fish.date,
                status: fish.status,
                notes: fish.notes,
                image: fish.image || '',
                pondId: fish.pondId || null,
                growth: growthData[fish.id] || [],
                feeding: feedingLogs.filter(l => l.fishId === fish.id),
                health: healthRecords.filter(r => r.fishId === fish.id),
                gallery: fishGalleries[fish.id] || [],
                family: familyTrees[fish.id] || null,
                breeding: breedingRecords.filter(r => r.fishId === fish.id),
                competitions: competitionRecords.filter(r => r.fishId === fish.id),
                costs: costRecords.filter(r => r.fishId === fish.id)
            });
        });
        batch.set(db.collection('meta').doc('shared'), { pondSections, waterLogs, reminders, feedingSchedule });
        await batch.commit();
    } catch (e) {
        console.error('Firestore sync error:', e);
        showNotification('⚠️ Sync failed — check internet connection');
    }
}

function persistLocalFallback() {
    localStorage.setItem('jaiKoiCollection', JSON.stringify(fishData));
    localStorage.setItem('jaiKoiGrowthData', JSON.stringify(growthData));
    localStorage.setItem('jaiKoiFeedingLogs', JSON.stringify(feedingLogs));
    localStorage.setItem('jaiKoiHealthRecords', JSON.stringify(healthRecords));
    localStorage.setItem('jaiKoiWaterLogs', JSON.stringify(waterLogs));
    localStorage.setItem('jaiKoiGalleries', JSON.stringify(fishGalleries));
    localStorage.setItem('jaiKoiFamilyTrees', JSON.stringify(familyTrees));
    localStorage.setItem('jaiKoiPondSections', JSON.stringify(pondSections));
    localStorage.setItem('jaiKoiBreedingRecords', JSON.stringify(breedingRecords));
    localStorage.setItem('jaiKoiCompetitionRecords', JSON.stringify(competitionRecords));
    localStorage.setItem('jaiKoiCostRecords', JSON.stringify(costRecords));
    localStorage.setItem('jaiKoiReminders', JSON.stringify(reminders));
    localStorage.setItem('jaiKoiFeedingSchedule', JSON.stringify(feedingSchedule));
}

function loadLocalFallback() {
    const savedFish = localStorage.getItem('jaiKoiCollection');
    fishData = savedFish ? JSON.parse(savedFish) : JSON.parse(JSON.stringify(initialFishData));
    growthData = JSON.parse(localStorage.getItem('jaiKoiGrowthData') || '{}');
    feedingLogs = JSON.parse(localStorage.getItem('jaiKoiFeedingLogs') || '[]');
    healthRecords = JSON.parse(localStorage.getItem('jaiKoiHealthRecords') || '[]');
    waterLogs = JSON.parse(localStorage.getItem('jaiKoiWaterLogs') || '[]');
    fishGalleries = JSON.parse(localStorage.getItem('jaiKoiGalleries') || '{}');
    familyTrees = JSON.parse(localStorage.getItem('jaiKoiFamilyTrees') || '{}');
    pondSections = JSON.parse(localStorage.getItem('jaiKoiPondSections') || 'null') || DEFAULT_POND_SECTIONS;
    breedingRecords = JSON.parse(localStorage.getItem('jaiKoiBreedingRecords') || '[]');
    competitionRecords = JSON.parse(localStorage.getItem('jaiKoiCompetitionRecords') || '[]');
    costRecords = JSON.parse(localStorage.getItem('jaiKoiCostRecords') || '[]');
    reminders = JSON.parse(localStorage.getItem('jaiKoiReminders') || '[]');
    feedingSchedule = JSON.parse(localStorage.getItem('jaiKoiFeedingSchedule') || 'null') || DEFAULT_FEEDING_SCHEDULE;
    if (!savedFish) persistLocalFallback();
}

// scheduleSync() is called from all the save*() functions below (unchanged
// call sites throughout the rest of the file). It debounces rapid bursts of
// changes (e.g. deleteFish touches 8+ stores at once) into a single write.
function scheduleSync() {
    if (db) {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(syncAllToFirestore, 150);
    } else {
        persistLocalFallback();
    }
}

function initFirestoreSync() {
    db.collection('fish').onSnapshot(snapshot => {
        fishSnapshotToState(snapshot.docs);
        if (!firstFishSnapshotReceived) {
            firstFishSnapshotReceived = true;
            if (snapshot.empty) {
                fishData = JSON.parse(JSON.stringify(initialFishData));
                scheduleSync();
            }
        }
        renderFish();
        updateStats();
    }, err => {
        console.error('Firestore fish listener error:', err);
        showNotification('⚠️ Connection issue — check internet');
    });

    db.collection('meta').doc('shared').onSnapshot(docSnap => {
        metaSnapshotToState(docSnap.data());
        if (!docSnap.exists) scheduleSync();
        renderFish();
    }, err => console.error('Firestore meta listener error:', err));
}

function saveData() { scheduleSync(); }
function saveGrowthData() { scheduleSync(); }
function saveFeedingLogs() { scheduleSync(); }
function saveHealthRecords() { scheduleSync(); }
function saveWaterLogs() { scheduleSync(); }
function saveGalleries() { scheduleSync(); }
function saveFamilyTrees() { scheduleSync(); }
function savePondSections() { scheduleSync(); }
function saveBreedingRecords() { scheduleSync(); }
function saveCompetitionRecords() { scheduleSync(); }
function saveCostRecords() { scheduleSync(); }
function saveReminders() { scheduleSync(); }
function saveFeedingSchedule() { scheduleSync(); }

// ===== DATE HELPERS =====
// toISOString() converts to UTC, which silently shifts "today" to the wrong
// calendar day depending on the user's timezone and time of day. Use this
// instead anywhere "today" needs to reflect the user's actual local date.
function getLocalDateString(d) {
    d = d || new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        id: editingFishId || generateFishId(),
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
                date: fishObj.date || getLocalDateString(),
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

        if (db) {
            db.collection('fish').doc(String(id)).delete().catch(e => console.error('Firestore delete error:', e));
        }

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
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: #8fa39a;">
                <div style="font-size: 4em; margin-bottom: 20px;">🐟</div>
                <h3 style="color: #cbb896; margin-bottom: 10px;">No Fish Found</h3>
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
                ${pondSection ? `<div style="color:#8fa39a;font-size:0.8em;margin-bottom:8px;">📍 ${pondSection.name}</div>` : ''}
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
                    ${pondSection ? `<p style="color:#8fa39a;font-size:0.9em;">📍 ${pondSection.name}</p>` : ''}
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
                <p style="color:#cbb896;">${fish.notes || 'No notes added yet'}</p>
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
    
    const date = prompt('Enter date (YYYY-MM-DD):', getLocalDateString());
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
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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
                    date: getLocalDateString(),
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
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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
    
    const today = getLocalDateString();
    
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

function openWaterQualityModal() {
    const existingModal = document.getElementById('waterQualityModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'waterQualityModal';
    modal.className = 'schedule-modal';
    modal.innerHTML = `
        <div class="schedule-overlay" onclick="closeWaterQualityModal()"></div>
        <div class="schedule-content">
            <button class="schedule-close" onclick="closeWaterQualityModal()">&times;</button>
            <h2>💧 Log Water Quality</h2>
            <div class="schedule-form">
                <label>pH Level
                    <input type="number" step="0.1" id="wqPh" value="7.0">
                </label>
                <label>Ammonia (ppm)
                    <input type="number" step="0.01" min="0" id="wqAmmonia" value="0">
                </label>
                <label>Nitrite (ppm)
                    <input type="number" step="0.01" min="0" id="wqNitrite" value="0">
                </label>
                <label>Nitrate (ppm)
                    <input type="number" step="1" min="0" id="wqNitrate" value="20">
                </label>
                <label>Salinity (ppt)
                    <input type="number" step="0.1" min="0" id="wqSalinity" value="0">
                </label>
                <label>Temperature (°C)
                    <input type="number" step="1" id="wqTemp" value="22">
                </label>
                <label>Date
                    <input type="date" id="wqDate" value="${getLocalDateString()}">
                </label>
            </div>
            <button class="schedule-add-btn" id="wqSaveBtn">💾 Save Reading</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('wqSaveBtn').addEventListener('click', saveWaterQualityFromModal);
}

function closeWaterQualityModal() {
    const modal = document.getElementById('waterQualityModal');
    if (modal) modal.remove();
}

function saveWaterQualityFromModal() {
    const ph = parseFloat(document.getElementById('wqPh').value);
    const ammonia = parseFloat(document.getElementById('wqAmmonia').value);
    const nitrite = parseFloat(document.getElementById('wqNitrite').value);
    const nitrate = parseFloat(document.getElementById('wqNitrate').value);
    const salinity = parseFloat(document.getElementById('wqSalinity').value);
    const temperature = parseInt(document.getElementById('wqTemp').value);
    const date = document.getElementById('wqDate').value;

    if ([ph, ammonia, nitrite, nitrate, salinity, temperature].some(isNaN) || !date) {
        alert('Please fill in every field.');
        return;
    }

    waterLogs.push({ ph, ammonia, nitrite, nitrate, salinity, temperature, date });
    saveWaterLogs();

    const todayReminder = reminders.find(r => r.type === 'Water Quality Check' && r.date === getLocalDateString() && !r.completed);
    if (todayReminder) {
        todayReminder.completed = true;
        saveReminders();
    }

    closeWaterQualityModal();
    showNotification('💧 Water parameters logged');
}

function addReminder() {
    const title = prompt('Reminder title:', 'Water change');
    if (!title) return;
    
    const date = prompt('Date (YYYY-MM-DD):', getLocalDateString());
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

function ensureDailyWaterReminder() {
    const today = getLocalDateString();
    const alreadyExists = reminders.some(r => r.type === 'Water Quality Check' && r.date === today);
    if (!alreadyExists) {
        reminders.push({
            id: Date.now(),
            title: 'Daily water quality check',
            date: today,
            type: 'Water Quality Check',
            completed: false
        });
        saveReminders();
    }
}

// Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
const WEEKLY_REMINDER_TEMPLATES = [
    { dayOfWeek: 3, title: 'Water change', type: 'Water Change' },
    { dayOfWeek: 4, title: 'Bacteria day — turn UV filter OFF', type: 'UV Filter' },
    { dayOfWeek: 5, title: 'Turn UV filter back ON', type: 'UV Filter' }
];

function ensureWeeklyReminders() {
    const now = new Date();
    const todayStr = getLocalDateString(now);
    const todayDow = now.getDay();
    let added = false;

    WEEKLY_REMINDER_TEMPLATES.forEach(tpl => {
        if (tpl.dayOfWeek !== todayDow) return;
        const exists = reminders.some(r => r.type === tpl.type && r.title === tpl.title && r.date === todayStr);
        if (!exists) {
            reminders.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                title: tpl.title,
                date: todayStr,
                type: tpl.type,
                completed: false
            });
            added = true;
        }
    });

    if (added) saveReminders();
}

function ensureFeedingReminders() {
    const today = getLocalDateString();
    let added = false;

    feedingSchedule.forEach(slot => {
        const title = `${slot.label} (${slot.time})${slot.note ? ' — ' + slot.note : ''}`;
        const exists = reminders.some(r => r.type === 'Feeding Schedule' && r.scheduleId === slot.id && r.date === today);
        if (!exists) {
            reminders.push({
                id: Date.now() + Math.floor(Math.random() * 1000),
                title: title,
                date: today,
                type: 'Feeding Schedule',
                scheduleId: slot.id,
                completed: false
            });
            added = true;
        }
    });

    if (added) saveReminders();
}

function checkReminders() {
    ensureDailyWaterReminder();
    ensureWeeklyReminders();
    ensureFeedingReminders();
    const today = getLocalDateString();
    const dueReminders = reminders.filter(r => !r.completed && r.date <= today);
    
    if (dueReminders.length > 0) {
        const message = dueReminders.map(r => `• ${r.title} (${r.date})`).join('\n');
        if (confirm(`📅 Reminders Due Today:\n\n${message}\n\nMark all as completed?`)) {
            dueReminders.forEach(r => r.completed = true);
            saveReminders();
        }
    }
}

// Typical safe ranges for a koi pond
function isHealthyReading(param, value) {
    switch (param) {
        case 'ph': return value >= 7.0 && value <= 8.5;
        case 'ammonia': return value <= 0.25;
        case 'nitrite': return value <= 0.25;
        case 'nitrate': return value <= 40;
        default: return true;
    }
}

function buildSparklinePath(values, width, height) {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);
    return values.map((v, i) => {
        const x = i * stepX;
        const y = height - ((v - min) / range) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
}

function openStatisticsModal() {
    const existingModal = document.getElementById('statisticsModal');
    if (existingModal) existingModal.remove();

    const totalLength = fishData.reduce((sum, f) => sum + f.length, 0);
    const avgLength = fishData.length > 0 ? (totalLength / fishData.length).toFixed(1) : 0;
    const largest = fishData.length ? Math.max(...fishData.map(f => f.length)) : 0;
    const varieties = {};
    fishData.forEach(f => { varieties[f.variety] = (varieties[f.variety] || 0) + 1; });
    const topVarieties = Object.entries(varieties).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const totalCosts = costRecords.reduce((sum, r) => sum + r.amount, 0);
    const totalPhotos = Object.values(fishGalleries).flat().length;

    const sortedWaterLogs = [...waterLogs].sort((a, b) => a.date.localeCompare(b.date));

    const statRow = (param, label, value, unit) => `
        <div class="stats-row">
            <span>${label}</span>
            <span class="${isHealthyReading(param, value) ? '' : 'stats-warn'}">${value}${unit}</span>
        </div>
    `;

    const buildTrendCard = (label, unit, param, logs) => {
        const values = logs.map(w => w[param]).filter(v => typeof v === 'number');
        if (!values.length) return '';
        const latestVal = values[values.length - 1];
        const warn = !isHealthyReading(param, latestVal);
        const path = buildSparklinePath(values, 220, 44);
        return `
            <div class="trend-card">
                <div class="trend-card-header">
                    <span>${label}</span>
                    <span class="${warn ? 'stats-warn' : ''}">${latestVal}${unit}</span>
                </div>
                ${path ? `
                    <svg viewBox="0 0 220 44" class="stats-sparkline trend-sparkline" preserveAspectRatio="none">
                        <path d="${path}" fill="none" stroke="${warn ? '#e74c3c' : '#f2b155'}" stroke-width="2"/>
                    </svg>
                ` : '<div class="trend-no-data">Log one more reading to see a trend</div>'}
            </div>
        `;
    };

    const trendCards = [
        buildTrendCard('pH', '', 'ph', sortedWaterLogs),
        buildTrendCard('Ammonia', ' ppm', 'ammonia', sortedWaterLogs),
        buildTrendCard('Nitrite', ' ppm', 'nitrite', sortedWaterLogs),
        buildTrendCard('Nitrate', ' ppm', 'nitrate', sortedWaterLogs),
        buildTrendCard('Salinity', ' ppt', 'salinity', sortedWaterLogs),
        buildTrendCard('Temperature', '°C', 'temperature', sortedWaterLogs)
    ].join('');

    const modal = document.createElement('div');
    modal.id = 'statisticsModal';
    modal.className = 'schedule-modal';
    modal.innerHTML = `
        <div class="schedule-overlay" onclick="closeStatisticsModal()"></div>
        <div class="schedule-content">
            <button class="schedule-close" onclick="closeStatisticsModal()">&times;</button>
            <h2>📊 Statistics</h2>

            <div class="schedule-section">
                <h3>🐟 Collection</h3>
                <div class="stats-grid">
                    <div class="stats-card"><div class="stats-value">${fishData.length}</div><div class="stats-label">Total Fish</div></div>
                    <div class="stats-card"><div class="stats-value">${fishData.filter(f => f.status === 'alive').length}</div><div class="stats-label">Alive</div></div>
                    <div class="stats-card"><div class="stats-value">${fishData.filter(f => f.status === 'deceased').length}</div><div class="stats-label">Deceased</div></div>
                    <div class="stats-card"><div class="stats-value">${largest} cm</div><div class="stats-label">Largest</div></div>
                    <div class="stats-card"><div class="stats-value">${avgLength} cm</div><div class="stats-label">Avg Length</div></div>
                    <div class="stats-card"><div class="stats-value">$${totalCosts.toFixed(0)}</div><div class="stats-label">Total Cost</div></div>
                </div>
                <div class="stats-sublist">
                    <div class="stats-sublist-title">Top Varieties</div>
                    ${topVarieties.map(([v, c]) => `<div class="stats-row"><span>${v}</span><span>${c}</span></div>`).join('')}
                </div>
                <div class="stats-sublist">
                    <div class="stats-row"><span>Feedings Logged</span><span>${feedingLogs.length}</span></div>
                    <div class="stats-row"><span>Health Checks</span><span>${healthRecords.length}</span></div>
                    <div class="stats-row"><span>Gallery Photos</span><span>${totalPhotos}</span></div>
                </div>
            </div>

            <div class="schedule-section">
                <h3>💧 Water Quality Trends</h3>
                ${sortedWaterLogs.length ? `
                    <div class="stats-sublist-title">${sortedWaterLogs.length} reading${sortedWaterLogs.length === 1 ? '' : 's'} logged</div>
                    <div class="trend-grid">${trendCards}</div>
                    <div class="stats-sublist">
                        <div class="stats-sublist-title">History</div>
                        ${sortedWaterLogs.slice().reverse().map(w => `
                            <div class="stats-row"><span>${w.date}</span><span>pH ${w.ph} · NH₃ ${w.ammonia} · NO₂ ${w.nitrite} · NO₃ ${w.nitrate}${typeof w.salinity === 'number' ? ' · Sal ' + w.salinity + 'ppt' : ''} · ${w.temperature}°C</span></div>
                        `).join('')}
                    </div>
                ` : '<p class="schedule-empty">No water quality readings logged yet — click 💧 Water Quality to add one.</p>'}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeStatisticsModal() {
    const modal = document.getElementById('statisticsModal');
    if (modal) modal.remove();
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
    a.download = `jai_koi_backup_${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('📦 Collection exported!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Import will replace all current data — for everyone sharing this link, not just you. Continue?')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const imported = JSON.parse(e.target.result);

            if (imported.fishData) {
                // Remove fish that won't exist in the imported set, so old
                // entries don't linger in the shared store after import.
                if (db) {
                    const existing = await db.collection('fish').get();
                    const clearBatch = db.batch();
                    existing.docs.forEach(d => clearBatch.delete(d.ref));
                    await clearBatch.commit();
                }

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

// Style fish card buttons
const style = document.createElement('style');
style.textContent = `
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

// Add Statistics button to header
const statsBtn = document.createElement('button');
statsBtn.textContent = '📊 Statistics';
statsBtn.onclick = openStatisticsModal;
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

const waterQualityBtn = document.createElement('button');
waterQualityBtn.textContent = '💧 Water Quality';
waterQualityBtn.onclick = openWaterQualityModal;
waterQualityBtn.style.cssText = `
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
waterQualityBtn.addEventListener('mouseenter', () => {
    waterQualityBtn.style.background = 'rgba(255, 255, 255, 0.1)';
});
waterQualityBtn.addEventListener('mouseleave', () => {
    waterQualityBtn.style.background = 'rgba(255, 255, 255, 0.05)';
});

document.querySelector('.top-buttons').appendChild(waterQualityBtn);

// ===== SCHEDULE / CALENDAR =====
const SCHEDULE_EVENT_META = {
    reminder: { icon: '📅', color: '#f2b155' },
    concern: { icon: '🚨', color: '#e74c3c' },
    health: { icon: '🏥', color: '#2ecc71' },
    feeding: { icon: '🍽️', color: '#f39c12' },
    water: { icon: '💧', color: '#00bcd4' },
    added: { icon: '🐟', color: '#8fa39a' }
};

function buildScheduleEvents() {
    const events = [];

    reminders.forEach(r => {
        events.push({
            date: r.date,
            type: 'reminder',
            completed: r.completed,
            refId: r.id,
            title: r.title,
            subtitle: r.type || 'Reminder'
        });
    });

    healthRecords.forEach(r => {
        const fish = fishData.find(f => f.id === r.fishId);
        const isConcern = r.status && r.status.toLowerCase() !== 'healthy';
        events.push({
            date: r.date,
            type: isConcern ? 'concern' : 'health',
            title: `${fish ? fish.name : 'Unknown fish'} — ${r.status}`,
            subtitle: r.notes || ''
        });
    });

    feedingLogs.forEach(log => {
        const fish = fishData.find(f => f.id === log.fishId);
        events.push({
            date: log.date,
            type: 'feeding',
            title: `Fed ${fish ? fish.name : 'a fish'}`,
            subtitle: log.food + (log.notes ? ' — ' + log.notes : '')
        });
    });

    waterLogs.forEach(w => {
        events.push({
            date: w.date,
            type: 'water',
            title: 'Water quality check',
            subtitle: `pH ${w.ph} · Ammonia ${w.ammonia} · Nitrite ${w.nitrite} · Nitrate ${w.nitrate} · ${w.temperature}°C`
        });
    });

    fishData.forEach(f => {
        if (f.date) {
            events.push({
                date: f.date,
                type: 'added',
                title: `${f.name} added to collection`,
                subtitle: f.variety
            });
        }
    });

    return events.filter(e => e.date);
}

function renderScheduleEvent(e, showCheckbox, today) {
    const meta = SCHEDULE_EVENT_META[e.type];
    const overdue = e.type === 'reminder' && !e.completed && e.date < today;
    return `
        <div class="schedule-item" style="border-left-color:${overdue ? '#e74c3c' : meta.color}">
            <div class="schedule-item-icon">${meta.icon}</div>
            <div class="schedule-item-body">
                <div class="schedule-item-title">${e.title}${overdue ? ' <span class="schedule-overdue">Overdue</span>' : ''}</div>
                ${e.subtitle ? `<div class="schedule-item-subtitle">${e.subtitle}</div>` : ''}
                <div class="schedule-item-date">${e.date}</div>
            </div>
            ${showCheckbox ? `<button class="schedule-complete-btn" onclick="completeReminderFromSchedule(${e.refId})" title="Mark done">✓</button>` : ''}
        </div>
    `;
}

function openScheduleModal() {
    const existingModal = document.getElementById('scheduleModal');
    if (existingModal) existingModal.remove();

    const today = getLocalDateString();
    const events = buildScheduleEvents();

    const upcoming = events
        .filter(e => e.type === 'reminder' && !e.completed)
        .sort((a, b) => a.date.localeCompare(b.date));

    const history = events
        .filter(e => e.type !== 'reminder' || e.completed)
        .sort((a, b) => b.date.localeCompare(a.date));

    const modal = document.createElement('div');
    modal.id = 'scheduleModal';
    modal.className = 'schedule-modal';
    modal.innerHTML = `
        <div class="schedule-overlay" onclick="closeScheduleModal()"></div>
        <div class="schedule-content">
            <button class="schedule-close" onclick="closeScheduleModal()">&times;</button>
            <h2>📅 Schedule</h2>

            <div class="schedule-section">
                <h3>⏰ Upcoming &amp; Overdue Reminders</h3>
                ${upcoming.length ? upcoming.map(e => renderScheduleEvent(e, true, today)).join('') : '<p class="schedule-empty">Nothing scheduled — add a reminder to get started.</p>'}
            </div>

            <div class="schedule-section">
                <h3>📜 History</h3>
                ${history.length ? history.map(e => renderScheduleEvent(e, false, today)).join('') : '<p class="schedule-empty">No history yet.</p>'}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        const overlay = modal.querySelector('.schedule-overlay');
        if (overlay) overlay.style.opacity = '1';
    }, 10);
}

function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) modal.remove();
}

function completeReminderFromSchedule(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = true;
        saveReminders();
        openScheduleModal();
        showNotification('✅ Reminder completed');
    }
}

// ===== FEEDING SCHEDULE (editable) =====
function openFeedingScheduleModal() {
    const existingModal = document.getElementById('feedingScheduleModal');
    if (existingModal) existingModal.remove();

    const sortedSlots = [...feedingSchedule].sort((a, b) => a.time.localeCompare(b.time));

    const modal = document.createElement('div');
    modal.id = 'feedingScheduleModal';
    modal.className = 'schedule-modal';
    modal.innerHTML = `
        <div class="schedule-overlay" onclick="closeFeedingScheduleModal()"></div>
        <div class="schedule-content">
            <button class="schedule-close" onclick="closeFeedingScheduleModal()">&times;</button>
            <h2>🍽️ Feeding Schedule</h2>
            <div class="schedule-section">
                ${sortedSlots.length ? sortedSlots.map(slot => `
                    <div class="schedule-item" style="border-left-color:#f39c12">
                        <div class="schedule-item-icon">🍽️</div>
                        <div class="schedule-item-body">
                            <div class="schedule-item-title">${slot.time} — ${slot.label}</div>
                            ${slot.note ? `<div class="schedule-item-subtitle">${slot.note}</div>` : ''}
                        </div>
                        <button class="schedule-icon-btn schedule-edit-btn" onclick="editFeedingSlot(${slot.id})" title="Edit">✏️</button>
                        <button class="schedule-icon-btn schedule-delete-btn" onclick="deleteFeedingSlot(${slot.id})" title="Delete">🗑️</button>
                    </div>
                `).join('') : '<p class="schedule-empty">No feeding times set.</p>'}
            </div>
            <button class="schedule-add-btn" id="addFeedingSlotBtn">+ Add Feeding Time</button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('addFeedingSlotBtn').addEventListener('click', addFeedingSlot);
}

function closeFeedingScheduleModal() {
    const modal = document.getElementById('feedingScheduleModal');
    if (modal) modal.remove();
}

function addFeedingSlot() {
    const time = prompt('Time (24-hour, e.g. 07:00):', '07:00');
    if (!time) return;
    const label = prompt('Label:', 'Normal Feed');
    if (!label) return;
    const note = prompt('Note (e.g. "Probiotic") — leave blank if none:', '');

    feedingSchedule.push({
        id: Date.now(),
        time: time,
        label: label,
        note: note || ''
    });
    saveFeedingSchedule();
    openFeedingScheduleModal();
    showNotification('🍽️ Feeding time added');
}

function editFeedingSlot(id) {
    const slot = feedingSchedule.find(s => s.id === id);
    if (!slot) return;

    const time = prompt('Time (24-hour, e.g. 07:00):', slot.time);
    if (!time) return;
    const label = prompt('Label:', slot.label);
    if (!label) return;
    const note = prompt('Note — leave blank if none:', slot.note || '');

    slot.time = time;
    slot.label = label;
    slot.note = note || '';
    saveFeedingSchedule();
    openFeedingScheduleModal();
    showNotification('✏️ Feeding time updated');
}

function deleteFeedingSlot(id) {
    if (!confirm('Remove this feeding time?')) return;
    feedingSchedule = feedingSchedule.filter(s => s.id !== id);
    saveFeedingSchedule();
    openFeedingScheduleModal();
    showNotification('🗑️ Feeding time removed');
}

const scheduleStyle = document.createElement('style');
scheduleStyle.textContent = `
    .schedule-modal {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 40px 20px;
        animation: fadeIn 0.3s ease;
    }
    .schedule-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
    }
    .schedule-content {
        position: relative;
        z-index: 1;
        background: linear-gradient(145deg, #173832, #0f221e);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 20px;
        padding: 30px;
        max-width: 600px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease;
    }
    .schedule-content h2 {
        font-size: 1.8em;
        font-weight: 600;
        margin-bottom: 20px;
        color: #f2b155;
    }
    .schedule-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: #e0e0e0;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 1.3em;
        cursor: pointer;
    }
    .schedule-close:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    .schedule-section {
        margin-bottom: 28px;
    }
    .schedule-section h3 {
        font-size: 1.05em;
        color: #cbb896;
        margin-bottom: 12px;
        font-weight: 600;
    }
    .schedule-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-left: 3px solid #f2b155;
        border-radius: 10px;
        padding: 12px 14px;
        margin-bottom: 8px;
    }
    .schedule-item-icon {
        font-size: 1.3em;
        line-height: 1;
    }
    .schedule-item-body {
        flex: 1;
        min-width: 0;
    }
    .schedule-item-title {
        font-weight: 500;
        color: #e0e0e0;
    }
    .schedule-item-subtitle {
        color: #8fa39a;
        font-size: 0.85em;
        margin-top: 2px;
    }
    .schedule-item-date {
        color: #f2b155;
        font-size: 0.78em;
        margin-top: 4px;
    }
    .schedule-overdue {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.75em;
        margin-left: 6px;
    }
    .schedule-complete-btn {
        background: rgba(46, 204, 113, 0.2);
        border: 1px solid rgba(46, 204, 113, 0.4);
        color: #2ecc71;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.9em;
        flex-shrink: 0;
    }
    .schedule-complete-btn:hover {
        background: rgba(46, 204, 113, 0.35);
    }
    .schedule-empty {
        color: #8fa39a;
        font-size: 0.9em;
    }
    .schedule-icon-btn {
        border: 1px solid rgba(255, 255, 255, 0.15);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 0.85em;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.06);
        color: #e0e0e0;
    }
    .schedule-edit-btn:hover {
        background: rgba(100, 181, 246, 0.2);
        border-color: rgba(100, 181, 246, 0.4);
    }
    .schedule-delete-btn:hover {
        background: rgba(231, 76, 60, 0.2);
        border-color: rgba(231, 76, 60, 0.4);
    }
    .schedule-add-btn {
        width: 100%;
        padding: 12px;
        margin-top: 6px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.05);
        color: #e0e0e0;
        cursor: pointer;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9em;
        font-weight: 500;
        transition: all 0.3s;
    }
    .schedule-add-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 16px;
    }
    .stats-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 14px 10px;
        text-align: center;
    }
    .stats-value {
        font-size: 1.4em;
        font-weight: 700;
        color: #f2b155;
    }
    .stats-label {
        font-size: 0.75em;
        color: #8fa39a;
        margin-top: 2px;
    }
    .stats-sublist {
        margin-bottom: 16px;
    }
    .stats-sublist-title {
        color: #cbb896;
        font-weight: 600;
        font-size: 0.9em;
        margin-bottom: 8px;
    }
    .stats-row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 0.88em;
        color: #e0e0e0;
    }
    .stats-warn {
        color: #e74c3c;
        font-weight: 600;
    }
    .stats-sparkline {
        width: 100%;
        height: 60px;
        margin-bottom: 12px;
    }
    .schedule-form {
        margin-bottom: 16px;
    }
    .schedule-form label {
        display: block;
        margin-bottom: 14px;
        color: #cbb896;
        font-size: 0.9em;
        font-weight: 500;
    }
    .schedule-form input {
        width: 100%;
        padding: 10px 14px;
        margin-top: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        color: #e0e0e0;
        font-family: 'Poppins', sans-serif;
        font-size: 0.95em;
        transition: all 0.3s;
    }
    .schedule-form input:focus {
        outline: none;
        border-color: #e8935a;
        background: rgba(255, 255, 255, 0.08);
    }
    .trend-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 10px;
        margin: 12px 0 16px;
    }
    .trend-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 14px;
    }
    .trend-card-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.88em;
        color: #cbb896;
        font-weight: 600;
        margin-bottom: 6px;
    }
    .trend-sparkline {
        width: 100%;
        height: 44px;
        margin-bottom: 0;
        display: block;
    }
    .trend-no-data {
        color: #8fa39a;
        font-size: 0.78em;
    }
`;
document.head.appendChild(scheduleStyle);

const scheduleBtn = document.createElement('button');
scheduleBtn.textContent = '📅 Schedule';
scheduleBtn.onclick = openScheduleModal;
scheduleBtn.style.cssText = `
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
scheduleBtn.addEventListener('mouseenter', () => {
    scheduleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
});
scheduleBtn.addEventListener('mouseleave', () => {
    scheduleBtn.style.background = 'rgba(255, 255, 255, 0.05)';
});

document.querySelector('.top-buttons').appendChild(scheduleBtn);

const feedingScheduleBtn = document.createElement('button');
feedingScheduleBtn.textContent = '🍽️ Feeding Schedule';
feedingScheduleBtn.onclick = openFeedingScheduleModal;
feedingScheduleBtn.style.cssText = `
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
feedingScheduleBtn.addEventListener('mouseenter', () => {
    feedingScheduleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
});
feedingScheduleBtn.addEventListener('mouseleave', () => {
    feedingScheduleBtn.style.background = 'rgba(255, 255, 255, 0.05)';
});

document.querySelector('.top-buttons').appendChild(feedingScheduleBtn);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('scheduleModal')) closeScheduleModal();
    if (e.key === 'Escape' && document.getElementById('feedingScheduleModal')) closeFeedingScheduleModal();
});

// ===== INITIALIZE EVERYTHING =====
function init() {
    const configured = typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';

    if (configured) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        db.enablePersistence({ synchronizeTabs: true }).catch(err => {
            console.warn('Firestore offline persistence unavailable:', err.code);
        });
        initFirestoreSync();
        console.log('☁️ Synced with Firebase — shared across all devices with the link');
    } else {
        loadLocalFallback();
        renderFish();
        updateStats();
        console.log('💾 Firebase not configured — saving to this browser only. See firebase-config.js');
    }

    // Check reminders on startup
    setTimeout(checkReminders, 1000);

    // Check reminders every hour
    setInterval(checkReminders, 3600000);

    console.log('🐟 Jai\'s Koi Manager Ready!');
    console.log(`⌨️ Shortcuts: Ctrl+F = Search, Ctrl+N = New Fish, Esc = Close`);
}

// Start the app
init();