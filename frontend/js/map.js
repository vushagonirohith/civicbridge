let mapsInitialized = false;

function initMap() {
    console.log('Initializing Google Maps...');
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        console.error('Google Maps API failed to load');
        showMapFallback();
        return;
    }
    
    try {
        // Initialize community map
        initCommunityMap();
        
        mapsInitialized = true;
        console.log('Google Maps initialized successfully');
    } catch (error) {
        console.error('Error initializing maps:', error);
        showMapFallback();
    }
}

function showMapFallback() {
    // Community map fallback
    const communityMapEl = document.getElementById('communityMap');
    if (communityMapEl) {
        communityMapEl.innerHTML = `
            <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px;">
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Interactive Map</h3>
                <p>Map loading issue detected. Please check your API key setup.</p>
                <button class="btn btn-primary" onclick="initMap()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Retry Loading Map
                </button>
            </div>
        `;
    }
    
    // Report map fallback (Handled by report.js/ReportManager.showMapFallback, but providing minimal style for robustness)
    const reportMapEl = document.getElementById('map');
    if (reportMapEl) {
        if (!reportMapEl.querySelector('.map-fallback')) {
             reportMapEl.innerHTML = `
                <div class="map-fallback" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8f9fa; color: #6c757d; text-align: center; padding: 20px;">
                    <i class="fas fa-map-marker-alt" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Map temporarily unavailable</p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Use location search.</p>
                </div>
            `;
        }
    }
}

function initCommunityMap() {
    const communityMapEl = document.getElementById('communityMap');
    if (!communityMapEl) return;

    try {
        window.communityMap = new google.maps.Map(communityMapEl, {
            center: { lat: 40.7128, lng: -74.0060 },
            zoom: 12,
            styles: getMapStyle(),
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true
        });

        addSampleMarkers();
        console.log('Community map initialized');
    } catch (error) {
        console.error('Error initializing community map:', error);
        throw error;
    }
}

function useCurrentLocation() {
    if (!navigator.geolocation) {
        showAlert('Geolocation not supported by your browser', 'error');
        return;
    }

    showAlert('Getting your location...', 'info');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            console.log('Current location:', location);
            
            // For community map
            if (window.communityMap) {
                const googleLocation = new google.maps.LatLng(location.lat, location.lng);
                window.communityMap.setCenter(googleLocation);
                window.communityMap.setZoom(14);
                showAlert('Location found! Map centered.', 'success');
            } else {
                showAlert('Location found! Map not available.', 'success');
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Location access denied or unavailable. ';
            
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage += 'Please enable location permissions in your browser.';
            } else if (error.code === error.TIMEOUT) {
                errorMessage += 'Location request timed out.';
            } else {
                errorMessage += 'Please try again or use manual location search.';
            }
            
            showAlert(errorMessage, 'error');
        }
    );
}

// Make it globally available
window.useCurrentLocation = useCurrentLocation;

function placeMarker(location) {
    if (!window.reportMap) return;

    // Remove existing marker
    if (window.reportMarker) {
        window.reportMarker.setMap(null);
    }

    // Create new marker
    window.reportMarker = new google.maps.Marker({
        position: location,
        map: window.reportMap,
        draggable: true,
        animation: google.maps.Animation.DROP
    });

    // Update coordinates
    updateCoordinatesDisplay(location);

    // Store location
    if (window.reportManager) {
        window.reportManager.setSelectedLocation(location);
    }

    // Update on drag
    window.reportMarker.addListener('dragend', function() {
        const newPosition = window.reportMarker.getPosition();
        updateCoordinatesDisplay(newPosition);
        if (window.reportManager) {
            window.reportManager.setSelectedLocation(newPosition);
        }
    });
}

function updateCoordinatesDisplay(location) {
    const coordinatesDisplay = document.getElementById('coordinates');
    if (coordinatesDisplay) {
        const lat = location.lat().toFixed(6);
        const lng = location.lng().toFixed(6);
        coordinatesDisplay.textContent = `Lat: ${lat}, Lng: ${lng}`;
    }
}

function addSampleMarkers() {
    if (!window.communityMap) return;

    const sampleIssues = [
        {
            position: { lat: 40.7128, lng: -74.0060 },
            type: 'pothole',
            status: 'pending',
            title: 'Large Pothole',
            description: 'Deep pothole causing traffic issues'
        },
        {
            position: { lat: 40.7218, lng: -73.9960 },
            type: 'streetlight',
            status: 'in-progress',
            title: 'Streetlight Out',
            description: 'Streetlight not working for 3 days'
        }
    ];

    sampleIssues.forEach(issue => {
        const marker = new google.maps.Marker({
            position: issue.position,
            map: window.communityMap,
            title: issue.title,
            icon: getMarkerIcon(issue.status)
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="map-info-window">
                    <h3>${issue.title}</h3>
                    <p><strong>Status:</strong> <span class="status-${issue.status}">${issue.status.replace('-', ' ')}</span></p>
                    <p>${issue.description}</p>
                </div>
            `
        });

        marker.addListener('click', function() {
            infoWindow.open(window.communityMap, marker);
        });
    });
}

function getMarkerIcon(status) {
    const color = status === 'pending' ? '#f39c12' : 
                  status === 'in-progress' ? '#3498db' : '#2ecc71';
    
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff',
        scale: 10
    };
}

function getMapStyle() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? [
        { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] }
    ] : [];
}

// Make functions globally available
window.initMap = initMap;
window.placeMarker = placeMarker;