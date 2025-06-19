// Konfigurasi JSONBin.io
const BIN_ID = '68542d8b8561e97a5027485f';
const API_KEY = '$2a$10$kI38r2sqJ71/zzWqKkuztu.FAEx3jKDQE3HspuLBhdPlEdAXELAoq';
const API_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// Fungsi untuk memuat data member dari JSONBin.io
async function loadMembers() {
    try {
        const response = await fetch(API_URL, {
            headers: {
                'X-Master-Key': API_KEY
            }
        });
        const data = await response.json();
        return data.record.members || [];
    } catch (error) {
        console.error('Error loading members:', error);
        return [];
    }
}

// Fungsi untuk menyimpan data member ke JSONBin.io
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
        console.error('Error saving members:', error);
    }
}

// Fungsi untuk menampilkan profil member
function displayMemberProfile(member) {
    document.getElementById('member-name').textContent = member.name;
    document.getElementById('member-id').textContent = member.id;
    document.getElementById('member-points').textContent = member.points || 0;
    document.getElementById('member-address').textContent = member.address;
    document.getElementById('member-phone').textContent = member.phone;
    document.getElementById('member-photo').src = member.photo || 'https://via.placeholder.com/150';
    
    document.querySelector('.member-profile').classList.remove('hidden');
}

// Inisialisasi QR Scanner
function initQRScanner() {
    const qrReader = new QrScanner(
        document.getElementById('qr-reader'),
        result => {
            const memberId = result;
            findMemberById(memberId);
        },
        {
            highlightScanRegion: true,
            highlightCodeOutline: true,
        }
    );
    
    qrReader.start();
    
    // Tombol scan QR di form tambah member
    if (document.getElementById('scan-qr')) {
        document.getElementById('scan-qr').addEventListener('click', () => {
            qrReader.start();
        });
    }
}

// Cari member berdasarkan ID
async function findMemberById(id) {
    const members = await loadMembers();
    const member = members.find(m => m.id === id);
    
    if (member) {
        displayMemberProfile(member);
    } else {
        alert('Member tidak ditemukan');
    }
}

// Tambahkan poin ke member
async function addPointToMember() {
    const memberId = document.getElementById('member-id').textContent;
    const members = await loadMembers();
    const memberIndex = members.findIndex(m => m.id === memberId);
    
    if (memberIndex !== -1) {
        members[memberIndex].points = (members[memberIndex].points || 0) + 1;
        await saveMembers(members);
        displayMemberProfile(members[memberIndex]);
        alert('Poin berhasil ditambahkan!');
    }
}

// Handle form tambah member
async function handleMemberFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const address = document.getElementById('address').value;
    const phone = document.getElementById('phone').value;
    const qrCode = document.getElementById('qr-code').value;
    const photoFile = document.getElementById('photo').files[0];
    
    // Konversi foto ke base64
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
    members.push(newMember);
    await saveMembers(members);
    
    alert('Member berhasil ditambahkan!');
    window.location.href = 'index.html';
}

// Konversi file ke base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Preview foto saat dipilih
function setupPhotoPreview() {
    const photoInput = document.getElementById('photo');
    const photoPreview = document.getElementById('photo-preview');
    
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

// Inisialisasi halaman
document.addEventListener('DOMContentLoaded', function() {
    // Halaman utama
    if (document.getElementById('qr-reader')) {
        initQRScanner();
        
        // Tombol tambah poin
        document.getElementById('add-point').addEventListener('click', addPointToMember);
    }
    
    // Halaman tambah member
    if (document.getElementById('member-form')) {
        setupPhotoPreview();
        document.getElementById('member-form').addEventListener('submit', handleMemberFormSubmit);
    }
});
