// ==============================================
// CONFIGURATION
// ==============================================
const BIN_ID = '68542d8b8561e97a5027485f';      // Replace with your JSONBin.io bin ID
const API_KEY = '$2a$10$kI38r2sqJ71/zzWqKkuztu.FAEx3jKDQE3HspuLBhdPlEdAXELAoq';    // Replace with your JSONBin.io X-Master-Key
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ==============================================
// QR SCANNER SETUP
// ==============================================
let html5QrCode;
let currentCameraId;

async function initQRScanner() {
    try {
        // Clear previous scanner if exists
        if (html5QrCode) {
            html5QrCode.clear();
        }

        // Create new scanner instance
        html5QrCode = new Html5Qrcode("qr-reader");
        
        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length === 0) {
            throw "No cameras found";
        }

        // Use back camera by default if available
        currentCameraId = cameras.find(cam => cam.label.includes("back"))?.id || cameras[0].id;
        
        // Start scanning
        await html5QrCode.start(
            currentCameraId,
            {
                fps: 10,                        // Lower FPS for better performance
                qrbox: { width: 250, height: 250 }, // Smaller scan area for better accuracy
                facingMode: "environment"        // Prefer rear camera
            },
            qrCodeMessage => {
                // Success callback
                handleScannedQR(qrCodeMessage);
            },
            errorMessage => {
                // Error callback
                console.log(`QR Error: ${errorMessage}`);
            }
        ).catch(err => {
            console.error("Scanner start error:", err);
            showAlert("Gagal memulai scanner: " + err);
        });

        // Setup camera toggle button if exists
        const toggleBtn = document.getElementById('toggle-camera');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleCamera);
        }

    } catch (error) {
        console.error("Scanner init failed:", error);
        showAlert("Error scanner: " + error);
        
        // Fallback to manual input if scanner fails
        setupManualInputFallback();
    }
}

async function toggleCamera() {
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length < 2) {
            showAlert("Hanya 1 kamera tersedia");
            return;
        }

        // Find next camera
        const currentIndex = cameras.findIndex(cam => cam.id === currentCameraId);
        const nextIndex = (currentIndex + 1) % cameras.length;
        currentCameraId = cameras[nextIndex].id;

        // Restart scanner with new camera
        await html5QrCode.stop();
        await initQRScanner();
        
    } catch (error) {
        console.error("Camera toggle error:", error);
        showAlert("Gagal ganti kamera");
    }
}

function handleScannedQR(qrData) {
    // Stop scanner after successful scan
    html5QrCode.stop().catch(console.error);
    
    // Process the scanned data
    if (qrData) {
        findMemberById(qrData.trim()); // Trim whitespace from QR code
    }
}

function setupManualInputFallback() {
    const scanSection = document.querySelector('.scanner-section');
    if (!scanSection) return;

    scanSection.innerHTML += `
        <div class="manual-fallback">
            <p class="error-message">Scanner tidak tersedia</p>
            <div class="form-group">
                <label for="manual-qr-input">Masukkan ID Member secara manual:</label>
                <input type="text" id="manual-qr-input" placeholder="VIP123456">
                <button id="manual-submit" class="btn-secondary">Cari Member</button>
            </div>
        </div>
    `;

    document.getElementById('manual-submit').addEventListener('click', () => {
        const manualId = document.getElementById('manual-qr-input').value;
        if (manualId) {
            findMemberById(manualId);
        } else {
            showAlert("Harap masukkan ID Member");
        }
    });
}

// ==============================================
// MEMBER SYSTEM FUNCTIONS
// ==============================================
async function loadMembers() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        return data.record.members || [];
    } catch (error) {
        console.error("Load members error:", error);
        showAlert("Gagal memuat data member");
        return [];
    }
}

async function saveMembers(members) {
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_KEY
            },
            body: JSON.stringify({ members })
        });
        return await response.json();
    } catch (error) {
        console.error("Save members error:", error);
        showAlert("Gagal menyimpan data member");
    }
}

async function findMemberById(memberId) {
    try {
        const members = await loadMembers();
        const member = members.find(m => m.id === memberId);
        
        if (member) {
            displayMemberProfile(member);
        } else {
            showAlert(`Member dengan ID ${memberId} tidak ditemukan`);
        }
    } catch (error) {
        console.error("Find member error:", error);
        showAlert("Error mencari member");
    }
}

function displayMemberProfile(member) {
    document.getElementById('member-name').textContent = member.name;
    document.getElementById('member-id').textContent = member.id;
    document.getElementById('member-points').textContent = member.points || 0;
    document.getElementById('member-address').textContent = member.address;
    document.getElementById('member-phone').textContent = member.phone;
    document.getElementById('member-photo').src = member.photo || 'https://via.placeholder.com/150';
    
    // Show profile section
    document.querySelector('.member-profile').classList.remove('hidden');
    
    // Scroll to profile
    document.querySelector('.member-profile').scrollIntoView({ behavior: 'smooth' });
}

async function addPointToMember() {
    const memberId = document.getElementById('member-id').textContent;
    if (!memberId) return;

    try {
        const members = await loadMembers();
        const memberIndex = members.findIndex(m => m.id === memberId);
        
        if (memberIndex !== -1) {
            members[memberIndex].points = (members[memberIndex].points || 0) + 1;
            await saveMembers(members);
            displayMemberProfile(members[memberIndex]);
            showAlert("Poin berhasil ditambahkan!", "success");
        }
    } catch (error) {
        console.error("Add point error:", error);
        showAlert("Gagal menambah poin");
    }
}

// ==============================================
// NEW MEMBER FORM (for add-member.html)
// ==============================================
async function handleMemberFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const qrCode = document.getElementById('qr-code').value;
    const photoFile = document.getElementById('photo').files[0];

    if (!name || !address || !phone || !qrCode || !photoFile) {
        showAlert("Harap isi semua field");
        return;
    }

    try {
        // Convert photo to base64
        const photo = await fileToBase64(photoFile);
        
        const newMember = {
            id: qrCode,
            name,
            address,
            phone,
            photo,
            points: 0,
            joinDate: new Date().toISOString()
        };
        
        const members = await loadMembers();
        
        // Check if member ID already exists
        if (members.some(m => m.id === qrCode)) {
            showAlert("ID Member sudah terdaftar");
            return;
        }
        
        members.push(newMember);
        await saveMembers(members);
        
        showAlert("Member berhasil ditambahkan!", "success");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error("Add member error:", error);
        showAlert("Gagal menambah member");
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function setupPhotoPreview() {
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');
    
    if (!photoInput || !photoPreview) return;
    
    photoInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                photoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview Foto">`;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================
function showAlert(message, type = "error") {
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    
    document.body.appendChild(alertBox);
    
    setTimeout(() => {
        alertBox.classList.add('fade-out');
        setTimeout(() => alertBox.remove(), 500);
    }, 3000);
}

// ==============================================
// INITIALIZATION
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize scanner on main page
    if (document.getElementById('qr-reader')) {
        initQRScanner();
        
        // Add point button
        document.getElementById('add-point')?.addEventListener('click', addPointToMember);
    }
    
    // Initialize member form on add-member page
    if (document.getElementById('member-form')) {
        setupPhotoPreview();
        document.getElementById('member-form').addEventListener('submit', handleMemberFormSubmit);
        
        // Setup QR scan button
        document.getElementById('scan-qr')?.addEventListener('click', async () => {
            try {
                await initQRScanner();
                showAlert("Arahkan kamera ke QR Code member", "info");
            } catch (error) {
                showAlert("Gagal memulai scanner");
            }
        });
    }
});