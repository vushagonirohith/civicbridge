class ReportManager {
    constructor() {
        this.selectedLocation = null;
        this.uploadedPhotos = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('reportForm')
            ?.addEventListener('submit', (e) => this.handleReportSubmit(e));

        document.getElementById('photoUpload')
            ?.addEventListener('change', (e) => this.handlePhotoUpload(e));
        document.getElementById('photoCapture')
            ?.addEventListener('change', (e) => this.handlePhotoUpload(e));

        document.getElementById('findLiveLocationBtn')
            ?.addEventListener('click', () => this.useCurrentLocation());
        document.getElementById('currentLocationBtn')
            ?.addEventListener('click', () => this.useCurrentLocation());
        document.getElementById('cancelReport')
            ?.addEventListener('click', () => this.closeReportModal());

        // Delegated click for gallery/camera buttons (survives innerHTML resets)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#galleryBtn')) {
                e.preventDefault(); e.stopPropagation();
                document.getElementById('photoUpload')?.click();
            }
            if (e.target.closest('#cameraBtn')) {
                e.preventDefault(); e.stopPropagation();
                document.getElementById('photoCapture')?.click();
            }
        });

        // Open map when report modal opens
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reportIssueBtn' || e.target.id === 'showReportModal') {
                setTimeout(() => this.initializeReportMap(), 300);
            }
        });

        this._render();
    }

    // ─── Photo handling ───────────────────────────────────────────

    handlePhotoUpload(event) {
        const files = Array.from(event.target.files || []);
        event.target.value = '';
        if (!files.length) return;

        const slots = 5 - this.uploadedPhotos.length;
        if (slots <= 0) { showAlert('Maximum 5 photos. Remove one first.', 'info'); return; }

        files.slice(0, slots).forEach(file => {
            if (!file.type.startsWith('image/')) { showAlert(`${file.name} is not an image`, 'error'); return; }
            if (file.size > 10 * 1024 * 1024) { showAlert(`${file.name} is over 10MB`, 'error'); return; }

            const reader = new FileReader();
            reader.onload = (ev) => {
                this.uploadedPhotos.push(ev.target.result);
                console.log('Photo added, total:', this.uploadedPhotos.length);
                this._render();
            };
            reader.onerror = () => showAlert(`Could not read ${file.name}`, 'error');
            reader.readAsDataURL(file);
        });
    }

    _render() {
        const preview = document.getElementById('photoPreview');
        if (!preview) return;

        if (this.uploadedPhotos.length === 0) {
            preview.innerHTML = `
                <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Add Photos (Optional)</span>
                    <div class="upload-btn-group">
                        <button type="button" id="galleryBtn" class="btn btn-outline btn-small">
                            <i class="fas fa-images"></i> Gallery
                        </button>
                        <button type="button" id="cameraBtn" class="btn btn-outline btn-small">
                            <i class="fas fa-camera"></i> Camera
                        </button>
                    </div>
                    <small>Max 5 photos · 10MB each</small>
                </div>`;
            return;
        }

        const thumbs = this.uploadedPhotos.map((src, i) => `
            <div class="preview-image">
                <img src="${src}" alt="Photo ${i+1}">
                <button type="button" class="remove-image" data-idx="${i}">
                    <i class="fas fa-times"></i>
                </button>
            </div>`).join('');

        const addMore = this.uploadedPhotos.length < 5
            ? `<div id="galleryBtn" style="display:flex;align-items:center;justify-content:center;
                width:90px;height:90px;border:2px dashed var(--border-color);border-radius:8px;
                cursor:pointer;color:var(--secondary);flex-direction:column;gap:4px;font-size:0.75rem;">
                   <i class="fas fa-plus" style="font-size:1.4rem;"></i>Add more
               </div>` : '';

        preview.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;">${thumbs}${addMore}</div>`;

        preview.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.uploadedPhotos.splice(parseInt(btn.dataset.idx), 1);
                this._render();
            });
        });
    }

    showUploadPlaceholder() { this.uploadedPhotos = []; this._render(); }

    // ─── Submit ───────────────────────────────────────────────────

    async handleReportSubmit(e) {
        e.preventDefault();
        if (!this.validateForm()) return;

        const btn = e.target.querySelector('button[type="submit"]');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        try {
            const ok = await this.saveReport();
            if (ok) {
                showAlert('Issue reported successfully!', 'success');
                this.closeReportModal();
                this.resetReportForm();
                if (typeof loadDashboard === 'function') loadDashboard();
            }
        } catch (err) {
            console.error('Submit error:', err);
            showAlert('Failed to submit. Please try again.', 'error');
        } finally {
            btn.innerHTML = orig;
            btn.disabled = false;
        }
    }

    validateForm() {
        if (!document.getElementById('issueType').value) {
            showAlert('Please select an issue type', 'error'); return false;
        }
        if (!document.getElementById('issueDescription').value.trim()) {
            showAlert('Please provide a description', 'error'); return false;
        }
        return true;
    }

    async saveReport() {
        const userId = localStorage.getItem('userId');
        if (!userId) { showAlert('Please log in first', 'error'); return false; }

        console.log('Submitting with photos:', this.uploadedPhotos.length);

        const reportData = {
            userId,
            issueType: document.getElementById('issueType').value,
            description: document.getElementById('issueDescription').value,
            location: this.selectedLocation ? {
                lat: this.selectedLocation.lat(),
                lng: this.selectedLocation.lng()
            } : null,
            address: document.getElementById('locationSearch').value || 'Location not specified',
            photos: this.uploadedPhotos
        };

        showAlert('Saving report...', 'info');
        const result = await apiService.createReport(reportData);

        if (result.success) { return true; }
        showAlert(result.error || 'Failed to save report', 'error');
        return false;
    }

    // ─── Map ──────────────────────────────────────────────────────

    initializeReportMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;
        if (mapEl.querySelector('.map-fallback')) mapEl.innerHTML = '';

        if (typeof google !== 'undefined' && google.maps) {
            try {
                if (!window.reportMap || !mapEl.contains(window.reportMap.getDiv())) {
                    mapEl.innerHTML = '';
                    window.reportMap = new google.maps.Map(mapEl, {
                        center: { lat: 40.7128, lng: -74.006 }, zoom: 12,
                        styles: this.getMapStyle()
                    });
                    window.reportMap.addListener('click', (ev) => this.placeMarker(ev.latLng));
                    this.initializeLocationSearch();
                }
            } catch (err) { this.showMapFallback(); }
        } else { this.showMapFallback(); }
    }

    showMapFallback() {
        const el = document.getElementById('map');
        if (el) el.innerHTML = `<div class="map-fallback" style="height:100%;display:flex;
            flex-direction:column;align-items:center;justify-content:center;background:#f8f9fa;
            color:#6c757d;text-align:center;padding:20px;border-radius:8px;">
            <i class="fas fa-map-marker-alt" style="font-size:2rem;margin-bottom:1rem;"></i>
            <h4>Map unavailable</h4><p>Describe the location in your report.</p></div>`;
    }

    initializeLocationSearch() {
        const input = document.getElementById('locationSearch');
        if (!input || !window.reportMap) return;
        try {
            const ac = new google.maps.places.Autocomplete(input);
            ac.addListener('place_changed', () => {
                const place = ac.getPlace();
                if (place.geometry) {
                    window.reportMap.setCenter(place.geometry.location);
                    window.reportMap.setZoom(16);
                    this.placeMarker(place.geometry.location);
                }
            });
        } catch (err) {}
    }

    placeMarker(location) {
        if (!window.reportMap) return;
        window.reportMarker?.setMap(null);
        window.reportMarker = new google.maps.Marker({
            position: location, map: window.reportMap, draggable: true
        });
        this.updateCoords(location);
        this.selectedLocation = location;
        window.reportMarker.addListener('dragend', () => {
            const pos = window.reportMarker.getPosition();
            this.updateCoords(pos);
            this.selectedLocation = pos;
        });
    }

    updateCoords(location) {
        const el = document.getElementById('coordinates');
        if (el) {
            el.textContent = `Lat: ${location.lat().toFixed(6)}, Lng: ${location.lng().toFixed(6)}`;
            el.style.display = 'block';
        }
    }

    useCurrentLocation() {
        const btn = document.getElementById('findLiveLocationBtn') || document.getElementById('currentLocationBtn');
        if (btn) { btn.classList.add('loading'); btn.disabled = true; }
        if (!navigator.geolocation) {
            showAlert('Geolocation not supported', 'error');
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            return;
        }
        showAlert('Getting your location...', 'info');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                if (window.reportMap) {
                    const gloc = new google.maps.LatLng(loc.lat, loc.lng);
                    window.reportMap.setCenter(gloc);
                    window.reportMap.setZoom(16);
                    this.placeMarker(gloc);
                } else {
                    this.selectedLocation = { lat: () => loc.lat, lng: () => loc.lng };
                    const el = document.getElementById('coordinates');
                    if (el) el.textContent = `Lat: ${loc.lat.toFixed(6)}, Lng: ${loc.lng.toFixed(6)}`;
                }
                showAlert('Location found!', 'success');
                if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            },
            (err) => {
                const msgs = { 1: 'Location access denied.', 2: 'Location unavailable.', 3: 'Request timed out.' };
                showAlert(msgs[err.code] || 'Could not get location.', 'error');
                if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    }

    closeReportModal() {
        document.getElementById('reportModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    resetReportForm() {
        document.getElementById('reportForm').reset();
        this.selectedLocation = null;
        this.uploadedPhotos = [];
        this._render();
        const el = document.getElementById('coordinates');
        if (el) el.textContent = 'Lat: 0.0000, Lng: 0.0000';
        window.reportMarker?.setMap(null);
        window.reportMarker = null;
        const ls = document.getElementById('locationSearch');
        if (ls) ls.value = '';
    }

    getMapStyle() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
        ] : [];
    }

    setSelectedLocation(loc) { this.selectedLocation = loc; }
    addPhotoToPreview(src) { this.uploadedPhotos.push(src); this._render(); }
    removePhoto() {}
    attachPhotoPreviewListener() {}
    setupModalListener() {}
}

document.addEventListener('DOMContentLoaded', () => {
    window.reportManager = new ReportManager();
});