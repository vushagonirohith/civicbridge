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
        const currentLocationBtn = document.getElementById('currentLocationBtn');
        const cancelReport = document.getElementById('cancelReport');
        const findLiveLocationBtn = document.getElementById('findLiveLocationBtn'); // The new button

        if (reportForm) {
            reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
        }

        if (photoUpload) {
            photoUpload.addEventListener('change', (e) => this.handlePhotoUpload(e));
        }
        
        // Setup listener for the new dedicated button
        if (findLiveLocationBtn) {
            findLiveLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        }
        
        // Keep listener for top location button (if user clicks it)
        if (currentLocationBtn) {
            currentLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        }

        if (cancelReport) {
            cancelReport.addEventListener('click', () => this.closeReportModal());
        }

        // Photo preview click to trigger file input
        const photoPreview = document.getElementById('photoPreview');
        if (photoPreview) {
            this.attachPhotoPreviewListener();
        }

        // Initialize map when modal opens
        this.setupModalListener();
    }

    attachPhotoPreviewListener() {
         const photoUpload = document.getElementById('photoUpload');
         const photoPreview = document.getElementById('photoPreview');
         if (photoPreview && photoUpload) {
             photoPreview.addEventListener('click', (event) => {
                 // Check if click target is a remove button
                 if (!event.target.closest('.remove-image')) {
                     photoUpload.click();
                 }
             });
         }
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

    handleReportSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        try {
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            submitButton.disabled = true;

            // Simulate API call and save
            this.saveReport().then(() => {
                showAlert('Issue reported successfully!', 'success');
                this.closeReportModal();
                this.resetReportForm();
                
                if (typeof loadDashboard === 'function') {
                    loadDashboard();
                }
            }).catch((error) => {
                console.error('Error submitting report:', error);
                showAlert('Failed to submit report. Please try again.', 'error');
            }).finally(() => {
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;
            });
            
        } catch (error) {
            console.error('Critical error submitting report:', error);
            showAlert('Failed to submit report. Please try again.', 'error');
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
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        const formData = {
            id: Date.now(),
            userId: userEmail,
            userName: userName,
            userEmail: userEmail,
            issueType: document.getElementById('issueType').value,
            description: document.getElementById('issueDescription').value,
            location: this.selectedLocation ? {
                lat: this.selectedLocation.lat(),
                lng: this.selectedLocation.lng()
            } : null,
            address: document.getElementById('locationSearch').value || 'Manual location',
            photos: this.uploadedPhotos,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        try {
            // Save to Google Sheets
            const saveResult = await sheetsService.saveReport(formData);
            
            if (!saveResult.success) {
                console.warn('Failed to save report to Google Sheets. Saving locally only.', saveResult.error);
                showAlert('Report submitted, but online database save failed. Data may be lost on refresh.', 'warning');
            }
            
        } catch (error) {
            console.error('Error communicating with Google Sheets:', error);
            showAlert('Report submitted, but online database communication failed. Data may be lost on refresh.', 'warning');
        } finally {
             // Always save to localStorage as cache/fallback
            const existingReports = JSON.parse(localStorage.getItem('CivicBridge_reports') || '[]');
            existingReports.push(formData);
            localStorage.setItem('CivicBridge_reports', JSON.stringify(existingReports));
        }
        
        return true;
    }

    handlePhotoUpload(event) {
        const files = Array.from(event.target.files).slice(0, 5);
        const preview = document.getElementById('photoPreview');

        if (!preview) return;

        preview.innerHTML = '';
        this.uploadedPhotos = [];

        if (files.length === 0) {
            this.showUploadPlaceholder();
            return;
        }

        // Read all files asynchronously
        const fileReaders = files.map(file => {
            return new Promise((resolve, reject) => {
                if (!file.type.startsWith('image/')) return reject('Invalid file type');

                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });

        Promise.all(fileReaders)
            .then(results => {
                this.uploadedPhotos = results;
                results.forEach(photo => this.addPhotoToPreview(photo));
                this.attachPhotoPreviewListener();
            })
            .catch(err => {
                console.error('Error reading files:', err);
                showAlert('Some photos could not be uploaded', 'error');
            });
    }

    addPhotoToPreview(imageData) {
        const preview = document.getElementById('photoPreview');
        const previewImage = document.createElement('div');
        previewImage.className = 'preview-image';
        previewImage.innerHTML = `
            <img src="${imageData}" alt="Preview">
            <button type="button" class="remove-image" onclick="reportManager.removePhoto(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        preview.appendChild(previewImage);
    }

    showUploadPlaceholder() {
        const preview = document.getElementById('photoPreview');
        if (preview) {
            preview.innerHTML = `
                <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Click to upload photos</span>
                    <small>Max 5 images, 5MB each</small>
                </div>
            `;
            // Ensure listener is attached to the new placeholder
            this.attachPhotoPreviewListener();
        }
    }

    removePhoto(button) {
        const previewImage = button.parentElement;
        const img = previewImage.querySelector('img');
        const imageSrc = img.src;
        
        this.uploadedPhotos = this.uploadedPhotos.filter(photo => photo !== imageSrc);
        previewImage.remove();
        
        if (this.uploadedPhotos.length === 0) {
            this.showUploadPlaceholder();
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
        this.showUploadPlaceholder();
        this.selectedLocation = null;
        this.uploadedPhotos = [];
        
        const coordinatesDisplay = document.getElementById('coordinates');
        if (coordinatesDisplay) {
            coordinatesDisplay.textContent = 'Lat: 0.0000, Lng: 0.0000';
        }
        
        if (window.reportMarker) {
            window.reportMarker.setMap(null);
            window.reportMarker = null;
        }
        // Clear search input
        document.getElementById('locationSearch').value = '';
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