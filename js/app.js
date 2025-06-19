// ==============================================
// KONFIGURASI UTAMA (HARAP DIISI)
// ==============================================
const BIN_ID = '68542d8b8561e97a5027485f';      // Contoh: '65a1a1a1a1a1a1a1a1a1a1a1'
const API_KEY = '$2a$10$kI38r2sqJ71/zzWqKkuztu.FAEx3jKDQE3HspuLBhdPlEdAXELAoq';    // Contoh: '$2a$10$xyz123...'
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ==============================================
// INISIALISAI VARIABEL GLOBAL
// ==============================================
let scannerActive = false;
let mediaStream = null;
let scanInterval = null;

// ==============================================
// FUNGSI UTAMA SCANNER QR
// ==============================================

// Untuk halaman Scan Member (index.html)
async function startScanner() {
    try {
        // Dapatkan akses kamera
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        // Tampilkan video preview
        const videoElement = document.getElementById('preview');
        videoElement.srcObject = mediaStream;
        videoElement.play();
        
        // Tampilkan scanner dan sembunyikan tombol start
        document.getElementById('scanner-container').style.display = 'block';
        document.getElementById('start-scanner').style.display = 'none';
        document.getElementById('scan-status').textContent = "Scanning... Arahkan ke QR Code member";
        
        // Mulai proses scanning
        scannerActive = true;
        scanInterval = setInterval(scanQRCode, 300);
        
    } catch (error) {
        console.error("Error mengakses kamera:", error);
        document.getElementById('scan-status').textContent = "Error: " + error.message;
        showManualFallback();
    }
}

// Untuk halaman Tambah Member (add-member.html)
async function startAddMemberScanner() {
    try {
        // Sembunyikan tombol start, tampilkan scanner
        document.getElementById('start-scanner').style.display = 'none';
        document.getElementById('scanner-container').style.display = 'block';
        
        // Dapatkan akses kamera
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        const videoElement = document.getElementById('preview');
        videoElement.srcObject = mediaStream;
        videoElement.play();
        
        scannerActive = true;
        document.getElementById('scan-status').textContent = "Scanning... Arahkan ke QR Code";
        
        // Mulai proses scanning
        scanInterval = setInterval(scanAddMemberQR, 300);
        
    } catch (error) {
        console.error("Scanner error:", error);
        document.getElementById('scan-status').textContent = "Error: " + error.message;
        document.getElementById('start-scanner').style.display = 'block';
    }
}

function stopScanner() {
    scannerActive = false;
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    document.getElementById('scanner-container').style.display = 'none';
    document.getElementById('start-scanner').style.display = 'block';
    document.getElementById('scan-status').textContent = "Scanner dihentikan";
}

// ==============================================
// FUNGSI PROSES SCANNING
// ==============================================

function scanQRCode() {
    if (!scannerActive) return;
    
    try {
        const videoElement = document.getElementById('preview');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            document.getElementById('scan-status').textContent = "Member ditemukan! Memproses...";
            stopScanner();
            findMemberById(code.data);
        }
    } catch (error) {
        console.error("Scan error:", error);
    }
}

function scanAddMemberQR() {
    if (!scannerActive) return;
    
    try {
        const videoElement = document.getElementById('preview');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        if (code) {
            document.getElementById('qr-code').value = code.data;
            stopScanner();
            document.getElementById('scan-status').textContent = "QR Code berhasil dibaca";
        }
    } catch (error) {
        console.error("Scan error:", error);
    }
}

// ==============================================
// FUNGSI MANUAL FALLBACK
// ==============================================

function showManualFallback() {
    const fallbackElement = document.querySelector('.manual-fallback');
    if (fallbackElement) {
        fallbackElement.style.display = 'block';
    }
}

function manualSearch() {
    const memberId = document.getElementById('manual-input').value.trim();
    if (!memberId) {
        alert("Harap masukkan ID Member");
        return;
    }
    findMemberById(memberId);
}

// ==============================================
// FUNGSI MEMBER
// ==============================================

