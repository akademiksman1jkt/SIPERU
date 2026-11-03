const SUPABASE_URL = "https://efdtnmjrtrnavejtfmqz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2AcfpZKrqfDJxwR04B1USg_giYJA_1q";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tanggal Otomatis Hari Ini
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let isAdminLoggedIn = false;
let localRooms = [];
let localReservations = [];

// Clock Realtime WIB
setInterval(() => {
    const now = new Date();
    document.getElementById('clockWIB').innerText = now.toLocaleTimeString('id-ID');
}, 1000);

window.addEventListener('DOMContentLoaded', async () => {
    await fetchRooms();
    await fetchReservations();
    renderCalendar();
});

function switchView(viewName) {
    ['agenda', 'katalog', 'pinjam', 'admin'].forEach(v => {
        document.getElementById(`view-${v}`).style.display = 'none';
        const btn = document.getElementById(`nav-${v}`);
        if (btn) btn.classList.remove('active');
    });

    document.getElementById(`view-${viewName}`).style.display = 'block';
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) activeBtn.classList.add('active');

    if (viewName === 'admin' && !isAdminLoggedIn) {
        toggleAdminModal();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

async function fetchRooms() {
    try {
        const { data, error } = await supabaseClient.from('rooms').select('*');
        if (error) throw error;
        localRooms = data || [];
        renderRoomsCatalog();
        populateRoomSelectOptions();
    } catch (err) {
        console.error("Error rooms:", err.message);
    }
}

async function fetchReservations() {
    try {
        const { data, error } = await supabaseClient
            .from('reservations')
            .select('*, rooms(nama_ruangan)');
        if (error) throw error;
        localReservations = data || [];
        renderCalendar();
        if (isAdminLoggedIn) renderAdminTable();
    } catch (err) {
        console.error("Error reservations:", err.message);
    }
}

function renderRoomsCatalog() {
    const container = document.getElementById('roomsCatalogGrid');
    if (localRooms.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center;">Belum ada data ruangan.</div>';
        return;
    }
    container.innerHTML = localRooms.map(r => `
        <div class="room-card">
            <div class="room-card-header">
                <span>${r.nama_ruangan}</span>
                <span class="room-badge">${r.kategori}</span>
            </div>
            <div class="room-body">
                <p style="margin-bottom: 8px;"><strong>Kapasitas:</strong> ${r.kapasitas} Orang</p>
                <p><strong>Fasilitas:</strong> ${r.fasilitas}</p>
            </div>
            <div class="room-card-footer">
                <button onclick="selectRoomForBooking(${r.id})" class="btn-official" style="width: 100%;">AJUKAN PEMINJAMAN</button>
            </div>
        </div>
    `).join('');
}

function populateRoomSelectOptions() {
    const select = document.getElementById('formRoomId');
    select.innerHTML = '<option value="">-- Pilih Ruangan --</option>' + 
        localRooms.map(r => `<option value="${r.id}">${r.nama_ruangan}</option>`).join('');
}

function selectRoomForBooking(id) {
    document.getElementById('formRoomId').value = id;
    switchView('pinjam');
}

// Render Grid Kalender dengan Event Klik Sel
// Render Grid Kalender Modern
function renderCalendar() {
    const tbody = document.getElementById('calendarGridBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calendarMonthYear').innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const realToday = new Date();
    const isCurrentMonthReal = (realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth);

    let dayCounter = 1;
    let html = '';

    for (let row = 0; row < 6; row++) {
        let rowHtml = '<tr>';
        let hasDaysInRow = false;

        for (let col = 0; col < 7; col++) {
            if ((row === 0 && col < firstDay) || dayCounter > daysInMonth) {
                rowHtml += `<td class="empty-cell"></td>`;
            } else {
                hasDaysInRow = true;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;

                // Filter permohonan yang disetujui (APPROVED)
                const approvedEvents = localReservations.filter(r => {
                    const tglMulai = r.tanggal_pinjam;
                    const tglSelesai = r.tanggal_selesai || r.tanggal_pinjam;
                    return r.status === 'APPROVED' && (dateStr >= tglMulai && dateStr <= tglSelesai);
                });

                const isToday = isCurrentMonthReal && (dayCounter === realToday.getDate());
                const todayClass = isToday ? 'today-badge' : '';

                let eventsHtml = approvedEvents.map(e => `
                    <div class="event-tag-modern" title="${e.rooms?.nama_ruangan || 'Ruangan'} (${e.jam_mulai.substring(0,5)} - ${e.jam_selesai.substring(0,5)})">
                        <span class="event-dot"></span>
                        <span style="overflow: hidden; text-overflow: ellipsis;">${e.jam_mulai.substring(0,5)} ${e.rooms?.nama_ruangan || 'Ruangan'}</span>
                    </div>
                `).join('');

                rowHtml += `
                    <td onclick="openEventModal('${dateStr}')" class="${todayClass}" style="cursor: pointer;">
                        <div class="date-header">
                            <span class="date-num">${dayCounter}</span>
                        </div>
                        ${eventsHtml}
                    </td>
                `;
                dayCounter++;
            }
        }
        rowHtml += '</tr>';
        if (hasDaysInRow) html += rowHtml;
    }
    tbody.innerHTML = html;
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

// Fungsi Menampilkan Pop-up Detail Agenda saat Tanggal Diklik
function openEventModal(dateStr) {
    document.getElementById('modalDateTitle').innerText = `Agenda Tanggal: ${dateStr}`;
    const listContainer = document.getElementById('modalEventList');
    
    const dayEvents = localReservations.filter(r => r.tanggal_pinjam === dateStr && r.status === 'APPROVED');

    if (dayEvents.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 24px; color: #64748b;">
                <p style="margin-bottom: 8px; font-weight: 700;">Tidak ada kegiatan pada tanggal ini.</p>
                <p style="font-size: 13px;">Ruangan masih tersedia untuk diajukan peminjaman.</p>
            </div>
        `;
    } else {
        listContainer.innerHTML = dayEvents.map(e => `
            <div style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #0f172a; font-size: 15px;">${e.rooms?.nama_ruangan || 'Ruangan'}</strong>
                    <span style="background: #dcfce7; color: #14532d; border: 1px solid #86efac; padding: 2px 8px; font-weight: 800; font-size: 12px; border-radius: 4px;">
                        ${e.jam_mulai.substring(0,5)} - ${e.jam_selesai.substring(0,5)} WIB
                    </span>
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                    Agenda: ${e.tujuan_kegiatan}
                </div>
                <div style="font-size: 13px; color: #64748b; border-t: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
                    <strong>Peminjam:</strong> ${e.nama_peminjam} (${e.unit_organisasi})<br>
                    <strong>No. Identitas:</strong> ${e.identitas}
                </div>
            </div>
        `).join('');
    }

    document.getElementById('eventDetailModal').style.display = 'flex';
}

function closeEventModal() {
    document.getElementById('eventDetailModal').style.display = 'none';
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const roomId = parseInt(document.getElementById('formRoomId').value);
    const tglMulai = document.getElementById('formTanggalMulai').value;
    const tglSelesai = document.getElementById('formTanggalSelesai').value || tglMulai;
    const jamMulai = document.getElementById('formJamMulai').value;
    const jamSelesai = document.getElementById('formJamSelesai').value;

    if (tglSelesai < tglMulai) {
        showCustomAlert("Tanggal selesai tidak boleh lebih awal dari tanggal mulai!", "Input Tidak Valid", "error");
        return;
    }

    const payload = {
        room_id: roomId,
        nama_peminjam: document.getElementById('formNama').value,
        identitas: document.getElementById('formIdentitas').value,
        unit_organisasi: document.getElementById('formOrganisasi').value,
        tanggal_pinjam: tglMulai,
        tanggal_selesai: tglSelesai,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        tujuan_kegiatan: document.getElementById('formTujuan').value,
        status: 'PENDING'
    };

    // Deteksi bentrok tanggal & jam dengan agenda disetujui (APPROVED)
    const isConflict = localReservations.some(r => {
        const rSelesai = r.tanggal_selesai || r.tanggal_pinjam;
        if (r.room_id === roomId && r.status === 'APPROVED') {
            // Cek irisan tanggal
            const overlapDate = (tglMulai <= rSelesai && tglSelesai >= r.tanggal_pinjam);
            // Cek irisan jam
            const overlapTime = (jamMulai < r.jam_selesai && jamSelesai > r.jam_mulai);
            return overlapDate && overlapTime;
        }
        return false;
    });

    try {
        const { error } = await supabaseClient.from('reservations').insert([payload]);
        if (error) throw error;
        
        document.getElementById('bookingForm').reset();
        await fetchReservations();
        switchView('agenda');

        if (isConflict) {
            showCustomAlert(
                "Permohonan berhasil dikirim (Status: PENDING). Catatan: Ruangan & rentang waktu ini memiliki jadwal yang bentrok dengan permohonan lain. Keputusan persetujuan penuh ada di tangan Admin Sarpras.", 
                "Peringatan Bentrok", 
                "info"
            );
        } else {
            showCustomAlert("Permohonan peminjaman berhasil dikirim! Menunggu persetujuan Admin Sarpras.", "Pengajuan Berhasil", "success");
        }
    } catch (err) {
        showCustomAlert("Gagal mengirim permohonan: " + err.message, "Kesalahan Sistem", "error");
    }
}

function toggleAdminModal() {
    if (isAdminLoggedIn) {
        switchView('admin');
    } else {
        const modal = document.getElementById('adminAuthModal');
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const inputUser = document.getElementById('adminUser').value.trim();
    const inputPass = document.getElementById('adminPass').value.trim();

    try {
        const { data, error } = await supabaseClient
            .from('admin_users')
            .select('*')
            .eq('username', inputUser)
            .eq('password', inputPass)
            .single();

        if (error || !data) {
            showCustomAlert("Username atau Password Admin salah!", "Gagal Login", "error");
            return;
        }

        isAdminLoggedIn = true;
        document.getElementById('adminAuthModal').style.display = 'none';
        
        switchView('admin');
        renderAdminTable();
        showCustomAlert(`Selamat datang, ${data.nama_petugas}!`, "Autentikasi Berhasil", "success");

    } catch (err) {
        showCustomAlert("Terjadi kesalahan saat verifikasi: " + err.message, "Kesalahan Sistem", "error");
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    switchView('agenda');
}

// =========================================================
// RENDER TABEL ADMIN (Dengan Deteksi Bentrok Visual)
// =========================================================
function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;

    tbody.innerHTML = localReservations.map(item => {
        const tglSelesaiStr = item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_pinjam 
            ? ` s.d ${item.tanggal_selesai}` 
            : '';

        // Deteksi bentrok antar permohonan
        const isConflict = localReservations.some(other => {
            if (other.id !== item.id && other.room_id === item.room_id && other.status !== 'REJECTED') {
                const itemSelesai = item.tanggal_selesai || item.tanggal_pinjam;
                const otherSelesai = other.tanggal_selesai || other.tanggal_pinjam;

                const overlapDate = (item.tanggal_pinjam <= otherSelesai && itemSelesai >= other.tanggal_pinjam);
                const overlapTime = (item.jam_mulai < other.jam_selesai && item.jam_selesai > other.jam_mulai);
                return overlapDate && overlapTime;
            }
            return false;
        });

        const rowBgStyle = isConflict 
            ? 'background-color: #fff1f2; border-left: 4px solid #f43f5e;' 
            : 'border-bottom: 1px solid #cbd5e1;';

        const conflictBadge = isConflict 
            ? `<div style="font-size: 10px; background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; padding: 2px 6px; border-radius: 4px; font-weight: 800; margin-top: 4px; display: inline-block;">⚠️ BENTROK JADWAL</div>` 
            : '';

        return `
            <tr style="${rowBgStyle}">
                <td style="padding: 12px;">
                    <strong>${item.tanggal_pinjam}${tglSelesaiStr}</strong>
                    ${conflictBadge}
                </td>
                <td style="padding: 12px;">
                    <strong>${item.nama_peminjam}</strong><br>
                    <small style="color:#64748b;">${item.unit_organisasi} (${item.identitas})</small>
                </td>
                <td style="padding: 12px;">
                    <strong style="color: #0f172a;">${item.rooms?.nama_ruangan || '-'}</strong>
                </td>
                <td style="padding: 12px;">
                    <strong style="color: #b45309;">${item.jam_mulai.substring(0,5)} - ${item.jam_selesai.substring(0,5)} WIB</strong><br>
                    <small style="color:#475569;">${item.tujuan_kegiatan}</small>
                </td>
                <td style="padding: 12px;">
                    <span style="font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 4px; ${
                        item.status === 'APPROVED' ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;' :
                        item.status === 'REJECTED' ? 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;' :
                        'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;'
                    }">
                        ${item.status}
                    </span>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        ${item.status === 'PENDING' ? `
                            <button onclick="updateStatus(${item.id}, 'APPROVED')" class="btn-official" style="background:#16a34a; border-color:#16a34a; padding:4px 8px; font-size:12px;">Setujui</button>
                            <button onclick="updateStatus(${item.id}, 'REJECTED')" class="btn-official" style="background:#dc2626; border-color:#dc2626; padding:4px 8px; font-size:12px;">Tolak</button>
                        ` : `
                            <button onclick="updateStatus(${item.id}, 'PENDING')" class="btn-official" style="background:#64748b; border-color:#64748b; padding:4px 8px; font-size:12px;">Reset</button>
                        `}
                        <button onclick="deleteReservation(${item.id})" class="btn-official" style="background:#b91c1c; border-color:#b91c1c; padding:4px 8px; font-size:12px;" title="Hapus Ajuan">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateStatus(id, newStatus) {
    try {
        const { error } = await supabaseClient.from('reservations').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        await fetchReservations();
        showCustomAlert(`Status permohonan berhasil diperbarui menjadi ${newStatus}.`, "Status Diperbarui", "success");
    } catch (err) {
        showCustomAlert("Gagal memperbarui status: " + err.message, "Kesalahan Sistem", "error");
    }
}

// Notifikasi Modal Modern (Pengganti alert() bawaan browser)
function showCustomAlert(message, title = "Informasi Sistem", type = "info") {
    const modal = document.getElementById('customAlertModal');
    const titleEl = document.getElementById('alertTitle');
    const msgEl = document.getElementById('alertMessage');
    const iconEl = document.getElementById('alertIcon');
    const headerBg = document.getElementById('alertHeaderBg');

    if (!modal) return;

    titleEl.innerText = title;
    msgEl.innerText = message;

    if (type === "success") {
        iconEl.innerText = "✅";
        headerBg.style.background = "#14532d";
    } else if (type === "error") {
        iconEl.innerText = "⚠️";
        headerBg.style.background = "#7f1d1d";
    } else {
        iconEl.innerText = "ℹ️";
        headerBg.style.background = "#0f172a";
    }

    modal.style.display = 'flex';
}

function closeCustomAlert() {
    const modal = document.getElementById('customAlertModal');
    if (modal) modal.style.display = 'none';
}
// =========================================================
// HAPUS AJUAN (Fitur Admin)
// =========================================================
async function deleteReservation(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus permohonan ini secara permanen?")) return;

    try {
        const { error } = await supabaseClient
            .from('reservations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await fetchReservations();
        showCustomAlert("Data permohonan berhasil dihapus.", "Hapus Data", "info");
    } catch (err) {
        showCustomAlert("Gagal menghapus data: " + err.message, "Kesalahan Sistem", "error");
    }
}
