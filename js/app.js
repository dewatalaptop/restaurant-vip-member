// ==============================================
// KONFIGURASI
// ==============================================
const BIN_ID = '68542d8b8561e97a5027485f';      // Ganti dengan bin ID Anda
const API_KEY = '$2a$10$kI38r2sqJ71/zzWqKkuztu.FAEx3jKDQE3HspuLBhdPlEdAXELAoq';    // Ganti dengan API key Anda
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ==============================================
// ELEMEN DOM
// ==============================================
const videoElement = document.getElementById('preview');
const scanStatus = document.getElementById('scan-status');
const scannerContainer = document.getElementById('scanner-container');
const manualFallback = document.querySelector('.manual-fallback');

// ==============================================
// VARIABEL STATE
// ==============================================
let scannerActive = false;
let mediaStream = null;
let scanInterval = null;

// ==============================================
// INISIALISASI SCANNER
// ==============================================
document.getElementById('start-scanner').addEventListener('click', startScanner);
document.getElementById('stop-scanner').addEventListener('click', stopScanner);
document.getElementById('manual-submit').addEventListener('click', manualSearch);

async function startScanner() {
    try {
        // Cek permission kamera
        if (!hasCameraPermission()) {
            scanStatus.textContent = "Izinkan akses kamera untuk memulai scan";
            showManualFallback();
            return;
        }

        // Dapatkan stream kamera
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        // Setup video element
        videoElement.srcObject = mediaStream;
        videoElement.play();
        
        // Tampilkan scanner
        scannerContainer.style.display = 'block';
        document.getElementById('start-scanner').style.display = 'none';
        scannerActive = true;
        scanStatus.textContent = "Scanning... Arahkan ke QR Code member";
        
        // Mulai scanning loop
        scanInterval = setInterval(scanQRCode, 300);
        
    } catch (error) {
        console.error("Error starting scanner:", error);
        scanStatus.textContent = "Gagal mengakses kamera: " + error.message;
        showManualFallback();
    }
}

function stopScanner() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    scannerActive = false;
    scannerContainer.style.display = 'none';
    document.getElementById('start-scanner').style.display = 'block';
    scanStatus.textContent = "Scanner dihentikan";
}

// ==============================================
// FUNGSI SCANNING
// ==============================================
function scanQRCode() {
    if (!scannerActive) return;
    
    try {
        // Buat canvas temporer
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set ukuran canvas sesuai video
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        // Gambar frame video ke canvas
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        // Dapatkan image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Scan QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        // Jika QR code ditemukan
        if (code) {
            scanStatus.textContent = "Member ditemukan! Memproses...";
            stopScanner();
            findMemberById(code.data);
        }
        
    } catch (error) {
        console.error("Scan error:", error);
        // Lanjut scanning meski ada error
    }
}

// ==============================================
// MANUAL FALLBACK
// ==============================================
function showManualFallback() {
    manualFallback.style.display = 'block';
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
        scanStatus.textContent = "Mencari member...";
        
        const members = await loadMembers();
        const member = members.find(m => m.id === memberId);
        
        if (member) {
            displayMemberProfile(member);
            scanStatus.textContent = "Member ditemukan: " + memberId;
        } else {
            scanStatus.textContent = "Member tidak ditemukan";
            alert("Member dengan ID " + memberId + " tidak ditemukan");
            startScanner(); // Mulai ulang scanner
        }
    } catch (error) {
        console.error("Error finding member:", error);
        scanStatus.textContent = "Error mencari member";
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
        console.error("Error adding point:", error);
        alert("Gagal menambahkan poin");
    }
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
        console.error("Error loading members:", error);
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
        console.error("Error saving members:", error);
        alert("Gagal menyimpan data member");
    }
}

// ==============================================
// UTILITAS
// ==============================================
function hasCameraPermission() {
    // Implementasi sederhana untuk cek permission
    // Di beberapa browser mungkin tidak berfungsi
    return true;
}

// Event listener untuk tombol tambah poin
document.getElementById('add-point')?.addEventListener('click', addPointToMember);

// Inisialisasi awal
document.addEventListener('DOMContentLoaded', function() {
    // Cek apakah di halaman scan
    if (document.getElementById('start-scanner')) {
        // Coba langsung start scanner di beberapa device
        // startScanner();
    }
});