async function findMemberById(memberId) {
    try {
        document.getElementById('scan-status').textContent = "Mencari member...";
        
        const members = await loadMembers();
        const member = members.find(m => m.id === memberId);
        
        if (member) {
            displayMemberProfile(member);
            document.getElementById('scan-status').textContent = "Member ditemukan: " + memberId;
        } else {
            document.getElementById('scan-status').textContent = "Member tidak ditemukan";
            alert("Member dengan ID " + memberId + " tidak ditemukan");
            startScanner(); // Mulai ulang scanner
        }
    } catch (error) {
        console.error("Error mencari member:", error);
        document.getElementById('scan-status').textContent = "Error mencari member";
        alert("Terjadi error saat mencari member");
    }
}

function displayMemberProfile(member) {
    document.getElementById('member-name').textContent = member.name;
    document.getElementById('member-id').textContent = member.id;
    document.getElementById('member-points').textContent = member.points || 0;
    document.getElementById('member-address').textContent = member.address;
    document.getElementById('member-phone').textContent = member.phone;
    document.getElementById('member-photo').src = member.photo || 'https://via.placeholder.com/150';
    
    document.querySelector('.member-profile').classList.remove('hidden');
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
            alert("Poin berhasil ditambahkan!");
        }
    } catch (error) {
        console.error("Error menambah poin:", error);
        alert("Gagal menambahkan poin");
    }
}

// ==============================================
// FUNGSI FOTO MEMBER
// ==============================================

function setupPhotoPreview() {
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');
    
    if (photoInput && photoPreview) {
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
}

async function getPhotoBase64() {
    const photoFile = document.getElementById('photo').files[0];
    if (!photoFile) return null;
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(photoFile);
    });
}

// ==============================================
// FUNGSI DATABASE
// ==============================================

async function loadMembers() {
    try {
        const response = await fetch(API_URL, {
            headers: { 'X-Master-Key': API_KEY }
        });
        const data = await response.json();
        return data.record.members || [];
    } catch (error) {
        console.error("Error memuat member:", error);
        alert("Gagal memuat data member");
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
        console.error("Error menyimpan member:", error);
        alert("Gagal menyimpan data member");
    }
}

// ==============================================
// FUNGSI FORM TAMBAH MEMBER
// ==============================================

async function handleMemberFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const address = document.getElementById('address').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const qrCode = document.getElementById('qr-code').value.trim();
    const photoFile = document.getElementById('photo').files[0];
    
    // Validasi
    if (!name || !address || !phone || !qrCode || !photoFile) {
        alert("Harap isi semua field yang wajib diisi");
        return;
    }
    
    try {
        // Konversi foto ke base64
        const photo = await getPhotoBase64();
        
        // Buat objek member baru
        const newMember = {
            id: qrCode,
            name,
            address,
            phone,
            photo,
            points: 0,
            joinDate: new Date().toISOString()
        };
        
        // Simpan ke database
        const members = await loadMembers();
        
        // Cek duplikasi ID
        if (members.some(m => m.id === qrCode)) {
            alert("ID Member sudah digunakan");
            return;
        }
        
        members.push(newMember);
        await saveMembers(members);
        
        alert("Member berhasil ditambahkan!");
        window.location.href = "index.html";
        
    } catch (error) {
        console.error("Error menambah member:", error);
        alert("Gagal menambahkan member: " + error.message);
    }
}

// ==============================================
// INISIALISAI HALAMAN
// ==============================================

function initIndexPage() {
    // Tombol scanner untuk halaman utama
    document.getElementById('start-scanner')?.addEventListener('click', startScanner);
    document.getElementById('stop-scanner')?.addEventListener('click', stopScanner);
    document.getElementById('manual-submit')?.addEventListener('click', manualSearch);
    document.getElementById('add-point')?.addEventListener('click', addPointToMember);
}

function initAddMemberPage() {
    // Setup form tambah member
    setupPhotoPreview();
    document.getElementById('member-form')?.addEventListener('submit', handleMemberFormSubmit);
    document.getElementById('start-scanner')?.addEventListener('click', startAddMemberScanner);
    document.getElementById('stop-scanner')?.addEventListener('click', stopScanner);
}

document.addEventListener('DOMContentLoaded', function() {
    // Deteksi halaman yang sedang aktif
    if (document.getElementById('member-form')) {
        initAddMemberPage(); // Halaman tambah member
    } else {
        initIndexPage(); // Halaman utama
    }
});