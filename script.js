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

function metaSnapshotToState(metaData) {
    pondSections = (metaData && metaData.pondSections) || [
        { id: 1, name: 'Main Pond', capacity: 50, notes: '' },
        { id: 2, name: 'Quarantine Tank', capacity: 10, notes: '' }
    ];
    waterLogs = (metaData && metaData.waterLogs) || [];
    reminders = (metaData && metaData.reminders) || [];
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
        batch.set(db.collection('meta').doc('shared'), { pondSections, waterLogs, reminders });
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
    pondSections = JSON.parse(localStorage.getItem('jaiKoiPondSections') || 'null') || [
        { id: 1, name: 'Main Pond', capacity: 50, notes: '' },
        { id: 2, name: 'Quarantine Tank', capacity: 10, notes: '' }
    ];
    breedingRecords = JSON.parse(localStorage.getItem('jaiKoiBreedingRecords') || '[]');
    competitionRecords = JSON.parse(localStorage.getItem('jaiKoiCompetitionRecords') || '[]');
    costRecords = JSON.parse(localStorage.getItem('jaiKoiCostRecords') || '[]');
    reminders = JSON.parse(localStorage.getItem('jaiKoiReminders') || '[]');
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

    const date = prompt('Date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (!date) return;

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

function ensureDailyWaterReminder() {
    const today = new Date().toISOString().split('T')[0];
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

function checkReminders() {
    ensureDailyWaterReminder();
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

// ===== SCHEDULE / CALENDAR =====
const SCHEDULE_EVENT_META = {
    reminder: { icon: '📅', color: '#64b5f6' },
    concern: { icon: '🚨', color: '#e74c3c' },
    health: { icon: '🏥', color: '#2ecc71' },
    feeding: { icon: '🍽️', color: '#f39c12' },
    water: { icon: '💧', color: '#00bcd4' },
    added: { icon: '🐟', color: '#8899aa' }
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

    const today = new Date().toISOString().split('T')[0];
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
        background: linear-gradient(145deg, #132f4c, #0d2137);
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
        color: #64b5f6;
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
        color: #b0c4de;
        margin-bottom: 12px;
        font-weight: 600;
    }
    .schedule-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-left: 3px solid #64b5f6;
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
        color: #8899aa;
        font-size: 0.85em;
        margin-top: 2px;
    }
    .schedule-item-date {
        color: #64b5f6;
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
        color: #8899aa;
        font-size: 0.9em;
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

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('scheduleModal')) closeScheduleModal();
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