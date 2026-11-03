const SUPABASE_URL = "https://efdtnmjrtrnavejtfmqz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2AcfpZKrqfDJxwR04B1USg_giYJA_1q";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let isAdminLoggedIn = false;
let localRooms = [];
let localReservations = [];

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
        container.innerHTML = '<div>Belum ada data ruangan.</div>';
        return;
    }
    container.innerHTML = localRooms.map(r => `
        <div class="room-card">
            <div class="room-card-header">
                <span>${r.nama_ruangan}</span>
                <span class="room-badge">${r.kategori}</span>
            </div>
            <div class="room-body">
                <p><strong>Kapasitas:</strong> ${r.kapasitas} Orang</p>
                <p style="margin-top: 6px;"><strong>Fasilitas:</strong> ${r.fasilitas}</p>
            </div>
            <div style="padding: 12px; background: #f8fafc; border-t: 1px solid #cbd5e1;">
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

function renderCalendar() {
    const tbody = document.getElementById('calendarGridBody');
    tbody.innerHTML = '';

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calendarMonthYear').innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let dayCounter = 1;
    let html = '';

    for (let row = 0; row < 6; row++) {
        let rowHtml = '<tr>';
        let hasDaysInRow = false;

        for (let col = 0; col < 7; col++) {
            if ((row === 0 && col < firstDay) || dayCounter > daysInMonth) {
                rowHtml += `<td style="background: #f8fafc;"></td>`;
            } else {
                hasDaysInRow = true;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
                const approvedEvents = localReservations.filter(r => r.tanggal_pinjam === dateStr && r.status === 'APPROVED');

                let eventsHtml = approvedEvents.map(e => `
                    <div class="event-tag">
                        ${e.jam_mulai.substring(0,5)} | ${e.rooms?.nama_ruangan || 'Ruangan'}
                    </div>
                `).join('');

                rowHtml += `
                    <td>
                        <div class="date-num">${dayCounter}</div>
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

async function handleFormSubmit(e) {
    e.preventDefault();
    const payload = {
        room_id: parseInt(document.getElementById('formRoomId').value),
        nama_peminjam: document.getElementById('formNama').value,
        identitas: document.getElementById('formIdentitas').value,
        unit_organisasi: document.getElementById('formOrganisasi').value,
        tanggal_pinjam: document.getElementById('formTanggal').value,
        jam_mulai: document.getElementById('formJamMulai').value,
        jam_selesai: document.getElementById('formJamSelesai').value,
        tujuan_kegiatan: document.getElementById('formTujuan').value,
        status: 'PENDING'
    };

    try {
        const { error } = await supabaseClient.from('reservations').insert([payload]);
        if (error) throw error;
        alert("Permohonan berhasil dikirim ke database!");
        document.getElementById('bookingForm').reset();
        await fetchReservations();
        switchView('agenda');
    } catch (err) {
        alert("Gagal mengirim permohonan: " + err.message);
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

function handleAdminLogin(e) {
    e.preventDefault();
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;

    if (u === 'admin' && p === 'admin123') {
        isAdminLoggedIn = true;
        document.getElementById('adminAuthModal').style.display = 'none';
        switchView('admin');
        renderAdminTable();
    } else {
        alert("Username atau Password Admin salah!");
    }
}

function logoutAdmin() {
    isAdminLoggedIn = false;
    switchView('agenda');
}

function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = localReservations.map(item => `
        <tr style="border-bottom: 1px solid #cbd5e1;">
            <td style="padding: 10px;">${item.tanggal_pinjam}</td>
            <td style="padding: 10px;"><strong>${item.nama_peminjam}</strong><br><small style="color:#64748b;">${item.unit_organisasi}</small></td>
            <td style="padding: 10px;">${item.rooms?.nama_ruangan || '-'}</td>
            <td style="padding: 10px;"><strong>${item.jam_mulai.substring(0,5)} - ${item.jam_selesai.substring(0,5)}</strong><br><small style="color:#475569;">${item.tujuan_kegiatan}</small></td>
            <td style="padding: 10px;"><strong>${item.status}</strong></td>
            <td style="padding: 10px; text-align: center;">
                ${item.status === 'PENDING' ? `
                    <button onclick="updateStatus(${item.id}, 'APPROVED')" class="btn-official" style="background:#16a34a; padding:4px 8px; font-size:11px;">Setujui</button>
                    <button onclick="updateStatus(${item.id}, 'REJECTED')" class="btn-official" style="background:#dc2626; padding:4px 8px; font-size:11px;">Tolak</button>
                ` : `
                    <button onclick="updateStatus(${item.id}, 'PENDING')" class="btn-official" style="background:#64748b; padding:4px 8px; font-size:11px;">Reset</button>
                `}
            </td>
        </tr>
    `).join('');
}

async function updateStatus(id, newStatus) {
    try {
        const { error } = await supabaseClient.from('reservations').update({ status: newStatus }).eq('id', id);
        if (error) throw error;
        await fetchReservations();
    } catch (err) {
        alert("Gagal mengubah status: " + err.message);
    }
}

// Fungsi Buka / Tutup Sidebar Navigasi
function toggleSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
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

function renderCalendar() {
    const tbody = document.getElementById('calendarGridBody');
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
                rowHtml += `<td style="background: #e2e8f0;"></td>`;
            } else {
                hasDaysInRow = true;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
                const approvedEvents = localReservations.filter(r => r.tanggal_pinjam === dateStr && r.status === 'APPROVED');

                // Cek apakah tanggal sel ini adalah HARI INI
                const isToday = isCurrentMonthReal && (dayCounter === realToday.getDate());
                const bgStyle = isToday ? 'background-color: #fef08a; border: 2px solid #b45309;' : '';

                let eventsHtml = approvedEvents.map(e => `
                    <div class="event-tag">
                        ${e.jam_mulai.substring(0,5)} | ${e.rooms?.nama_ruangan || 'Ruangan'}
                    </div>
                `).join('');

                rowHtml += `
                    <td style="${bgStyle}">
                        <div class="date-num" style="${isToday ? 'color: #b45309; font-size:15px;' : ''}">
                            ${dayCounter} ${isToday ? '<span style="font-size:10px; background:#b45309; color:#fff; padding:1px 4px; border-radius:3px; margin-left:4px;">Hari Ini</span>' : ''}
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