class ReportManager {
    constructor() {
        this.selectedLocation = null;
        this.uploadedPhotos = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        // Show initial placeholder
        this.showUploadPlaceholder();
    }

    setupEventListeners() {
        const reportForm = document.getElementById('reportForm');
        const photoUpload = document.getElementById('photoUpload');
        const photoCapture = document.getElementById('photoCapture');
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        const cancelReport = document.getElementById('cancelReport');
        const findLiveLocationBtn = document.getElementById('findLiveLocationBtn');

        if (reportForm) reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));

        // Both inputs (gallery + camera) go through the same handler
        if (photoUpload) photoUpload.addEventListener('change', (e) => this.handlePhotoUpload(e));
        if (photoCapture) photoCapture.addEventListener('change', (e) => this.handlePhotoUpload(e));

        if (findLiveLocationBtn) findLiveLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        if (currentLocationBtn) currentLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        if (cancelReport) cancelReport.addEventListener('click', () => this.closeReportModal());

        // Initial placeholder render (wires gallery/camera buttons too)
        const preview = document.getElementById('photoPreview');
        if (preview) this._showPlaceholderInPreview(preview);

        this.setupModalListener();
    }

    setupModalListener() {
        const reportModal = document.getElementById('reportModal');
        if (reportModal) {
            reportModal.addEventListener('click', (e) => {
                if (e.target === reportModal || e.target.classList.contains('close')) {
                    // This handles closing the modal via backdrop/close button
                    // The report button click handler handles opening and map init
                }
            });
        }
        
        // Also initialize when report button is clicked
        document.addEventListener('click', (e) => {
            if (e.target.id === 'reportIssueBtn' || e.target.id === 'showReportModal') {
                setTimeout(() => {
                    this.initializeReportMap();
                }, 300);
            }
        });
    }

    initializeReportMap() {
        const mapEl = document.getElementById('map');
        if (!mapEl) return;

        // Clear any error messages
        if (mapEl.querySelector('.map-fallback')) {
            mapEl.innerHTML = ''; // Clear fallback content
        }

        // Try to initialize Google Maps
        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined') {
            try {
                // Check if map already exists on the element
                if (window.reportMap && mapEl.contains(window.reportMap.getDiv())) {
                     // Map is already initialized, no need to re-initialize the object
                } else {
                    // Re-initialize map container
                    mapEl.innerHTML = ''; 

                    window.reportMap = new google.maps.Map(mapEl, {
                        center: { lat: 40.7128, lng: -74.0060 },
                        zoom: 12,
                        styles: this.getMapStyle()
                    });

                    window.reportMap.addListener('click', (event) => {
                        this.placeMarker(event.latLng);
                    });

                    this.initializeLocationSearch();
                }
            } catch (error) {
                console.error('Error initializing report map:', error);
                this.showMapFallback();
            }
        } else {
            this.showMapFallback();
        }
    }

    showMapFallback() {
        const mapEl = document.getElementById('map');
        if (mapEl) {
            mapEl.innerHTML = `
                <div class="map-fallback" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px; border-radius: 8px;">
                    <i class="fas fa-map-marker-alt" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h4>Location Selection</h4>
                    <p style="margin-bottom: 1rem;">Map is currently unavailable. Please check your API key setup.</p>
                    <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6;">
                        <p style="margin: 0; font-size: 0.9rem;"><strong>Alternative:</strong> Use the location search above to find your address, or describe the location in your report description.</p>
                    </div>
                </div>
            `;
        }
    }

    initializeLocationSearch() {
        const locationSearch = document.getElementById('locationSearch');
        if (!locationSearch || !window.reportMap) return;

        try {
            const autocomplete = new google.maps.places.Autocomplete(locationSearch);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place.geometry) {
                    window.reportMap.setCenter(place.geometry.location);
                    window.reportMap.setZoom(16);
                    this.placeMarker(place.geometry.location);
                }
            });
        } catch (error) {
            console.error('Error initializing location search:', error);
        }
    }

    placeMarker(location) {
        if (!window.reportMap) return;

        if (window.reportMarker) {
            window.reportMarker.setMap(null);
        }

        window.reportMarker = new google.maps.Marker({
            position: location,
            map: window.reportMap,
            draggable: true
        });

        this.updateCoordinatesDisplay(location);
        this.selectedLocation = location;

        window.reportMarker.addListener('dragend', () => {
            const newPosition = window.reportMarker.getPosition();
            this.updateCoordinatesDisplay(newPosition);
            this.selectedLocation = newPosition;
        });
    }

    updateCoordinatesDisplay(location) {
        const coordinatesDisplay = document.getElementById('coordinates');
        if (coordinatesDisplay) {
            const lat = location.lat().toFixed(6);
            const lng = location.lng().toFixed(6);
            coordinatesDisplay.textContent = `Lat: ${lat}, Lng: ${lng}`;
            coordinatesDisplay.style.display = 'block';
        }
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitButton.disabled = true;

            // Call saveReport and wait for it
            const result = await this.saveReport();
            
            if (result) {
                showAlert('Issue reported successfully!', 'success');
                this.closeReportModal();
                this.resetReportForm();
                
                if (typeof loadDashboard === 'function') {
                    loadDashboard();
                }
            }
            
        } catch (error) {
            console.error('Critical error submitting report:', error);
            showAlert('Failed to submit report. Please try again.', 'error');
        } finally {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    validateForm() {
        const issueType = document.getElementById('issueType').value;
        const description = document.getElementById('issueDescription').value;

        if (!issueType) {
            showAlert('Please select an issue type', 'error');
            return false;
        }

        if (!description.trim()) {
            showAlert('Please provide a description', 'error');
            return false;
        }

        // Location is optional in fallback mode
        if (!this.selectedLocation && !document.getElementById('locationSearch').value.trim()) {
            showAlert('Please select a location on the map or provide an address in the search box', 'info');
            // Don't return false - make location optional for now if map is unavailable
        }

        return true;
    }

    async saveReport() {
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        if (!userId) {
            showAlert('Please log in first', 'error');
            return false;
        }
        
        const reportData = {
            userId: userId,
            issueType: document.getElementById('issueType').value,
            description: document.getElementById('issueDescription').value,
            location: this.selectedLocation ? {
                lat: this.selectedLocation.lat(),
                lng: this.selectedLocation.lng()
            } : null,
            address: document.getElementById('locationSearch').value || 'Manual location',
            photos: this.uploadedPhotos
        };

        try {
            showAlert('Saving report...', 'info');
            
            // Save to backend API
            const result = await apiService.createReport(reportData);
            
            if (result.success) {
                showAlert('Report submitted successfully!', 'success');
                return true;
            } else {
                showAlert(result.error || 'Failed to save report', 'error');
                return false;
            }
            
        } catch (error) {
            console.error('Error saving report:', error);
            showAlert('An error occurred while saving the report', 'error');
            return false;
        }
    }

    // Called by both #photoUpload (gallery) and #photoCapture (camera)
    handlePhotoUpload(event) {
        const newFiles = Array.from(event.target.files || []);
        // reset the input so the same file can be picked again if needed
        event.target.value = '';

        if (newFiles.length === 0) return;

        const remaining = 5 - this.uploadedPhotos.length;
        if (remaining <= 0) {
            showAlert('Maximum 5 photos allowed. Remove one first.', 'info');
            return;
        }

        const toAdd = newFiles.slice(0, remaining);

        toAdd.forEach(file => {
            if (!file.type.startsWith('image/')) {
                showAlert(`${file.name} is not an image`, 'error');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showAlert(`${file.name} exceeds 10MB`, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result; // full data:image/...;base64,... string
                this.uploadedPhotos.push(base64);
                this._renderPhotoPreview();
            };
            reader.onerror = () => showAlert(`Could not read ${file.name}`, 'error');
            reader.readAsDataURL(file);
        });
    }

    // Rebuild the preview area from this.uploadedPhotos
    _renderPhotoPreview() {
        const preview = document.getElementById('photoPreview');
        if (!preview) return;

        if (this.uploadedPhotos.length === 0) {
            this._showPlaceholderInPreview(preview);
            return;
        }

        // Keep the hidden file inputs outside preview so they survive innerHTML resets
        preview.innerHTML = this.uploadedPhotos.map((src, i) => `
            <div class="preview-image" data-index="${i}">
                <img src="${src}" alt="Photo ${i + 1}">
                <button type="button" class="remove-image" data-index="${i}">
                    <i class="fas fa-times"></i>
                </button>
            </div>`).join('');

        // Add remove listeners
        preview.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.index);
                this.uploadedPhotos.splice(idx, 1);
                this._renderPhotoPreview();
            });
        });

        // Tap anywhere on the grid (not on a remove btn) to add more
        preview.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-image')) {
                document.getElementById('photoUpload')?.click();
            }
        }, { once: true }); // re-attached on next render
    }

    _showPlaceholderInPreview(preview) {
        preview.innerHTML = `
            <div class="upload-placeholder" id="uploadPlaceholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>Add Photos</span>
                <div class="upload-btn-group">
                    <button type="button" class="btn btn-outline btn-small" id="galleryBtn">
                        <i class="fas fa-images"></i> Gallery
                    </button>
                    <button type="button" class="btn btn-outline btn-small" id="cameraBtn">
                        <i class="fas fa-camera"></i> Camera
                    </button>
                </div>
                <small>Max 5 photos</small>
            </div>`;

        document.getElementById('galleryBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('photoUpload')?.click();
        });
        document.getElementById('cameraBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('photoCapture')?.click();
        });
    }

    showUploadPlaceholder() {
        // Only reset photos array + re-render if explicitly called (form reset)
        this.uploadedPhotos = [];
        const preview = document.getElementById('photoPreview');
        if (preview) this._showPlaceholderInPreview(preview);
    }

    addPhotoToPreview(imageData) {
        // Legacy path — just push and re-render
        this.uploadedPhotos.push(imageData);
        this._renderPhotoPreview();
    }

    removePhoto(button) {
        // Legacy path (called from onclick attr in old HTML) — kept for safety
        const idx = parseInt(button.closest('.preview-image')?.dataset.index);
        if (!isNaN(idx)) {
            this.uploadedPhotos.splice(idx, 1);
            this._renderPhotoPreview();
        }
    }

    useCurrentLocation() {
        const button = document.getElementById('findLiveLocationBtn') || document.getElementById('currentLocationBtn'); 
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }

        if (!navigator.geolocation) {
            showAlert('Geolocation is not supported by your browser', 'error');
            if (button) {
                button.classList.remove('loading');
                button.disabled = false;
            }
            return;
        }

        showAlert('Getting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                console.log('Location found:', location);
                
                if (window.reportMap) {
                    const googleLocation = new google.maps.LatLng(location.lat, location.lng);
                    window.reportMap.setCenter(googleLocation);
                    window.reportMap.setZoom(16);
                    this.placeMarker(googleLocation);
                    showAlert('Location found!', 'success');
                } else {
                    // Update coordinates even without map
                    this.updateCoordinatesDisplay({
                        lat: () => location.lat,
                        lng: () => location.lng
                    });
                    // Store as a simple object if map isn't available
                    this.selectedLocation = {
                         lat: () => location.lat,
                         lng: () => location.lng
                    };
                    showAlert('Location found! Map not available. Coordinates updated.', 'success');
                }
                
                if (button) {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Could not get your location. ';
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Please allow location access in your browser settings.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Location request timed out.';
                        break;
                    default:
                        errorMessage += 'An unknown error occurred.';
                        break;
                }
                
                showAlert(errorMessage, 'error');
                
                if (button) {
                    button.classList.remove('loading');
                    button.disabled = false;
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
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
        const preview = document.getElementById('photoPreview');
        if (preview) this._showPlaceholderInPreview(preview);

        const coordinatesDisplay = document.getElementById('coordinates');
        if (coordinatesDisplay) coordinatesDisplay.textContent = 'Lat: 0.0000, Lng: 0.0000';

        if (window.reportMarker) { window.reportMarker.setMap(null); window.reportMarker = null; }
        const ls = document.getElementById('locationSearch');
        if (ls) ls.value = '';
    }

    setSelectedLocation(location) {
        this.selectedLocation = location;
    }

    getMapStyle() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return isDark ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
        ] : [];
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.reportManager = new ReportManager();
});